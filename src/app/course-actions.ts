"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ── Matrícula ──────────────────────────────────────────────────────────────
export async function enrollAction(formData: FormData) {
  const courseId   = formData.get("courseId")   as string;
  const returnPath = formData.get("returnPath") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("enrollments")
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    );

  revalidatePath(returnPath);
}

// ── Conclusão de aula ──────────────────────────────────────────────────────
export async function completeLessonAction(formData: FormData) {
  const lessonId   = formData.get("lessonId")   as string;
  const courseId   = formData.get("courseId")   as string;
  const returnPath = formData.get("returnPath") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Registrar conclusão (ignora se já existir)
  await supabase
    .from("lesson_completions")
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
    );

  // 2. Buscar todas as aulas do curso
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  const allIds = (allLessons ?? []).map((l) => l.id);
  const total  = allIds.length;

  // 3. Contar aulas concluídas pelo usuário neste curso
  const { count: completed } = await supabase
    .from("lesson_completions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("lesson_id", allIds);

  // 4. Calcular progresso e atualizar matrícula
  const progress = total > 0 ? Math.round(((completed ?? 0) / total) * 100) : 0;

  await supabase
    .from("enrollments")
    .update({
      progress_percent: progress,
      status:           progress === 100 ? "COMPLETED" : "ENROLLED",
      completed_at:     progress === 100 ? new Date().toISOString() : null,
    })
    .eq("user_id",   user.id)
    .eq("course_id", courseId);

  revalidatePath(returnPath);
}
