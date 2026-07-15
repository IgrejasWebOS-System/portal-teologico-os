"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Patrimônio/Inventário — cadastro de bens, movimentações
// (transferência, baixa, manutenção, reavaliação) e depreciação.
// Staff-only, mesmo padrão de checagem dos outros módulos admin.
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect(
      "/admin/patrimonio?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return { supabase, userId: user.id };
}

function centavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

export async function cadastrarBemAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const nome = (formData.get("nome") as string)?.trim();
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const categoria = (formData.get("categoria") as string) || "OUTRO";
  const valorAquisicao = centavos((formData.get("valor_aquisicao") as string) || "0");
  const dataAquisicao = (formData.get("data_aquisicao") as string) || new Date().toISOString().slice(0, 10);
  const fornecedor = (formData.get("fornecedor") as string)?.trim() || null;
  const notaFiscal = (formData.get("nota_fiscal") as string)?.trim() || null;
  const vidaUtilAnos = formData.get("vida_util_anos") ? Number(formData.get("vida_util_anos")) : null;
  const taxaDepreciacao = formData.get("taxa_depreciacao_anual") ? Number(formData.get("taxa_depreciacao_anual")) : null;
  const localizacao = (formData.get("localizacao") as string)?.trim() || null;
  const responsavelNome = (formData.get("responsavel_nome") as string)?.trim() || null;
  const categoriaFinanceiraId = (formData.get("categoria_financeira_id") as string) || null;

  if (!nome || valorAquisicao <= 0) {
    redirect("/admin/patrimonio?error=" + encodeURIComponent("Preencha nome e valor de aquisição."));
  }

  const { data: tombamento, error: tombamentoError } = await supabase.rpc("get_next_tombamento");
  if (tombamentoError || !tombamento) {
    redirect("/admin/patrimonio?error=" + encodeURIComponent("Erro ao gerar número de tombamento: " + (tombamentoError?.message ?? "desconhecido")));
  }

  const { data: item, error } = await supabase
    .from("patrimony_items")
    .insert({
      numero_tombamento: tombamento,
      nome,
      descricao,
      categoria,
      valor_aquisicao_centavos: valorAquisicao,
      data_aquisicao: dataAquisicao,
      fornecedor,
      nota_fiscal: notaFiscal,
      vida_util_anos: vidaUtilAnos,
      taxa_depreciacao_anual: taxaDepreciacao,
      localizacao,
      responsavel_nome: responsavelNome,
      categoria_financeira_id: categoriaFinanceiraId,
    })
    .select("id")
    .single();

  if (error || !item) {
    redirect("/admin/patrimonio?error=" + encodeURIComponent("Erro ao cadastrar bem: " + (error?.message ?? "desconhecido")));
  }

  await supabase.from("patrimony_movements").insert({
    item_id: item!.id,
    tipo: "AQUISICAO",
    data: dataAquisicao,
    descricao: `Cadastro inicial — ${nome}`,
    responsavel_nome: responsavelNome,
    valor_centavos: valorAquisicao,
  });

  revalidatePath("/admin/patrimonio");
  redirect("/admin/patrimonio?msg=" + encodeURIComponent(`Bem cadastrado: ${tombamento}.`));
}

export async function registrarMovimentacaoAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const item_id = formData.get("item_id") as string;
  const tipo = formData.get("tipo") as string;
  const descricao = (formData.get("descricao") as string)?.trim();
  const localizacao_nova = (formData.get("localizacao_nova") as string)?.trim() || null;
  const responsavel_nome = (formData.get("responsavel_nome") as string)?.trim() || null;
  const valorStr = (formData.get("valor") as string)?.trim();
  const valor_centavos = valorStr ? centavos(valorStr) : null;

  if (!item_id || !tipo || !descricao) {
    redirect("/admin/patrimonio?error=" + encodeURIComponent("Preencha o tipo e a descrição da movimentação."));
  }

  const { data: itemAtual } = await supabase
    .from("patrimony_items")
    .select("localizacao")
    .eq("id", item_id)
    .single();

  const { error } = await supabase.from("patrimony_movements").insert({
    item_id,
    tipo,
    data: new Date().toISOString().slice(0, 10),
    localizacao_anterior: itemAtual?.localizacao ?? null,
    localizacao_nova,
    descricao,
    responsavel_nome,
    valor_centavos,
  });

  if (error) {
    redirect("/admin/patrimonio?error=" + encodeURIComponent("Erro ao registrar movimentação: " + error.message));
  }

  revalidatePath("/admin/patrimonio");
  redirect("/admin/patrimonio?msg=" + encodeURIComponent("Movimentação registrada."));
}
