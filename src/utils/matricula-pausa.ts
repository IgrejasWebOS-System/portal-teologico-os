// ============================================================
// PAUSAR CURSO (26/10/2026, migration 143): o aluno fica ausente por um período, sem cancelar a
// matrícula. Status PAUSADA + data prevista de retorno (opcional) + motivo. Nada é apagado e as
// parcelas não mudam sozinhas (ajustes pela tela FINANCEIRO). Reativar volta para EM_ANDAMENTO.
// Lógica única para professor e secretaria/admin; NÃO faz controle de acesso (o chamador já
// checou posse/escopo e grava a auditoria). Server-only. `db` é `any` (ver utils/staff.ts).
// ============================================================

export interface ResultadoPausa {
  ok: boolean;
  mensagem: string;
  detalhe?: Record<string, unknown>;
}

const hojeBR = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pausarMatricula(db: any, p: { matriculaId: string; retornoPrevisto: string | null; motivo: string }): Promise<ResultadoPausa> {
  const motivo = p.motivo.trim();
  if (motivo.length < 5) return { ok: false, mensagem: "Informe o motivo da pausa (mínimo 5 caracteres)." };
  const hoje = hojeBR();
  let retorno: string | null = null;
  if (p.retornoPrevisto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.retornoPrevisto) || p.retornoPrevisto < hoje) {
      return { ok: false, mensagem: "A data prevista de retorno não pode ser anterior a hoje." };
    }
    retorno = p.retornoPrevisto;
  }

  const { data: m } = await db.from("ead_matriculas").select("id, status").eq("id", p.matriculaId).maybeSingle();
  if (!m) return { ok: false, mensagem: "Matrícula não encontrada." };
  if (m.status === "PAUSADA") return { ok: false, mensagem: "Este curso já está pausado." };
  if (m.status !== "EM_ANDAMENTO") {
    return { ok: false, mensagem: "Só é possível pausar uma matrícula em andamento." };
  }

  const { error } = await db
    .from("ead_matriculas")
    .update({ status: "PAUSADA", pausada_em: hoje, retorno_previsto: retorno, pausa_motivo: motivo })
    .eq("id", p.matriculaId);
  if (error) {
    console.error("[matricula-pausa] pausar", error.message);
    return { ok: false, mensagem: "Erro ao pausar o curso. Tente novamente." };
  }
  return { ok: true, mensagem: "Curso pausado. O aluno sai da chamada até ser reativado.", detalhe: { pausada_em: hoje, retorno_previsto: retorno, motivo } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function reativarMatricula(db: any, matriculaId: string): Promise<ResultadoPausa> {
  const { data: m } = await db.from("ead_matriculas").select("id, status, pausada_em, retorno_previsto, pausa_motivo").eq("id", matriculaId).maybeSingle();
  if (!m) return { ok: false, mensagem: "Matrícula não encontrada." };
  if (m.status !== "PAUSADA") return { ok: false, mensagem: "Este curso não está pausado." };

  const { error } = await db
    .from("ead_matriculas")
    .update({ status: "EM_ANDAMENTO", pausada_em: null, retorno_previsto: null, pausa_motivo: null })
    .eq("id", matriculaId);
  if (error) {
    console.error("[matricula-pausa] reativar", error.message);
    return { ok: false, mensagem: error.message.includes("já possui matrícula") ? "O aluno já tem outra matrícula ativa neste curso." : "Erro ao reativar o curso. Tente novamente." };
  }
  return {
    ok: true,
    mensagem: "Curso reativado. O aluno volta para a chamada.",
    detalhe: { pausada_em: m.pausada_em, retorno_previsto: m.retorno_previsto, motivo: m.pausa_motivo },
  };
}
