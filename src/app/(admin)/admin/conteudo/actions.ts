"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkIsStaff } from "@/utils/staff";

// ============================================================
// Checagem de papel feita AQUI, no servidor — mesma correção já
// aplicada em /admin/inscricoes. Antes, qualquer usuário autenticado
// (não só a secretaria) podia criar/editar curso e aula.
// ============================================================
async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    redirect(
      "/admin/conteudo?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return supabase;
}

// ── Criar aula ───────────────────────────────────────────────
export async function createLessonAction(formData: FormData) {
  const supabase = await requireStaff();

  const course_id   = formData.get("course_id") as string;
  const title       = formData.get("title") as string;
  const description = formData.get("description") as string;
  const video_url   = formData.get("video_url") as string;
  const video_type  = (formData.get("video_type") as string) || "none";
  const thumbnail_url = formData.get("thumbnail_url") as string;
  const is_free_preview = formData.get("is_free_preview") === "true";
  const order_index = parseInt(formData.get("order_index") as string) || 1;

  if (!course_id || !title) {
    return { success: false, message: "Curso e título são obrigatórios." };
  }

  const { error } = await supabase.from("lessons").insert({
    course_id,
    title,
    description:      description || null,
    video_url:        video_url || null,
    video_type:       video_type,
    thumbnail_url:    thumbnail_url || null,
    is_free_preview,
    order_index,
    created_at:       new Date().toISOString(),
  });

  if (error) return { success: false, message: "Erro ao criar aula: " + error.message };

  revalidatePath("/admin/conteudo");
  redirect("/admin/conteudo");
}

// ── Atualizar vídeo de uma aula existente ────────────────────
export async function updateLessonVideoAction(formData: FormData) {
  const supabase = await requireStaff();

  const id          = formData.get("id") as string;
  const video_url   = formData.get("video_url") as string;
  const video_type  = (formData.get("video_type") as string) || "none";
  const thumbnail_url = formData.get("thumbnail_url") as string;
  const video_duration_secs = formData.get("video_duration_secs")
    ? parseInt(formData.get("video_duration_secs") as string)
    : null;

  if (!id) return { success: false, message: "ID obrigatório." };

  const { error } = await supabase
    .from("lessons")
    .update({
      video_url:           video_url || null,
      video_type,
      thumbnail_url:       thumbnail_url || null,
      video_duration_secs: video_duration_secs,
    })
    .eq("id", id);

  if (error) return { success: false, message: "Erro ao atualizar: " + error.message };

  revalidatePath("/admin/conteudo");
  return { success: true };
}

// ── Criar curso/trilha ───────────────────────────────────────
export async function createCourseAction(formData: FormData) {
  const supabase = await requireStaff();

  const title           = formData.get("title") as string;
  const description     = formData.get("description") as string;
  const module          = formData.get("module") as "escola" | "cursos";
  const instructor_name = formData.get("instructor_name") as string;
  const level           = (formData.get("level") as string) || "iniciante";
  const thumbnail_url   = formData.get("thumbnail_url") as string;
  const featured        = formData.get("featured") === "true";

  if (!title || !module) return { success: false, message: "Título e módulo são obrigatórios." };

  const { error } = await supabase.from("courses").insert({
    title,
    description:      description || null,
    module,
    instructor_name:  instructor_name || null,
    level,
    thumbnail_url:    thumbnail_url || null,
    featured,
    status:           "DRAFT",
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  });

  if (error) return { success: false, message: "Erro ao criar curso: " + error.message };

  revalidatePath("/admin/conteudo");
  redirect("/admin/conteudo/trilhas");
}

// ── Wrapper void para <form action> em Server Components ─────
export async function createCourseVoidAction(formData: FormData): Promise<void> {
  await createCourseAction(formData);
}

// ── Publicar / despublicar curso ─────────────────────────────
export async function toggleCourseStatusAction(formData: FormData) {
  const supabase = await requireStaff();

  const id         = formData.get("id") as string;
  const newStatus  = formData.get("status") as string;

  await supabase.from("courses").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);

  revalidatePath("/admin/conteudo");
  revalidatePath("/escola");
  revalidatePath("/cursos");
}
