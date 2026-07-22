"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Admin EBD — cadastro de trimestres e lições. As tabelas
// (ebd_quarters/ebd_lessons) já existiam com dados reais importados
// (199 lições/19 trimestres); isto aqui é só a camada de gestão em
// cima delas — criar novos trimestres/lições e editar os existentes,
// sem depender de import manual via SQL.
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect("/admin/ebd?error=" + encodeURIComponent("Acesso restrito à secretaria do CETADP."));
  }

  return { supabase, userId: user.id };
}

// ── Trimestres ───────────────────────────────────────────────
export async function addTrimestreAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const year = Number(formData.get("year"));
  const quarter = Number(formData.get("quarter"));
  const theme = (formData.get("theme") as string)?.trim() || null;
  const audience = (formData.get("audience") as string) || "ADULTOS";
  const publisher = (formData.get("publisher") as string) || "CPAD";
  const lessonCount = Number(formData.get("lesson_count")) || 13;

  if (!year || !quarter) {
    redirect("/admin/ebd/nova?error=" + encodeURIComponent("Preencha ano e trimestre."));
  }

  const { data, error } = await supabase
    .from("ebd_quarters")
    .insert({ year, quarter, theme, audience, publisher, lesson_count: lessonCount })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      "/admin/ebd/nova?error=" +
        encodeURIComponent(error?.message ?? "Erro ao criar trimestre — confira se já não existe um igual.")
    );
  }

  revalidatePath("/admin/ebd");
  redirect(`/admin/ebd/${data!.id}`);
}

export async function deleteTrimestreAction(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("ebd_quarters").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/ebd");
  return { success: true };
}

export async function deleteTrimestreFormAction(id: string): Promise<void> {
  await deleteTrimestreAction(id);
}

// ── Lições ────────────────────────────────────────────────────
export interface DailyReadingInput {
  day: string;
  reference: string;
  description: string;
}
export interface SubtopicInput {
  number: number;
  title: string;
  content: string;
}
export interface TopicInput {
  number: number;
  title: string;
  subtopics: SubtopicInput[];
  synopsis: string | null;
  bibliological_aid: string | null;
  knowledge_expansion: string | null;
}
export interface ReviewQuestionInput {
  number: number;
  question: string;
  answer: string;
}

export interface LicaoPayload {
  id?: string;
  quarter_id: string;
  lesson_number: number;
  title: string;
  aureo_text: string | null;
  aureo_reference: string | null;
  practical_truth: string | null;
  suggested_hymns: string | null;
  class_reading_ref: string | null;
  class_reading_text: string | null;
  lesson_plan: string | null;
  introduction: string | null;
  conclusion: string | null;
  source_url: string | null;
  video_url: string | null;
  video_type: string;
  daily_readings: DailyReadingInput[];
  topics: TopicInput[];
  review_questions: ReviewQuestionInput[];
}

export async function salvarLicaoAction(
  payload: LicaoPayload
): Promise<{ success: boolean; message?: string; id?: string }> {
  const { supabase } = await requireStaff();

  if (!payload.quarter_id || !payload.lesson_number || !payload.title?.trim()) {
    return { success: false, message: "Preencha o número e o título da lição." };
  }

  const dailyReadings = payload.daily_readings.filter((d) => d.reference.trim() || d.description.trim());
  const topics = payload.topics
    .filter((t) => t.title.trim())
    .map((t, i) => ({
      ...t,
      number: i + 1,
      subtopics: t.subtopics.filter((s) => s.title.trim() || s.content.trim()).map((s, si) => ({ ...s, number: si + 1 })),
    }));
  const reviewQuestions = payload.review_questions
    .filter((q) => q.question.trim())
    .map((q, i) => ({ ...q, number: i + 1 }));

  const row = {
    quarter_id: payload.quarter_id,
    lesson_number: payload.lesson_number,
    title: payload.title.trim(),
    aureo_text: payload.aureo_text?.trim() || null,
    aureo_reference: payload.aureo_reference?.trim() || null,
    practical_truth: payload.practical_truth?.trim() || null,
    suggested_hymns: payload.suggested_hymns?.trim() || null,
    class_reading_ref: payload.class_reading_ref?.trim() || null,
    class_reading_text: payload.class_reading_text?.trim() || null,
    lesson_plan: payload.lesson_plan?.trim() || null,
    introduction: payload.introduction?.trim() || null,
    conclusion: payload.conclusion?.trim() || null,
    source_url: payload.source_url?.trim() || null,
    video_url: payload.video_url?.trim() || null,
    video_type: payload.video_type || "none",
    daily_readings: dailyReadings,
    topics,
    review_questions: reviewQuestions,
  };

  if (payload.id) {
    const { error } = await supabase.from("ebd_lessons").update(row).eq("id", payload.id);
    if (error) return { success: false, message: error.message };
    revalidatePath(`/admin/ebd/${payload.quarter_id}`);
    return { success: true, id: payload.id };
  }

  const { data, error } = await supabase.from("ebd_lessons").insert(row).select("id").single();
  if (error || !data) return { success: false, message: error?.message ?? "Erro ao salvar lição." };
  revalidatePath(`/admin/ebd/${payload.quarter_id}`);
  return { success: true, id: data.id };
}

export async function deleteLicaoAction(id: string, quarterId: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("ebd_lessons").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath(`/admin/ebd/${quarterId}`);
  return { success: true };
}

export async function deleteLicaoFormAction(id: string, quarterId: string): Promise<void> {
  await deleteLicaoAction(id, quarterId);
}
