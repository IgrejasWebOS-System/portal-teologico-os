"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Cadastro de produtos da Loja + controle de estoque com histórico
// de movimentações (product_stock_movements). Staff-only, mesmo
// padrão de checagem usado em /admin/financeiro.
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Acesso restrito à secretaria do CETADP."));
  }

  return { supabase, userId: user.id };
}

function centavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

export async function criarProdutoAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const titulo = (formData.get("titulo") as string)?.trim();
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const tipo = (formData.get("tipo") as string) || "MATERIAL_FISICO";
  const preco = centavos((formData.get("preco") as string) || "0");
  const estoqueRaw = (formData.get("estoque") as string)?.trim();
  const estoqueInicial = tipo === "MATERIAL_FISICO" ? Math.max(0, Number(estoqueRaw) || 0) : null;

  if (!titulo || preco <= 0) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Preencha título e preço."));
  }

  const { data: produto, error } = await supabase
    .from("products")
    .insert({
      titulo,
      descricao,
      tipo,
      preco_centavos: preco,
      estoque: estoqueInicial,
      status: "ATIVO",
    })
    .select("id")
    .single();

  if (error || !produto) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Erro ao criar produto: " + (error?.message ?? "")));
  }

  if (estoqueInicial && estoqueInicial > 0) {
    await supabase.from("product_stock_movements").insert({
      product_id: produto!.id,
      tipo: "ENTRADA",
      quantidade: estoqueInicial,
      estoque_resultante: estoqueInicial,
      motivo: "Estoque inicial no cadastro",
    });
  }

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?msg=" + encodeURIComponent("Produto cadastrado."));
}

export async function atualizarProdutoAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const id = formData.get("id") as string;
  const titulo = (formData.get("titulo") as string)?.trim();
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const preco = centavos((formData.get("preco") as string) || "0");

  if (!id || !titulo || preco <= 0) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Preencha título e preço."));
  }

  const { error } = await supabase
    .from("products")
    .update({ titulo, descricao, preco_centavos: preco, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Erro ao atualizar: " + error.message));
  }

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?msg=" + encodeURIComponent("Produto atualizado."));
}

export async function alternarStatusProdutoAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = formData.get("id") as string;
  const statusAtual = formData.get("status") as string;

  await supabase
    .from("products")
    .update({ status: statusAtual === "ATIVO" ? "INATIVO" : "ATIVO", updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?msg=" + encodeURIComponent("Status do produto atualizado."));
}

export async function movimentarEstoqueAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const productId = formData.get("product_id") as string;
  const tipo = formData.get("tipo") as string;
  const quantidade = Math.abs(Number(formData.get("quantidade")) || 0);
  const motivo = (formData.get("motivo") as string)?.trim();

  if (!productId || !["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo) || quantidade <= 0 || !motivo) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Preencha tipo, quantidade e motivo da movimentação."));
  }

  const { data: produto } = await supabase.from("products").select("estoque").eq("id", productId).single();
  const estoqueAtual = produto?.estoque ?? 0;

  const novoEstoque =
    tipo === "ENTRADA" ? estoqueAtual + quantidade : tipo === "SAIDA" ? Math.max(0, estoqueAtual - quantidade) : quantidade; // AJUSTE define o valor absoluto

  const { error: erroMov } = await supabase.from("product_stock_movements").insert({
    product_id: productId,
    tipo,
    quantidade: tipo === "AJUSTE" ? novoEstoque - estoqueAtual : quantidade,
    estoque_resultante: novoEstoque,
    motivo,
    criado_por: userId,
  });

  if (erroMov) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Erro ao lançar movimentação: " + erroMov.message));
  }

  const { error } = await supabase
    .from("products")
    .update({ estoque: novoEstoque, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    redirect("/admin/produtos?error=" + encodeURIComponent("Erro ao atualizar estoque: " + error.message));
  }

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?msg=" + encodeURIComponent("Estoque atualizado."));
}
