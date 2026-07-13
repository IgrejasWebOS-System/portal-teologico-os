"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Aprovação/rejeição de inscrições do Portal EAD (CETADP)
//
// Checagem de papel feita AQUI, no servidor — não depender só
// da RLS. Isso corrige, para este fluxo, a lacuna apontada no
// parecer técnico de 12/07/2026 (rotas de admin sem checagem
// de system_role).
// ============================================================

const STAFF_ROLES = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"];

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

  // A própria função no banco confere novamente se quem chama é staff
  const { data: matricula, error: matriculaError } = await supabase.rpc(
    "get_next_matricula_ead"
  );
  if (matriculaError || !matricula) {
    fail("Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido"));
  }

  // Cria/convida o usuário de autenticação do aluno — exige service_role
  // redirectTo leva ao /auth/callback, que troca o code por sessão e manda
  // o aluno definir a senha em /definir-senha (ele ainda não tem nenhuma).
  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(inscricao.email, {
      data: { full_name: inscricao.nome_completo },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
    });

  if (inviteError) {
    fail("Erro ao criar acesso do aluno: " + inviteError.message);
  }

  const { data: aluno, error: alunoError } = await supabase
    .from("ead_alunos")
    .insert({
      user_id: invited?.user?.id ?? null,
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
    .select("id")
    .single();

  if (alunoError || !aluno) {
    fail("Erro ao criar aluno: " + (alunoError?.message ?? "desconhecido"));
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
