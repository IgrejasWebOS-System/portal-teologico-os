// ============================================================
// Edição de parcela (data e valor) — 26/10/2026, pedido do Joaquim ("tem datas e
// valores lançados errados, temos que poder alterar data e valor").
// Lógica única usada pela tela FINANCEIRO do professor e da secretaria/admin. NÃO faz
// controle de acesso: quem chama já checou a posse/escopo do aluno. Server-only.
//
// Regra vigente na fase de implantação (decisão do Joaquim, 26/10/2026): todos os perfis com
// acesso ao aluno editam, inclusive parcela PAGA, sem motivo obrigatório. Regras mais rígidas
// serão definidas depois da validação definitiva do sistema. Por isso TODA edição fica
// registrada em auditoria_acoes (antes e depois), pelo chamador.
//
// Travas que continuam valendo:
//  - parcela CANCELADA não é editada (reative antes);
//  - parcela paga em DINHEIRO (ligada ao Caixa Diário) não muda de valor aqui: o ajuste é feito
//    no Caixa pela secretaria, para o caixa não divergir;
//  - valor entre R$ 0,01 e R$ 100.000,00; datas válidas entre 2020 e 2100.
// `db` é `any` de propósito (mesmo motivo de utils/staff.ts).
// ============================================================

export interface EntradaEdicaoParcela {
  parcelaId: string;
  alunoId: string; // a parcela precisa ser deste aluno
  dataVencimento: string; // YYYY-MM-DD
  valorCentavos: number;
  dataPagamento?: string | null; // só para parcela PAGA
}

export interface ResultadoEdicaoParcela {
  ok: boolean;
  mensagem: string;
  antes?: Record<string, unknown>;
  depois?: Record<string, unknown>;
}

/** "1.234,56" | "65,00" | "65.5" | "R$ 65" -> centavos (0 se inválido). */
export function valorBRParaCentavos(texto: string): number {
  const limpo = String(texto ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function dataValida(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  if (a < 2020 || a > 2100) return false;
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function editarParcela(db: any, e: EntradaEdicaoParcela): Promise<ResultadoEdicaoParcela> {
  if (!dataValida(e.dataVencimento)) return { ok: false, mensagem: "Informe uma data de vencimento válida." };
  if (!Number.isInteger(e.valorCentavos) || e.valorCentavos < 1 || e.valorCentavos > 10_000_000) {
    return { ok: false, mensagem: "Informe um valor entre R$ 0,01 e R$ 100.000,00." };
  }

  const { data: conta } = await db
    .from("fin_contas_receber")
    .select("id, aluno_id, status, valor_bruto_centavos, valor_liquido_centavos, data_vencimento, pago_em, fin_lancamento_id, numero_parcela, total_parcelas")
    .eq("id", e.parcelaId)
    .maybeSingle();
  if (!conta) return { ok: false, mensagem: "Parcela não encontrada." };
  if (conta.aluno_id !== e.alunoId) return { ok: false, mensagem: "Esta parcela não pertence a este aluno." };
  if (conta.status === "CANCELADO") return { ok: false, mensagem: "Parcela cancelada: reative a parcela antes de editar." };

  const paga = conta.status === "PAGO";
  const valorMudou = e.valorCentavos !== conta.valor_bruto_centavos;
  if (paga && valorMudou && conta.fin_lancamento_id) {
    return {
      ok: false,
      mensagem: "Esta parcela foi paga em dinheiro e está ligada ao Caixa Diário. O valor só pode ser ajustado pela secretaria, no Caixa.",
    };
  }

  const alteracoes: Record<string, unknown> = { data_vencimento: e.dataVencimento, valor_bruto_centavos: e.valorCentavos };

  if (paga) {
    // mantém a proporção da taxa já aplicada ao valor líquido
    if (valorMudou && conta.valor_liquido_centavos != null && conta.valor_bruto_centavos > 0) {
      alteracoes.valor_liquido_centavos = Math.round((e.valorCentavos * conta.valor_liquido_centavos) / conta.valor_bruto_centavos);
    }
    if (e.dataPagamento) {
      if (!dataValida(e.dataPagamento)) return { ok: false, mensagem: "Informe uma data de pagamento válida." };
      alteracoes.pago_em = new Date(`${e.dataPagamento}T12:00:00Z`).toISOString();
    }
  }
  alteracoes.updated_at = new Date().toISOString();

  const nada =
    conta.data_vencimento === e.dataVencimento &&
    !valorMudou &&
    (!paga || !e.dataPagamento || String(conta.pago_em ?? "").slice(0, 10) === e.dataPagamento);
  if (nada) return { ok: true, mensagem: "Nenhuma alteração: os valores já estavam assim." };

  const { error } = await db.from("fin_contas_receber").update(alteracoes).eq("id", e.parcelaId);
  if (error) {
    console.error("[editar-parcela]", error.message);
    return { ok: false, mensagem: "Erro ao salvar a parcela. Tente novamente." };
  }

  return {
    ok: true,
    mensagem: `Parcela ${conta.numero_parcela}/${conta.total_parcelas} atualizada.`,
    antes: { data_vencimento: conta.data_vencimento, valor_bruto_centavos: conta.valor_bruto_centavos, pago_em: conta.pago_em, status: conta.status },
    depois: {
      data_vencimento: e.dataVencimento,
      valor_bruto_centavos: e.valorCentavos,
      pago_em: (alteracoes.pago_em as string | undefined) ?? conta.pago_em,
      status: conta.status,
    },
  };
}
