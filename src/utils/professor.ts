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
  // Campos abaixo (mutirão de cadastro, 18/09/2026) só existem pra
  // resolverGateCompletarCadastro() decidir se a ficha está completa --
  // os outros chamadores (checkIsProfessor usado só pra saber "é
  // professor?") ignoram e continuam funcionando normalmente.
  cadastro_publico: boolean;
  telefone: string | null;
  cpf: string | null;
  cargo: string | null;
  unit_id: string | null;
}

export async function checkIsProfessor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<ProfessorLogado | null> {
  const { data } = await supabase
    .from("professores")
    .select("id, nome_completo, cadastro_publico, telefone, cpf, cargo, unit_id")
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}
