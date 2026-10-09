// ============================================================
// Auditoria "quem fez, em qual papel" — 09/10/2026, pedido do Joaquim
// (migration 135, tabela auditoria_acoes). Server-only: grava com o
// client service_role passado pelo chamador (as Server Actions já o têm
// depois de checar o papel).
//
// NUNCA derruba a ação: qualquer falha ao gravar a auditoria só vai para
// o log do servidor. O parâmetro `db` é `any` de propósito (mesmo motivo
// de utils/staff.ts: tipar o SupabaseClient estoura "Type instantiation
// is excessively deep").
// ============================================================

export type PapelAuditoria = "PROFESSOR" | "SECRETARIA" | "ADMIN_GLOBAL";

export interface EventoAuditoria {
  // Quem fez: informe o login (userId) e/ou o professor (professorId) —
  // o que faltar é resolvido pelo cadastro do professor.
  ator: { userId?: string | null; professorId?: string | null };
  papel: PapelAuditoria;
  acao: string; // ex.: BAIXAR_PARCELA, CRIAR_MATRICULA, AUTOATENDIMENTO_BLOQUEADO
  entidade?: string | null; // ex.: fin_contas_receber
  entidadeId?: string | null;
  alunoId?: string | null;
  detalhe?: Record<string, unknown> | null;
}

export async function registrarAuditoria(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  evento: EventoAuditoria
): Promise<void> {
  try {
    let userId = evento.ator.userId ?? null;
    let nome: string | null = null;

    if (evento.ator.professorId) {
      const { data } = await db
        .from("professores")
        .select("user_id, nome_completo")
        .eq("id", evento.ator.professorId)
        .maybeSingle();
      if (data) {
        userId = userId ?? data.user_id ?? null;
        nome = data.nome_completo ?? null;
      }
    }
    if (!nome && userId) {
      const { data } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      nome = data?.full_name ?? null;
    }

    const { error } = await db.from("auditoria_acoes").insert({
      ator_user_id: userId,
      ator_nome: nome,
      papel: evento.papel,
      acao: evento.acao,
      entidade: evento.entidade ?? null,
      entidade_id: evento.entidadeId ?? null,
      aluno_id: evento.alunoId ?? null,
      detalhe: evento.detalhe ?? null,
    });
    if (error) console.error("[auditoria] falha ao gravar:", error.message);
  } catch (e) {
    console.error("[auditoria] erro inesperado:", e instanceof Error ? e.message : e);
  }
}
