"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkIsStaff } from "@/utils/staff";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    redirect(
      "/admin/certificados?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return { supabase, userId: user.id };
}

// ============================================================
// marcarComoConcluidoAction — atalho para a secretaria marcar uma
// matrícula como concluída manualmente (o portal ainda não tem uma
// regra automática de "100% das aulas assistidas = concluído").
// ============================================================
export async function marcarComoConcluidoAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const enrollmentId = formData.get("enrollment_id") as string;

  await supabase
    .from("enrollments")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  revalidatePath("/admin/certificados");
}

// ============================================================
// emitirCertificadoAction — gera o número público (via RPC
// get_next_certificado, staff-only) e grava o certificado com
// snapshot do nome do aluno e do curso no momento da emissão.
// ============================================================
export async function emitirCertificadoAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const enrollmentId = formData.get("enrollment_id") as string;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, course_edition_id, status")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || enrollment.status !== "COMPLETED") {
    redirect(
      "/admin/certificados?error=" +
        encodeURIComponent("Matrícula não encontrada ou ainda não concluída.")
    );
  }

  const admin = createAdminClient();

  const { data: curso } = await admin
    .from("courses")
    .select("title, duration_hours")
    .eq("id", enrollment!.course_id)
    .single();

  const { data: perfil } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", enrollment!.user_id)
    .single();

  const { data: numero, error: erroNumero } = await supabase.rpc("get_next_certificado");

  if (erroNumero || !numero) {
    redirect(
      "/admin/certificados?error=" +
        encodeURIComponent("Não foi possível gerar o número do certificado.")
    );
  }

  const { error } = await admin.from("certificates").insert({
    user_id: enrollment!.user_id,
    enrollment_id: enrollment!.id,
    course_id: enrollment!.course_id,
    course_edition_id: enrollment!.course_edition_id,
    numero_certificado: numero,
    nome_aluno: perfil?.full_name || perfil?.email || "Aluno",
    nome_curso: curso?.title ?? "Curso",
    carga_horaria: curso?.duration_hours ?? null,
  });

  if (error) {
    redirect(
      "/admin/certificados?error=" + encodeURIComponent("Erro ao emitir certificado: " + error.message)
    );
  }

  revalidatePath("/admin/certificados");
  redirect("/admin/certificados?msg=" + encodeURIComponent(`Certificado ${numero} emitido.`));
}
