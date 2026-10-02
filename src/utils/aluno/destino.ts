// ============================================================
// Destino pós-login/pós-"/login" pra quem já está autenticado —
// compartilhado entre loginAction (submit do formulário) e o
// updateSession do proxy.ts (quando um usuário já logado reabre
// /login). Antes essa regra vivia só dentro de loginAction; foi
// extraída aqui em 12/09/2026 pra não duplicar (e desalinhar) a
// mesma decisão nos dois lugares — decisão do Joaquim: o hub
// "/portal" não é mais o destino principal do aluno oficial, ele
// cai direto na própria sala de aula (matéria em andamento).
//
// `supabase` tipado `any` de propósito — ver comentário em
// utils/staff.ts sobre "Type instantiation is excessively deep".
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolverDestinoPosLogin(supabase: any, userId: string): Promise<string> {
  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aluno) return "/portal";

  const { data: matricula } = await supabase
    .from("ead_matriculas")
    .select("course_id")
    .eq("aluno_id", aluno.id)
    .eq("status", "EM_ANDAMENTO")
    .not("course_id", "is", null)
    .order("data_matricula", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!matricula?.course_id) return "/portal";

  const { data: course } = await supabase
    .from("courses")
    .select("module")
    .eq("id", matricula.course_id)
    .maybeSingle();

  if (!course?.module) return "/portal";

  return `/${course.module}/${matricula.course_id}`;
}
