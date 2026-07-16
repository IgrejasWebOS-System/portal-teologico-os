"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";

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

// ── Contas a receber ───────────────────────────────────────────

function parsePercentual(valor: FormDataEntryValue | null): number {
  const limpo = String(valor ?? "0").replace(",", ".");
  const num = Number(limpo);
  return isNaN(num) || num < 0 ? 0 : num;
}

export async function gerarParcelamentoAvulsoAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();

  const matriculaAluno = (formData.get("matricula_aluno") as string)?.trim();
  const descricaoBase = (formData.get("descricao") as string)?.trim();
  const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const church_id = (formData.get("church_id") as string) || null;
  const totalParcelas = Math.max(1, Number(formData.get("total_parcelas")) || 1);
  const primeiroVencimento = formData.get("data_vencimento") as string;
  const forma = (formData.get("forma_pagamento_prevista") as string) || "DINHEIRO";
  const valorTotalCentavos = centavos((formData.get("valor_total") as string) || "0");

  if (!matriculaAluno || !descricaoBase || !primeiroVencimento || valorTotalCentavos <= 0) {
    redirect(
      "/admin/financeiro/contas-a-receber?error=" +
        encodeURIComponent("Preencha matrícula do aluno, descrição, valor total e vencimento.")
    );
  }

  if (responsavel === "IGREJA" && !church_id) {
    redirect(
      "/admin/financeiro/contas-a-receber?error=" +
        encodeURIComponent("Selecione a igreja responsável pelo pagamento.")
    );
  }

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, user_id, nome_completo")
    .eq("matricula", matriculaAluno)
    .maybeSingle();

  if (!aluno) {
    redirect(
      "/admin/financeiro/contas-a-receber?error=" +
        encodeURIComponent("Nenhum aluno encontrado com essa matrícula.")
    );
  }

  const { error } = await gerarParcelasContasReceber(admin, {
    origemTipo: "OUTRO",
    alunoId: aluno!.id,
    alunoUserId: aluno!.user_id,
    responsavelPagamento: responsavel,
    churchId: church_id,
    descricaoBase,
    valorTotalCentavos,
    totalParcelas,
    primeiroVencimento,
    formaPagamentoPrevista: forma as "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA",
  });

  if (error) {
    redirect(
      "/admin/financeiro/contas-a-receber?error=" + encodeURIComponent("Erro ao gerar parcelamento: " + error.message)
    );
  }

  revalidatePath("/admin/financeiro/contas-a-receber");
  redirect(
    "/admin/financeiro/contas-a-receber?msg=" +
      encodeURIComponent(`Parcelamento gerado para ${aluno!.nome_completo} (${totalParcelas}x).`)
  );
}

export async function baixarParcelaAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const id = formData.get("id") as string;
  const forma_pagamento = formData.get("forma_pagamento") as string;
  const caixa_diario_id = (formData.get("caixa_diario_id") as string) || null;
  const taxaOperadora = parsePercentual(formData.get("taxa_operadora"));
  const taxaAntecipacao = parsePercentual(formData.get("taxa_antecipacao"));

  const { data: conta } = await supabase
    .from("fin_contas_receber")
    .select("id, status, valor_bruto_centavos, descricao")
    .eq("id", id)
    .single();

  if (!conta) {
    redirect("/admin/financeiro/contas-a-receber?error=" + encodeURIComponent("Parcela não encontrada."));
  }

  if (conta!.status === "PAGO") {
    redirect("/admin/financeiro/contas-a-receber?error=" + encodeURIComponent("Essa parcela já foi baixada."));
  }

  let finLancamentoId: string | null = null;

  if (forma_pagamento === "DINHEIRO") {
    if (!caixa_diario_id) {
      redirect(
        "/admin/financeiro/contas-a-receber?error=" +
          encodeURIComponent("Abra o caixa do dia (em Financeiro > Caixa Diário) antes de dar baixa em dinheiro.")
      );
    }

    const { data: lancamento, error: lancamentoError } = await supabase
      .from("fin_lancamentos")
      .insert({
        caixa_diario_id,
        tipo: "ENTRADA",
        valor_centavos: conta!.valor_bruto_centavos,
        descricao: `Recebimento — ${conta!.descricao}`,
        forma_pagamento: "DINHEIRO",
        criado_por: userId,
      })
      .select("id")
      .single();

    if (lancamentoError || !lancamento) {
      redirect(
        "/admin/financeiro/contas-a-receber?error=" +
          encodeURIComponent("Erro ao lançar no caixa: " + (lancamentoError?.message ?? "desconhecido"))
      );
    }
    finLancamentoId = lancamento!.id;
  }

  const percentualTotal = taxaOperadora + taxaAntecipacao;
  const semDesconto = forma_pagamento === "DINHEIRO" || forma_pagamento === "PIX" || percentualTotal === 0;
  const valorLiquido = semDesconto
    ? conta!.valor_bruto_centavos
    : Math.round(conta!.valor_bruto_centavos * (1 - percentualTotal / 100));

  const { error } = await supabase
    .from("fin_contas_receber")
    .update({
      status: "PAGO",
      forma_pagamento_prevista: forma_pagamento,
      taxa_operadora_percentual: taxaOperadora || null,
      taxa_antecipacao_percentual: taxaAntecipacao || null,
      valor_liquido_centavos: valorLiquido,
      pago_em: new Date().toISOString(),
      baixado_por: userId,
      fin_lancamento_id: finLancamentoId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect("/admin/financeiro/contas-a-receber?error=" + encodeURIComponent("Erro ao dar baixa: " + error.message));
  }

  revalidatePath("/admin/financeiro/contas-a-receber");
  revalidatePath("/admin/financeiro/caixa");
  redirect("/admin/financeiro/contas-a-receber?msg=" + encodeURIComponent("Parcela baixada com sucesso."));
}

export async function cancelarParcelaAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("fin_contas_receber")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect("/admin/financeiro/contas-a-receber?error=" + encodeURIComponent("Erro ao cancelar: " + error.message));
  }

  revalidatePath("/admin/financeiro/contas-a-receber");
  redirect("/admin/financeiro/contas-a-receber?msg=" + encodeURIComponent("Parcela cancelada."));
}

// ── Contas a pagar ─────────────────────────────────────────────

export async function criarContaPagarAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const fornecedor = (formData.get("fornecedor") as string)?.trim();
  const descricao = (formData.get("descricao") as string)?.trim();
  const categoria_id = (formData.get("categoria_id") as string) || null;
  const forma_pagamento_prevista = (formData.get("forma_pagamento_prevista") as string) || "TRANSFERENCIA";
  const data_vencimento = formData.get("data_vencimento") as string;
  const valor_centavos = centavos((formData.get("valor") as string) || "0");

  if (!fornecedor || !descricao || !data_vencimento || valor_centavos <= 0) {
    redirect(
      "/admin/financeiro/contas-a-pagar?error=" +
        encodeURIComponent("Preencha fornecedor, descrição, valor e vencimento.")
    );
  }

  const { error } = await supabase.from("fin_contas_pagar").insert({
    fornecedor,
    descricao,
    categoria_id,
    forma_pagamento_prevista,
    data_vencimento,
    valor_centavos,
  });

  if (error) {
    redirect("/admin/financeiro/contas-a-pagar?error=" + encodeURIComponent("Erro ao criar conta: " + error.message));
  }

  revalidatePath("/admin/financeiro/contas-a-pagar");
  redirect("/admin/financeiro/contas-a-pagar?msg=" + encodeURIComponent("Conta a pagar cadastrada."));
}

export async function baixarContaPagarAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const id = formData.get("id") as string;
  const forma_pagamento = formData.get("forma_pagamento") as string;
  const caixa_diario_id = (formData.get("caixa_diario_id") as string) || null;

  const { data: conta } = await supabase
    .from("fin_contas_pagar")
    .select("id, status, valor_centavos, descricao, fornecedor, categoria_id")
    .eq("id", id)
    .single();

  if (!conta) {
    redirect("/admin/financeiro/contas-a-pagar?error=" + encodeURIComponent("Conta não encontrada."));
  }

  if (conta!.status === "PAGO") {
    redirect("/admin/financeiro/contas-a-pagar?error=" + encodeURIComponent("Essa conta já foi paga."));
  }

  let finLancamentoId: string | null = null;

  if (forma_pagamento === "DINHEIRO") {
    if (!caixa_diario_id) {
      redirect(
        "/admin/financeiro/contas-a-pagar?error=" +
          encodeURIComponent("Abra o caixa do dia (em Financeiro > Caixa Diário) antes de pagar em dinheiro.")
      );
    }

    const { data: lancamento, error: lancamentoError } = await supabase
      .from("fin_lancamentos")
      .insert({
        caixa_diario_id,
        categoria_id: conta!.categoria_id,
        tipo: "SAIDA",
        valor_centavos: conta!.valor_centavos,
        descricao: `Pagamento — ${conta!.fornecedor}: ${conta!.descricao}`,
        forma_pagamento: "DINHEIRO",
        criado_por: userId,
      })
      .select("id")
      .single();

    if (lancamentoError || !lancamento) {
      redirect(
        "/admin/financeiro/contas-a-pagar?error=" +
          encodeURIComponent("Erro ao lançar no caixa: " + (lancamentoError?.message ?? "desconhecido"))
      );
    }
    finLancamentoId = lancamento!.id;
  }

  const { error } = await supabase
    .from("fin_contas_pagar")
    .update({
      status: "PAGO",
      forma_pagamento_prevista: forma_pagamento,
      pago_em: new Date().toISOString(),
      baixado_por: userId,
      fin_lancamento_id: finLancamentoId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect("/admin/financeiro/contas-a-pagar?error=" + encodeURIComponent("Erro ao dar baixa: " + error.message));
  }

  revalidatePath("/admin/financeiro/contas-a-pagar");
  revalidatePath("/admin/financeiro/caixa");
  redirect("/admin/financeiro/contas-a-pagar?msg=" + encodeURIComponent("Conta paga com sucesso."));
}

export async function cancelarContaPagarAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("fin_contas_pagar")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect("/admin/financeiro/contas-a-pagar?error=" + encodeURIComponent("Erro ao cancelar: " + error.message));
  }

  revalidatePath("/admin/financeiro/contas-a-pagar");
  redirect("/admin/financeiro/contas-a-pagar?msg=" + encodeURIComponent("Conta cancelada."));
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
