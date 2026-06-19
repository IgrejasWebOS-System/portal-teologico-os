"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Marca uma lição da EBD como lida pelo usuário */
export async function markLessonReadAction(formData: FormData) {
  const lessonId   = formData.get("lessonId")   as string;
  const returnPath = formData.get("returnPath") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("ebd_lesson_progress")
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
    );

  revalidatePath(returnPath);
}
