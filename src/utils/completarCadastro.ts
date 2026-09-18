import type { ProfessorLogado } from "@/utils/professor";

// ============================================================
// Gate "/completar-cadastro" — mutirão de cadastro, 18/09/2026, pedido
// do Joaquim: quem entra pela primeira vez por um link público do
// mutirão (professor por /cadastro-professor, aluno por
// /matricula-turma/[token]) precisa completar a ficha antes de abrir a
// área administrativa/portal -- sem isso o gerenciamento (turmas,
// relatórios, matrículas) não tem base confiável.
//
// Escopo confirmado com o Joaquim (AskUserQuestion, 18/09/2026): só
// professor e aluno do MUTIRÃO -- quem foi cadastrado diretamente pela
// secretaria ou pelo próprio professor (não veio do link público)
// nunca passa por este gate, mesmo com campo em branco.
//
// Usado nos três pontos de entrada pós-autenticação: loginAction
// (submit de /login), updateSession (usuário já logado reabrindo
// /login) e definirSenhaAction (primeiro acesso via convite).
// ============================================================

export function professorPrecisaCompletar(professor: ProfessorLogado): boolean {
  if (!professor.cadastro_publico) return false;
  return !professor.telefone || !professor.cpf || !professor.cargo || !professor.unit_id;
}

export async function resolverGateCompletarCadastro(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  professor: ProfessorLogado | null
): Promise<string | null> {
  if (professor) {
    return professorPrecisaCompletar(professor) ? "/completar-cadastro" : null;
  }

  // Não é professor -- checa se é aluno vindo de um link de mutirão
  // (ead_matriculas.origem='MUTIRAO_LINK') com telefone ainda em
  // branco (telefone é opcional no cadastro público em si, pedido
  // explícito do Joaquim, mas vira obrigatório aqui no primeiro
  // acesso).
  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id, telefone")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aluno || aluno.telefone) return null;

  const { data: matriculaMutirao } = await supabase
    .from("ead_matriculas")
    .select("id")
    .eq("aluno_id", aluno.id)
    .eq("origem", "MUTIRAO_LINK")
    .limit(1)
    .maybeSingle();

  return matriculaMutirao ? "/completar-cadastro" : null;
}
