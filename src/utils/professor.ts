// ============================================================
// checkIsProfessor — Módulo 1 (RBAC "Professor de turma"), 13/09/2026.
// Professor NÃO é staff (não deve ver o módulo Admin inteiro) — é um
// papel à parte, escopado só aos próprios alunos (ead_matriculas.
// professor_id). `professores.user_id` (migration 101) é a ponte entre
// o login e o cadastro descritivo que já existia.
//
// `supabase` tipado `any` de propósito — mesmo motivo do comentário em
// utils/staff.ts ("Type instantiation is excessively deep").
// ============================================================

export interface ProfessorLogado {
  id: string;
  nome_completo: string;
}

export async function checkIsProfessor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<ProfessorLogado | null> {
  const { data } = await supabase
    .from("professores")
    .select("id, nome_completo")
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}
