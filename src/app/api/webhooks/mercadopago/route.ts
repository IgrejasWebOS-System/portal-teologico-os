import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { buscarPagamento } from "@/utils/mercadopago/client";
import { enviarConviteParaSerAluno } from "@/utils/email/resend";

// ============================================================
// POST /api/webhooks/mercadopago
//
// Recebe a notificação assíncrona do Mercado Pago (configurada como
// notification_url na preferência), busca o pagamento de verdade na
// API (nunca confia no payload da notificação sozinho) e atualiza o
// registro correspondente ao external_reference. Dois tipos possíveis
// de registro, tentados nesta ordem:
//
// 1. Pedido da Loja (orders) — cursos avulsos, material físico, PDFs.
//    Aprovado -> PAGO (+ libera enrollment automático se CURSO_AVULSO).
//
// 2. Inscrição EAD com matrícula paga (ead_inscricoes) — decisão do
//    CETADP de 14/07/2026 de cobrar de verdade a matrícula do curso
//    teológico oficial. Aprovado -> status vira PENDENTE (entra na
//    fila de análise da secretaria, fluxo manual de sempre a partir
//    daí). Recusado/cancelado -> PAGAMENTO_RECUSADO.
//
// Idempotente nos dois casos: se o registro já saiu do estado
// "aguardando pagamento", a notificação repetida não faz nada.
// ============================================================

export async function POST(request: Request) {
  const url = new URL(request.url);

  let type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  try {
    const body = await request.json();
    if (body?.type) type = body.type;
    if (body?.data?.id) paymentId = String(body.data.id);
  } catch {
    // corpo vazio ou não-JSON — segue só com os query params
  }

  // Ignora outros tipos de notificação (merchant_order, etc.)
  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ recebido: true });
  }

  let pagamento;
  try {
    pagamento = await buscarPagamento(paymentId);
  } catch {
    return NextResponse.json({ erro: "Falha ao consultar pagamento" }, { status: 502 });
  }

  const referenceId = pagamento.external_reference;
  if (!referenceId) {
    return NextResponse.json({ erro: "external_reference ausente" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: pedido } = await admin
    .from("orders")
    .select("id, status, user_id")
    .eq("id", referenceId)
    .single();

  if (pedido) {
    if (pedido.status === "PAGO") {
      return NextResponse.json({ ok: true }); // já processado, idempotência
    }

    const novoStatus =
      pagamento.status === "approved"
        ? "PAGO"
        : pagamento.status === "rejected" || pagamento.status === "cancelled"
          ? "CANCELADO"
          : pagamento.status === "refunded"
            ? "REEMBOLSADO"
            : null; // pending/in_process etc. — não muda o pedido ainda

    if (!novoStatus) {
      return NextResponse.json({ recebido: true });
    }

    await admin
      .from("orders")
      .update({
        status: novoStatus,
        mercadopago_payment_id: String(pagamento.id),
        paid_at: novoStatus === "PAGO" ? new Date().toISOString() : null,
      })
      .eq("id", referenceId);

    if (novoStatus === "PAGO") {
      const { data: itens } = await admin
        .from("order_items")
        .select("product_id")
        .eq("order_id", referenceId);

      for (const item of itens ?? []) {
        const { data: produto } = await admin
          .from("products")
          .select("tipo, course_id")
          .eq("id", item.product_id)
          .single();

        if (produto?.tipo === "CURSO_AVULSO" && produto.course_id) {
          await admin
            .from("enrollments")
            .upsert(
              { user_id: pedido.user_id, course_id: produto.course_id },
              { onConflict: "user_id,course_id", ignoreDuplicates: true }
            );
        }
      }

      // Comprador avulso sem matrícula ainda? Manda o convite pra virar
      // aluno. Nunca deixa uma falha de e-mail derrubar o webhook.
      try {
        const { data: aluno } = await admin
          .from("ead_alunos")
          .select("id")
          .eq("user_id", pedido.user_id)
          .maybeSingle();

        if (!aluno) {
          const { data: pedidoCompleto } = await admin
            .from("orders")
            .select("nome_comprador, email_comprador")
            .eq("id", referenceId)
            .single();

          if (pedidoCompleto?.email_comprador) {
            await enviarConviteParaSerAluno(
              pedidoCompleto.email_comprador,
              pedidoCompleto.nome_comprador ?? ""
            );
          }
        }
      } catch (e) {
        console.error("[webhook mercadopago] Falha ao enviar convite de aluno:", e);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Não é pedido da Loja — tenta como inscrição EAD com matrícula paga
  const { data: inscricao } = await admin
    .from("ead_inscricoes")
    .select("id, status")
    .eq("id", referenceId)
    .single();

  if (!inscricao) {
    return NextResponse.json({ erro: "Pedido/inscrição não encontrado" }, { status: 404 });
  }

  if (inscricao.status !== "AGUARDANDO_PAGAMENTO") {
    return NextResponse.json({ ok: true }); // já processado ou não se aplica — idempotência
  }

  const novoStatusInscricao =
    pagamento.status === "approved"
      ? "PENDENTE" // matrícula paga -> entra na fila de análise da secretaria
      : pagamento.status === "rejected" || pagamento.status === "cancelled"
        ? "PAGAMENTO_RECUSADO"
        : null; // pending/in_process etc. — continua aguardando

  if (!novoStatusInscricao) {
    return NextResponse.json({ recebido: true });
  }

  await admin
    .from("ead_inscricoes")
    .update({
      status: novoStatusInscricao,
      mercadopago_payment_id: String(pagamento.id),
      pago_em: novoStatusInscricao === "PENDENTE" ? new Date().toISOString() : null,
    })
    .eq("id", referenceId);

  return NextResponse.json({ ok: true });
}
