import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { buscarPagamento, calcularLiquidoPagamento, type PagamentoMercadoPago } from "@/utils/mercadopago/client";
import { enviarConviteParaSerAluno } from "@/utils/email/resend";
import { matricularAlunoEmCurso } from "@/utils/ead/matricular";

// Lança em Financeiro > Contas a Receber uma linha já baixada (PAGO)
// pra todo pagamento aprovado pelo Checkout Pro — bruto/líquido/taxa
// vêm de verdade do Mercado Pago (fee_details), sem precisar ninguém
// digitar percentual manualmente. Nunca toca no Caixa Diário físico:
// é dinheiro que nunca passou pela mão de ninguém, caiu direto na
// conta do Mercado Pago. Falha aqui nunca derruba o webhook.
async function lancarContaReceberOnline(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    origemTipo: "LOJA" | "INSCRICAO_EAD";
    origemId: string;
    alunoUserId: string | null;
    descricao: string;
    pagamento: PagamentoMercadoPago;
  }
) {
  try {
    const { brutoCentavos, liquidoCentavos, percentualTaxa } = calcularLiquidoPagamento(params.pagamento);
    if (brutoCentavos <= 0) return;

    await admin.from("fin_contas_receber").insert({
      origem_tipo: params.origemTipo,
      origem_id: params.origemId,
      aluno_user_id: params.alunoUserId,
      responsavel_pagamento: "ALUNO",
      descricao: params.descricao,
      numero_parcela: 1,
      total_parcelas: 1,
      valor_bruto_centavos: brutoCentavos,
      valor_liquido_centavos: liquidoCentavos,
      taxa_operadora_percentual: percentualTaxa || null,
      forma_pagamento_prevista: "CARTAO",
      data_vencimento: new Date().toISOString().slice(0, 10),
      status: "PAGO",
      pago_em: new Date().toISOString(),
      mercadopago_payment_id: String(params.pagamento.id),
    });
  } catch (e) {
    console.error("[webhook mercadopago] Falha ao lançar conta a receber online:", e);
  }
}

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
//    teológico oficial. Aprovado -> matrícula é criada e habilitada
//    na hora (matricularAlunoEmCurso), sem passar pela secretaria
//    (atualizado em 16/07/2026). Recusado/cancelado -> PAGAMENTO_RECUSADO.
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
        .select("product_id, quantidade")
        .eq("order_id", referenceId);

      for (const item of itens ?? []) {
        const { data: produto } = await admin
          .from("products")
          .select("tipo, course_id, estoque")
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

        // Baixa automática de estoque para material físico vendido,
        // com o mesmo histórico de movimentações usado na tela de
        // Produtos — nunca deixa o estoque ficar negativo.
        if (produto?.tipo === "MATERIAL_FISICO" && produto.estoque != null) {
          const novoEstoque = Math.max(0, produto.estoque - item.quantidade);
          try {
            await admin
              .from("product_stock_movements")
              .insert({
                product_id: item.product_id,
                tipo: "SAIDA",
                quantidade: item.quantidade,
                estoque_resultante: novoEstoque,
                motivo: `Venda — Pedido #${referenceId.slice(0, 8)}`,
                order_id: referenceId,
              });
            await admin.from("products").update({ estoque: novoEstoque }).eq("id", item.product_id);
          } catch (e) {
            console.error("[webhook mercadopago] Falha ao baixar estoque:", e);
          }
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

      await lancarContaReceberOnline(admin, {
        origemTipo: "LOJA",
        origemId: referenceId,
        alunoUserId: pedido.user_id,
        descricao: `Compra na Loja — Pedido #${referenceId.slice(0, 8)}`,
        pagamento,
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Não é pedido da Loja — tenta como inscrição EAD com matrícula paga
  const { data: inscricao } = await admin
    .from("ead_inscricoes")
    .select("id, status, curso_pretendido, nome_completo, cpf, email, telefone, campo_ministerio_id")
    .eq("id", referenceId)
    .single();

  if (!inscricao) {
    return NextResponse.json({ erro: "Pedido/inscrição não encontrado" }, { status: 404 });
  }

  if (inscricao.status !== "AGUARDANDO_PAGAMENTO") {
    return NextResponse.json({ ok: true }); // já processado ou não se aplica — idempotência
  }

  if (pagamento.status !== "approved" && pagamento.status !== "rejected" && pagamento.status !== "cancelled") {
    return NextResponse.json({ recebido: true }); // pending/in_process etc. — continua aguardando
  }

  if (pagamento.status !== "approved") {
    await admin
      .from("ead_inscricoes")
      .update({ status: "PAGAMENTO_RECUSADO", mercadopago_payment_id: String(pagamento.id), pago_em: null })
      .eq("id", referenceId);
    return NextResponse.json({ ok: true });
  }

  // Pagamento aprovado: matrícula é criada e habilitada na hora, sem
  // passar pela fila da secretaria (decisão do CETADP de 16/07/2026).
  const resultado = await matricularAlunoEmCurso(admin, {
    cursoPretendido: inscricao.curso_pretendido,
    nomeCompleto: inscricao.nome_completo,
    cpf: inscricao.cpf,
    email: inscricao.email,
    telefone: inscricao.telefone,
    campoMinisterioId: inscricao.campo_ministerio_id,
    origem: "INSCRICAO_PUBLICA",
  });

  if (!resultado.ok) {
    console.error("[webhook mercadopago] Falha ao auto-matricular após pagamento:", resultado.erro);
    // Não derruba o webhook — deixa registrado o pagamento pra secretaria resolver manualmente.
    await admin
      .from("ead_inscricoes")
      .update({ mercadopago_payment_id: String(pagamento.id), pago_em: new Date().toISOString() })
      .eq("id", referenceId);
    return NextResponse.json({ ok: true, aviso: resultado.erro });
  }

  await admin
    .from("ead_inscricoes")
    .update({
      status: "APROVADA",
      aluno_id: resultado.alunoId,
      matricula_gerada: resultado.matricula,
      mercadopago_payment_id: String(pagamento.id),
      pago_em: new Date().toISOString(),
      analisado_em: new Date().toISOString(),
    })
    .eq("id", referenceId);

  await lancarContaReceberOnline(admin, {
    origemTipo: "INSCRICAO_EAD",
    origemId: referenceId,
    alunoUserId: null,
    descricao: `Matrícula — ${inscricao.curso_pretendido}`,
    pagamento,
  });

  return NextResponse.json({ ok: true });
}
