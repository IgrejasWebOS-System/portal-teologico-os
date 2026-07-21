"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectToRaw = formData.get("redirectTo") as string | null;
  // Só aceita caminhos internos (evita open redirect via query string).
  const hasExplicitRedirect =
    !!redirectToRaw && redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//");
  const redirectTo = hasExplicitRedirect ? (redirectToRaw as string) : "/portal";

  if (!email || !password) {
    redirect(
      "/login?error=Preencha email e senha&redirectTo=" + encodeURIComponent(redirectTo)
    );
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent(error.message) +
        "&redirectTo=" +
        encodeURIComponent(redirectTo)
    );
  }

  // Sem link de retorno explícito: todo aluno oficial com matrícula em
  // andamento cai direto na própria sala de aula, sem passar pelo /portal.
  if (!hasExplicitRedirect && signInData.user) {
    const { data: aluno } = await supabase
      .from("ead_alunos")
      .select("id")
      .eq("user_id", signInData.user.id)
      .maybeSingle();

    if (aluno) {
      const { data: matricula } = await supabase
        .from("ead_matriculas")
        .select("course_id")
        .eq("aluno_id", aluno.id)
        .eq("status", "EM_ANDAMENTO")
        .not("course_id", "is", null)
        .order("data_matricula", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matricula?.course_id) {
        const { data: course } = await supabase
          .from("courses")
          .select("module")
          .eq("id", matricula.course_id)
          .maybeSingle();

        if (course?.module) {
          redirect(`/${course.module}/${matricula.course_id}`);
        }
      }
    }
  }

  redirect(redirectTo);
}
