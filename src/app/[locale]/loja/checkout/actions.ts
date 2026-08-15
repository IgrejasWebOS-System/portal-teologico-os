"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { redirect } from "next/navigation";

// ============================================================
// finalizarCompraAction — recebe o carrinho (JSON) de um form,
// cria o pedido + itens (status AGUARDANDO_PAGAMENTO) e redireciona
// para o Checkout Pro do Mercado Pago (sandbox). A confirmação real
// do pagamento chega depois, de forma assíncrona, pelo webhook em
// /api/webhooks/mercadopago — é lá que o pedido vira PAGO de fato.
// ============================================================

interface ItemCarrinho {
  productId: string;
  quantidade: number;
}

export async function finalizarCompraAction(formData: FormData) {
  const itensJson = formData.get("itens") as string | null;
  const enderecoJson = formData.get("endereco") as string | null;
  const telefone = (formData.get("telefone") as string) || null;

  if (!itensJson) {
    redirect("/loja?error=" + encodeURIComponent("Carrinho vazio."));
  }

  let itensCarrinho: ItemCarrinho[];
  try {
    itensCarrinho = JSON.parse(itensJson!);
  } catch {
    redirect("/loja?error=" + encodeURIComponent("Carrinho inválido."));
  }

  if (!Array.isArray(itensCarrinho) || itensCarrinho.length === 0) {
    redirect("/loja?error=" + encodeURIComponent("Carrinho vazio."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?redirectTo=" +
        encodeURIComponent("/loja/carrinho") +
        "&error=" +
        encodeURIComponent("Faça login para finalizar a compra.")
    );
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const admin = createAdminClient();

  const productIds = itensCarrinho.map((i) => i.productId);
  const { data: produtos } = await admin
    .from("products")
    .select("id, titulo, preco_centavos, tipo, status")
    .in("id", productIds);

  if (!produtos || produtos.length !== itensCarrinho.length || produtos.some((p) => p.status !== "ATIVO")) {
    redirect("/loja?error=" + encodeURIComponent("Algum item do carrinho não está mais disponível."));
  }

  const temItemFisico = produtos!.some((p) => p.tipo === "MATERIAL_FISICO");
  let endereco: unknown = null;
  if (temItemFisico) {
    if (!enderecoJson) {
      redirect("/loja?error=" + encodeURIComponent("Informe o endereço de entrega para itens físicos."));
    }
    try {
      endereco = JSON.parse(enderecoJson!);
    } catch {
      redirect("/loja?error=" + encodeURIComponent("Endereço inválido."));
    }
  }

  let totalCentavos = 0;
  const itensParaInserir = itensCarrinho.map((item) => {
    const produto = produtos!.find((p) => p.id === item.productId)!;
    totalCentavos += produto.preco_centavos * item.quantidade;
    return {
      product_id: produto.id,
      titulo_snapshot: produto.titulo,
      preco_unitario_centavos: produto.preco_centavos,
      quantidade: item.quantidade,
    };
  });

  const { data: pedido, error: erroPedido } = await admin
    .from("orders")
    .insert({
      user_id: user!.id,
      total_centavos: totalCentavos,
      endereco_entrega: endereco,
      fulfillment_status: temItemFisico ? "AGUARDANDO_ENVIO" : "NAO_APLICAVEL",
      nome_comprador: perfil?.full_name ?? null,
      email_comprador: user!.email ?? null,
      telefone_comprador: telefone,
    })
    .select("id")
    .single();

  if (erroPedido || !pedido) {
    redirect("/loja?error=" + encodeURIComponent("Não foi possível criar o pedido."));
  }

  const { error: erroItens } = await admin
    .from("order_items")
    .insert(itensParaInserir.map((item) => ({ ...item, order_id: pedido!.id })));

  if (erroItens) {
    redirect("/loja?error=" + encodeURIComponent("Não foi possível registrar os itens do pedido."));
  }

  let preferencia;
  try {
    preferencia = await criarPreferenciaCheckout({
      orderId: pedido!.id,
      itens: itensParaInserir.map((i) => ({
        titulo: i.titulo_snapshot,
        quantidade: i.quantidade,
        precoUnitarioCentavos: i.preco_unitario_centavos,
      })),
      emailComprador: user!.email ?? undefined,
    });
  } catch (e) {
    console.error("[checkout] Falha ao criar preferência no Mercado Pago:", e);
    redirect(
      `/loja/pedido/${pedido!.id}?error=` +
        encodeURIComponent("Erro ao iniciar o pagamento. Tente novamente.")
    );
  }

  await admin
    .from("orders")
    .update({ mercadopago_preference_id: preferencia!.id })
    .eq("id", pedido!.id);

  redirect(preferencia!.sandbox_init_point || preferencia!.init_point);
}
