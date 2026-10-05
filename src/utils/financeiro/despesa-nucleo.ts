// ============================================================
// Despesa de núcleo em fin_contas_pagar (migration 129, 04/10/2026).
//
// Decisão do Joaquim: uma estrutura financeira só. As despesas do núcleo
// (antes em nucleo_despesas, migration 115) vivem em fin_contas_pagar, a
// mesma tabela do /admin/financeiro, com o mesmo Plano de Contas
// (fin_categorias). Professor e secretário lançam cada um na sua área.
//
// Lançamento imediato = conta já PAGA (vencimento = pago_em = data da
// despesa), sem passar pelo Caixa Diário (fin_lancamento_id nulo) — mesmo
// comportamento que nucleo_despesas já tinha.
//
// `admin` é o client service_role: quem chama já conferiu a posse/escopo.
// ============================================================

import type { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type FormaPagamentoConta = "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA";

// O CHECK de fin_contas_pagar.forma_pagamento_prevista só aceita estes 5
// valores; os formulários de despesa também oferecem Débito/Crédito/Outro.
export function formaPagamentoParaContaPagar(forma: string | null | undefined): FormaPagamentoConta {
  switch ((forma ?? "").toUpperCase()) {
    case "DINHEIRO":
      return "DINHEIRO";
    case "PIX":
      return "PIX";
    case "BOLETO":
      return "BOLETO";
    case "CARTAO":
    case "DEBITO":
    case "CREDITO":
      return "CARTAO";
    default:
      return "TRANSFERENCIA";
  }
}

export interface DespesaNucleoInput {
  churchId: string;
  professorId: string | null;
  categoriaId: string | null;
  descricao: string;
  valorCentavos: number;
  dataDespesa: string; // yyyy-mm-dd
  forma: string | null;
  userId: string;
  fornecedor?: string | null;
}

// ── Contas a pagar do núcleo (com vencimento, ainda não pagas) ───
// Mesma tabela e mesmo ciclo do /admin/financeiro (PENDENTE -> PAGO |
// CANCELADO). No núcleo não há Caixa Diário: a baixa só marca PAGO — igual
// ao lançamento imediato de despesa.

export interface ContaPagarNucleoInput {
  churchId: string;
  professorId: string | null;
  categoriaId: string | null;
  fornecedor: string;
  descricao: string;
  valorCentavos: number;
  dataVencimento: string; // yyyy-mm-dd
  formaPrevista: string | null;
  userId: string;
}

export async function criarContaPagarNucleo(admin: AdminClient, d: ContaPagarNucleoInput) {
  return admin.from("fin_contas_pagar").insert({
    church_id: d.churchId,
    professor_id: d.professorId,
    categoria_id: d.categoriaId,
    fornecedor: d.fornecedor,
    descricao: d.descricao,
    valor_centavos: d.valorCentavos,
    forma_pagamento_prevista: formaPagamentoParaContaPagar(d.formaPrevista),
    data_vencimento: d.dataVencimento,
    status: "PENDENTE",
    created_by: d.userId,
  });
}

export async function baixarContaPagarNucleo(
  admin: AdminClient,
  id: string,
  forma: string | null,
  userId: string
) {
  return admin
    .from("fin_contas_pagar")
    .update({
      status: "PAGO",
      forma_pagamento_prevista: formaPagamentoParaContaPagar(forma),
      pago_em: new Date().toISOString(),
      baixado_por: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function cancelarContaPagarNucleo(admin: AdminClient, id: string) {
  return admin
    .from("fin_contas_pagar")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", id);
}

// "1.234,56" / "25,00" / "25.5" -> centavos (0 se inválido).
export function valorParaCentavos(valor: string): number {
  const v = valor.trim();
  const limpo = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const num = Number(limpo);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) : 0;
}

export async function lancarDespesaNucleo(admin: AdminClient, d: DespesaNucleoInput) {
  return admin.from("fin_contas_pagar").insert({
    church_id: d.churchId,
    professor_id: d.professorId,
    categoria_id: d.categoriaId,
    fornecedor: d.fornecedor?.trim() || "Não informado",
    descricao: d.descricao,
    valor_centavos: d.valorCentavos,
    forma_pagamento_prevista: formaPagamentoParaContaPagar(d.forma),
    data_vencimento: d.dataDespesa,
    status: "PAGO",
    pago_em: `${d.dataDespesa}T12:00:00Z`,
    baixado_por: d.userId,
    created_by: d.userId,
  });
}
