"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Módulo financeiro: plano de contas + caixa diário. Tudo staff-only
// (não é área do aluno). A checagem de papel é feita aqui, no
// servidor, seguindo o mesmo padrão de /admin/inscricoes.
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
      "/admin/financeiro?error=" +
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

// ── Plano de contas ────────────────────────────────────────────

export async function criarCategoriaAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const nome = (formData.get("nome") as string)?.trim();
  const tipo = formData.get("tipo") as string;
  const codigo = (formData.get("codigo") as string)?.trim() || null;
  const categoria_pai_id = (formData.get("categoria_pai_id") as string) || null;

  if (!nome || !["RECEITA", "DESPESA"].includes(tipo)) {
    redirect("/admin/financeiro/plano-de-contas?error=" + encodeURIComponent("Preencha nome e tipo (Receita/Despesa)."));
  }

  const { error } = await supabase.from("fin_categorias").insert({
    nome,
    tipo,
    codigo,
    categoria_pai_id,
  });

  if (error) {
    redirect("/admin/financeiro/plano-de-contas?error=" + encodeURIComponent("Erro ao criar categoria: " + error.message));
  }

  revalidatePath("/admin/financeiro/plano-de-contas");
  redirect("/admin/financeiro/plano-de-contas?msg=" + encodeURIComponent("Categoria criada."));
}

export async function alternarCategoriaAtivaAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = formData.get("id") as string;
  const ativo = formData.get("ativo") === "true";

  await supabase.from("fin_categorias").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/admin/financeiro/plano-de-contas");
  redirect("/admin/financeiro/plano-de-contas?msg=" + encodeURIComponent("Categoria atualizada."));
}

// ── Caixa diário ────────────────────────────────────────────────

export async function abrirCaixaAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const hoje = new Date().toISOString().slice(0, 10);
  const saldoInicial = centavos((formData.get("saldo_inicial") as string) || "0");

  const { data: existente } = await supabase
    .from("fin_caixa_diario")
    .select("id")
    .eq("data", hoje)
    .maybeSingle();

  if (existente) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("O caixa de hoje já foi aberto."));
  }

  const { error } = await supabase.from("fin_caixa_diario").insert({
    data: hoje,
    status: "ABERTO",
    saldo_inicial_centavos: saldoInicial,
    aberto_por: userId,
  });

  if (error) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("Erro ao abrir caixa: " + error.message));
  }

  revalidatePath("/admin/financeiro/caixa");
  redirect("/admin/financeiro/caixa?msg=" + encodeURIComponent("Caixa do dia aberto."));
}

export async function lancarMovimentacaoAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const caixa_diario_id = formData.get("caixa_diario_id") as string;
  const categoria_id = (formData.get("categoria_id") as string) || null;
  const tipo = formData.get("tipo") as string;
  const valor_centavos = centavos((formData.get("valor") as string) || "0");
  const descricao = (formData.get("descricao") as string)?.trim();
  const forma_pagamento = (formData.get("forma_pagamento") as string) || "DINHEIRO";

  if (!caixa_diario_id || !["ENTRADA", "SAIDA"].includes(tipo) || valor_centavos <= 0 || !descricao) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("Preencha tipo, valor e descrição do lançamento."));
  }

  const { error } = await supabase.from("fin_lancamentos").insert({
    caixa_diario_id,
    categoria_id,
    tipo,
    valor_centavos,
    descricao,
    forma_pagamento,
    criado_por: userId,
  });

  if (error) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("Erro ao lançar: " + error.message));
  }

  revalidatePath("/admin/financeiro/caixa");
  redirect("/admin/financeiro/caixa?msg=" + encodeURIComponent("Lançamento registrado."));
}

export async function fecharCaixaAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const caixa_diario_id = formData.get("caixa_diario_id") as string;

  const { data: caixa } = await supabase
    .from("fin_caixa_diario")
    .select("id, saldo_inicial_centavos")
    .eq("id", caixa_diario_id)
    .single();

  if (!caixa) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("Caixa não encontrado."));
  }

  const { data: lancamentos } = await supabase
    .from("fin_lancamentos")
    .select("tipo, valor_centavos")
    .eq("caixa_diario_id", caixa_diario_id);

  const totalEntradas = (lancamentos ?? [])
    .filter((l) => l.tipo === "ENTRADA")
    .reduce((acc, l) => acc + l.valor_centavos, 0);
  const totalSaidas = (lancamentos ?? [])
    .filter((l) => l.tipo === "SAIDA")
    .reduce((acc, l) => acc + l.valor_centavos, 0);

  const saldoFinal = caixa!.saldo_inicial_centavos + totalEntradas - totalSaidas;

  const { error } = await supabase
    .from("fin_caixa_diario")
    .update({
      status: "FECHADO",
      saldo_final_centavos: saldoFinal,
      fechado_por: userId,
      fechado_em: new Date().toISOString(),
    })
    .eq("id", caixa_diario_id);

  if (error) {
    redirect("/admin/financeiro/caixa?error=" + encodeURIComponent("Erro ao fechar caixa: " + error.message));
  }

  revalidatePath("/admin/financeiro/caixa");
  redirect(
    "/admin/financeiro/caixa?msg=" +
      encodeURIComponent(`Caixa fechado. Saldo final: R$ ${(saldoFinal / 100).toFixed(2).replace(".", ",")}`)
  );
}
