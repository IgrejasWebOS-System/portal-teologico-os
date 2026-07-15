import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { buscarPagamento } from "@/utils/mercadopago/client";

// ============================================================
// POST /api/webhooks/mercadopago
//
// Recebe a notificação assíncrona do Mercado Pago (configurada como
// notification_url na preferência), busca o pagamento de verdade na
// API (nunca confia no payload da notificação sozinho) e:
// - marca o pedido como PAGO/CANCELADO/REEMBOLSADO;
// - se PAGO e o item é CURSO_AVULSO, cria a matrícula (enrollment)
//   automaticamente — é a "liberação automática pós-pagamento" que
//   foi decidida para usuários externos.
// - se PAGO e o item é MATERIAL_FISICO, o pedido já nasce com
//   fulfillment_status = AGUARDANDO_ENVIO (definido no checkout);
//   a secretaria trata o envio depois, manualmente.
//
// Idempotente: se o pedido já está PAGO, não repete a liberação.
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

  const orderId = pagamento.external_reference;
  if (!orderId) {
    return NextResponse.json({ erro: "external_reference ausente" }, { status: 400 });
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

  const admin = createAdminClient();

  const { data: pedido } = await admin
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .single();

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  }

  if (pedido.status === "PAGO") {
    return NextResponse.json({ ok: true }); // já processado, idempotência
  }

  await admin
    .from("orders")
    .update({
      status: novoStatus,
      mercadopago_payment_id: String(pagamento.id),
      paid_at: novoStatus === "PAGO" ? new Date().toISOString() : null,
    })
    .eq("id", orderId);

  if (novoStatus === "PAGO") {
    const { data: itens } = await admin
      .from("order_items")
      .select("product_id")
      .eq("order_id", orderId);

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
  }

  return NextResponse.json({ ok: true });
}
