import type { SupabaseClient } from "@supabase/supabase-js";
import { labelCurso } from "@/utils/cursos-ead";

// ============================================================
// Auto-matrícula — decisão do CETADP de 16/07/2026: matrícula deixou
// de depender de aprovação manual da secretaria. Toda matrícula nova
// (curso gratuito, curso pago já confirmado pelo Mercado Pago, ou o
// aluno logado escolhendo o curso sozinho) passa por esta mesma
// rotina, que:
//
// 1. Resolve o curso real em `courses` (se houver correspondência —
//    hoje só Teologia Básico/Médio têm curso 1:1 cadastrado).
// 2. Reaproveita a ficha do aluno por CPF (ou por user_id, quando a
//    pessoa já está logada) se ela já existir, senão cria uma nova.
// 3. Aplica a regra do CETADP: mesmo CPF não pode ter matrícula
//    EM_ANDAMENTO/APROVADO no mesmo curso outra vez.
// 4. Gera o número de matrícula (RPC aceita chamada service_role).
// 5. Garante o acesso de login do aluno (convite por e-mail — só
//    quando ele ainda não tem `user_id`, i.e., não está logado
//    fazendo isso na hora).
// 6. Insere a linha em `ead_matriculas`.
//
// Sempre roda com o client admin (service_role) — quem chama já fez
// sua própria checagem de autorização antes (público, mas com
// pagamento confirmado; ou o próprio usuário logado se matriculando).
// Nunca usa `redirect()` aqui dentro — devolve um resultado pra quem
// chamou decidir o que fazer.
// ============================================================

const CURSO_PRETENDIDO_PARA_TITULO_CURSO: Record<string, string> = {
  TEOLOGIA_BASICO: "Curso Teológico Básico",
  TEOLOGIA_MEDIO: "Curso Teológico Médio",
};

export interface MatricularParams {
  cursoPretendido: string;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  telefone?: string | null;
  campoMinisterioId?: string | null;
  campoMinisterioNome?: string | null;
  // Se a pessoa já está logada fazendo a própria matrícula, passa o
  // user.id aqui — pula o convite por e-mail (ela já tem acesso).
  userIdConhecido?: string | null;
  origem: "INSCRICAO_PUBLICA" | "AUTO_MATRICULA";
}

export type MatricularResultado =
  | { ok: true; matricula: string; alunoId: string; courseId: string | null }
  | { ok: false; erro: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function matricularAlunoEmCurso(
  admin: SupabaseClient<any>,
  params: MatricularParams
): Promise<MatricularResultado> {
  let courseId: string | null = null;
  const tituloCurso = CURSO_PRETENDIDO_PARA_TITULO_CURSO[params.cursoPretendido];
  if (tituloCurso) {
    const { data: curso } = await admin.from("courses").select("id").eq("title", tituloCurso).maybeSingle();
    courseId = curso?.id ?? null;
  }

  const cpfLimpo = params.cpf?.trim() || null;
  let aluno: { id: string; user_id: string | null } | null = null;

  if (params.userIdConhecido) {
    const { data } = await admin
      .from("ead_alunos")
      .select("id, user_id")
      .eq("user_id", params.userIdConhecido)
      .maybeSingle();
    aluno = data;
  }
  if (!aluno && cpfLimpo) {
    const { data } = await admin.from("ead_alunos").select("id, user_id").eq("cpf", cpfLimpo).maybeSingle();
    aluno = data;
  }

  if (aluno && courseId) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id")
      .eq("aluno_id", aluno.id)
      .eq("course_id", courseId)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (conflito) {
      return {
        ok: false,
        erro:
          "Esta pessoa já possui matrícula em andamento ou aprovada neste curso. Só é possível matricular de novo se a tentativa anterior tiver sido reprovada.",
      };
    }
  }

  const { data: matricula, error: matriculaError } = await admin.rpc("get_next_matricula_ead");
  if (matriculaError || !matricula) {
    return { ok: false, erro: "Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido") };
  }

  if (!aluno) {
    const { data: novoAluno, error: alunoError } = await admin
      .from("ead_alunos")
      .insert({
        user_id: params.userIdConhecido ?? null,
        nome_completo: params.nomeCompleto,
        cpf: cpfLimpo,
        email: params.email,
        telefone: params.telefone ?? null,
        campo_ministerio_id: params.campoMinisterioId ?? null,
        campo_ministerio_nome: params.campoMinisterioNome ?? null,
        matricula,
        curso_pretendido: params.cursoPretendido,
        status: "ATIVO",
      })
      .select("id, user_id")
      .single();

    if (alunoError || !novoAluno) {
      return { ok: false, erro: "Erro ao criar aluno: " + (alunoError?.message ?? "desconhecido") };
    }
    aluno = novoAluno;
  }

  if (!aluno.user_id) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(params.email, {
      data: { full_name: params.nomeCompleto },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
    });

    if (inviteError) {
      return { ok: false, erro: "Erro ao criar acesso do aluno: " + inviteError.message };
    }

    if (invited?.user?.id) {
      await admin.from("ead_alunos").update({ user_id: invited.user.id }).eq("id", aluno.id);
      aluno = { ...aluno, user_id: invited.user.id };
    }
  }

  const { error: matriculaInsertError } = await admin.from("ead_matriculas").insert({
    aluno_id: aluno.id,
    course_id: courseId,
    curso_nome_snapshot: labelCurso(params.cursoPretendido),
    matricula,
    status: "EM_ANDAMENTO",
    origem: params.origem,
  });

  if (matriculaInsertError) {
    return { ok: false, erro: "Erro ao registrar matrícula: " + matriculaInsertError.message };
  }

  return { ok: true, matricula, alunoId: aluno.id, courseId };
}
