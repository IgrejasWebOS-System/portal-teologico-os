import { createAdminClient } from "@/utils/supabase/admin";

// ============================================================
// Resolve a ficha de aluno + matrícula "de referência" do usuário
// logado, pras telas de Impressão (Ficha, Testes, Prova,
// Declaração, Certificado): prioriza matrícula EM_ANDAMENTO mais
// recente; se não houver nenhuma em andamento, cai pra mais
// recente de qualquer status (aluno que já concluiu, por exemplo).
// Retorna null se o usuário não tiver ficha de aluno oficial.
// ============================================================

export interface AlunoFicha {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string;
  telefone: string | null;
  campo_ministerio_nome: string | null;
  status: string;
}

export interface MatriculaAtiva {
  id: string;
  course_id: string | null;
  curso_nome_snapshot: string;
  matricula: string;
  status: string;
  data_matricula: string;
}

export async function resolverAlunoEMatricula(
  userId: string
): Promise<{ aluno: AlunoFicha; matricula: MatriculaAtiva | null } | null> {
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, nome_completo, cpf, email, telefone, campo_ministerio_nome, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aluno) return null;

  const { data: matriculas } = await admin
    .from("ead_matriculas")
    .select("id, course_id, curso_nome_snapshot, matricula, status, data_matricula")
    .eq("aluno_id", aluno.id)
    .order("data_matricula", { ascending: false });

  const lista = matriculas ?? [];
  const matricula =
    lista.find((m) => m.status === "EM_ANDAMENTO") ?? lista[0] ?? null;

  return { aluno, matricula };
}
