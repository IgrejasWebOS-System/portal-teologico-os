"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { labelCurso } from "@/utils/cursos-ead";

// ============================================================
// Aprovação/rejeição de inscrições do Portal EAD (CETADP)
//
// Checagem de papel feita AQUI, no servidor — não depender só
// da RLS. Isso corrige, para este fluxo, a lacuna apontada no
// parecer técnico de 12/07/2026 (rotas de admin sem checagem
// de system_role).
//
// A partir da migration 021 (14/07/2026), a aprovação também cria
// (ou reaproveita) a identidade do aluno em `ead_alunos` por CPF, e
// registra o curso em `ead_matriculas` — o que permite o mesmo CPF
// cursar mais de um curso ao longo do tempo, e aplica a regra do
// CETADP: não pode se matricular de novo no MESMO curso a não ser
// que a matrícula anterior tenha sido reprovada.
// ============================================================

const STAFF_ROLES = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"];

// Cursos com correspondência direta em `courses` hoje — usado para
// aplicar a regra de CPF por curso específico. Os demais valores de
// curso_pretendido (OFICIAL, RECICLAGEM, TEOLOGIA_AVANCADO,
// TREINAMENTO) ainda não têm um curso cadastrado 1:1, então a
// checagem de duplicidade por curso não se aplica a eles ainda.
const CURSO_PRETENDIDO_PARA_TITULO_CURSO: Record<string, string> = {
  TEOLOGIA_BASICO: "Curso Teológico Básico",
  TEOLOGIA_MEDIO: "Curso Teológico Médio",
};

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.system_role ?? "")) {
    redirect(
      "/admin/inscricoes?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return { supabase, userId: user.id };
}

function fail(message: string): never {
  redirect("/admin/inscricoes?error=" + encodeURIComponent(message));
}

export async function approveInscricaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) fail("ID obrigatório.");

  const { supabase, userId } = await requireStaff();

  const { data: inscricao, error: fetchError } = await supabase
    .from("ead_inscricoes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !inscricao) fail("Inscrição não encontrada.");
  if (inscricao.status !== "PENDENTE") fail("Esta inscrição já foi analisada.");

  const admin = createAdminClient();

  // Resolve o curso real (se existir) para poder aplicar a regra de CPF
  let courseId: string | null = null;
  const tituloCurso = CURSO_PRETENDIDO_PARA_TITULO_CURSO[inscricao.curso_pretendido];
  if (tituloCurso) {
    const { data: curso } = await admin
      .from("courses")
      .select("id")
      .eq("title", tituloCurso)
      .maybeSingle();
    courseId = curso?.id ?? null;
  }

  // Identidade do aluno por CPF: reaproveita se essa pessoa já existir
  // (fez outro curso antes), senão será criada mais abaixo.
  const cpfLimpo = inscricao.cpf?.trim() || null;
  let aluno: { id: string; user_id: string | null } | null = null;
  if (cpfLimpo) {
    const { data } = await admin
      .from("ead_alunos")
      .select("id, user_id")
      .eq("cpf", cpfLimpo)
      .maybeSingle();
    aluno = data;
  }

  // Regra do CETADP: mesmo CPF não pode ter matrícula EM_ANDAMENTO ou
  // APROVADO no mesmo curso — só é permitido matricular de novo se a
  // tentativa anterior tiver sido REPROVADO ou CANCELADO.
  if (aluno && courseId) {
    const { data: matriculaConflitante } = await admin
      .from("ead_matriculas")
      .select("id")
      .eq("aluno_id", aluno.id)
      .eq("course_id", courseId)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (matriculaConflitante) {
      fail(
        "Este CPF já possui matrícula em andamento ou aprovada neste curso. Só é possível matricular de novo se a tentativa anterior tiver sido reprovada."
      );
    }
  }

  // A própria função no banco confere novamente se quem chama é staff
  const { data: matricula, error: matriculaError } = await supabase.rpc(
    "get_next_matricula_ead"
  );
  if (matriculaError || !matricula) {
    fail("Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido"));
  }

  if (!aluno) {
    const { data: novoAluno, error: alunoError } = await admin
      .from("ead_alunos")
      .insert({
        user_id: null,
        nome_completo: inscricao.nome_completo,
        cpf: inscricao.cpf,
        email: inscricao.email,
        telefone: inscricao.telefone,
        campo_ministerio_id: inscricao.campo_ministerio_id,
        campo_ministerio_nome: inscricao.campo_ministerio_nome,
        matricula,
        curso_pretendido: inscricao.curso_pretendido,
        status: "ATIVO",
      })
      .select("id, user_id")
      .single();

    if (alunoError || !novoAluno) {
      fail("Erro ao criar aluno: " + (alunoError?.message ?? "desconhecido"));
    }
    aluno = novoAluno;
  }

  // Cria/convida o acesso de autenticação do aluno se ele ainda não tiver
  // — exige service_role. redirectTo leva ao /auth/callback, que troca o
  // code por sessão e manda o aluno definir a senha em /definir-senha.
  if (!aluno.user_id) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(inscricao.email, {
        data: { full_name: inscricao.nome_completo },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
      });

    if (inviteError) {
      fail("Erro ao criar acesso do aluno: " + inviteError.message);
    }

    if (invited?.user?.id) {
      await admin
        .from("ead_alunos")
        .update({ user_id: invited.user.id })
        .eq("id", aluno.id);
      aluno = { ...aluno, user_id: invited.user.id };
    }
  }

  const { error: matriculaInsertError } = await admin.from("ead_matriculas").insert({
    aluno_id: aluno.id,
    course_id: courseId,
    curso_nome_snapshot: labelCurso(inscricao.curso_pretendido),
    matricula,
    status: "EM_ANDAMENTO",
    origem: "INSCRICAO_PUBLICA",
  });

  if (matriculaInsertError) {
    fail("Erro ao registrar matrícula: " + matriculaInsertError.message);
  }

  await supabase
    .from("ead_inscricoes")
    .update({
      status: "APROVADA",
      aluno_id: aluno.id,
      matricula_gerada: matricula,
      analisado_por: userId,
      analisado_em: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/inscricoes");
  redirect(
    "/admin/inscricoes?msg=" +
      encodeURIComponent(`Aluno aprovado. Matrícula ${matricula}.`)
  );
}

export async function rejectInscricaoAction(formData: FormData) {
  const id = formData.get("id") as string;
  const motivo = (formData.get("motivo") as string) || null;
  if (!id) fail("ID obrigatório.");

  const { supabase, userId } = await requireStaff();

  const { error } = await supabase
    .from("ead_inscricoes")
    .update({
      status: "REJEITADA",
      motivo_rejeicao: motivo,
      analisado_por: userId,
      analisado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "PENDENTE");

  if (error) fail("Erro ao rejeitar inscrição.");

  revalidatePath("/admin/inscricoes");
  redirect("/admin/inscricoes?msg=" + encodeURIComponent("Inscrição rejeitada."));
}
