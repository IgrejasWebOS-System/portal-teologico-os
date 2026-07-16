import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Gera N linhas em fin_contas_receber para um parcelamento —
// usado tanto pela Matrícula Direta quanto pelo parcelamento
// avulso lançado direto em Financeiro > Contas a Receber.
//
// Datas de vencimento: uma por mês a partir de `primeiroVencimento`
// (ex: parcela 1 vence no dia informado, parcela 2 no mesmo dia do
// mês seguinte, e assim por diante). O valor total é dividido em
// partes iguais; a diferença de arredondamento (centavos) fica toda
// na última parcela, pra bater exatamente com o valor total.
// ============================================================

export interface GerarParcelasParams {
  origemTipo: "MATRICULA_DIRETA" | "INSCRICAO_EAD" | "LOJA" | "OUTRO";
  origemId?: string | null;
  alunoId?: string | null;
  alunoUserId?: string | null;
  responsavelPagamento: "ALUNO" | "IGREJA";
  churchId?: string | null;
  descricaoBase: string;
  valorTotalCentavos: number;
  totalParcelas: number;
  primeiroVencimento: string; // ISO yyyy-mm-dd
  formaPagamentoPrevista: "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA";
}

function somarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + meses, dia));
  return d.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gerarParcelasContasReceber(admin: SupabaseClient<any>, params: GerarParcelasParams) {
  const total = Math.max(1, params.totalParcelas);
  const valorParcela = Math.floor(params.valorTotalCentavos / total);
  const resto = params.valorTotalCentavos - valorParcela * total;

  const linhas = Array.from({ length: total }, (_, i) => {
    const numero = i + 1;
    const valor = numero === total ? valorParcela + resto : valorParcela;
    return {
      origem_tipo: params.origemTipo,
      origem_id: params.origemId ?? null,
      aluno_id: params.alunoId ?? null,
      aluno_user_id: params.alunoUserId ?? null,
      responsavel_pagamento: params.responsavelPagamento,
      church_id: params.responsavelPagamento === "IGREJA" ? params.churchId ?? null : null,
      descricao: total > 1 ? `${params.descricaoBase} — parcela ${numero}/${total}` : params.descricaoBase,
      numero_parcela: numero,
      total_parcelas: total,
      valor_bruto_centavos: valor,
      forma_pagamento_prevista: params.formaPagamentoPrevista,
      data_vencimento: somarMeses(params.primeiroVencimento, i),
      status: "PENDENTE" as const,
    };
  });

  return admin.from("fin_contas_receber").insert(linhas);
}
