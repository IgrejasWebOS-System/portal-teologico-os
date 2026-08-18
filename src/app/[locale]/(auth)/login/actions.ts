"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export async function loginAction(formData: FormData) {
  // getLocale() não é confiável dentro de Server Actions (não recebe o
  // path da requisição do mesmo jeito que uma renderização de página) —
  // por isso o idioma vem de um campo oculto preenchido pela própria
  // página, com os parâmetros de rota (sempre corretos).
  const localeRaw = formData.get("locale");
  const locale = hasLocale(routing.locales, localeRaw) ? localeRaw : routing.defaultLocale;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectToRaw = formData.get("redirectTo") as string | null;
  // Só aceita caminhos internos (evita open redirect via query string).
  const hasExplicitRedirect =
    !!redirectToRaw && redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//");
  const redirectTo = hasExplicitRedirect ? (redirectToRaw as string) : "/portal";

  if (!email || !password) {
    redirect({
      href: "/login?error=Preencha email e senha&redirectTo=" + encodeURIComponent(redirectTo),
      locale,
    });
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect({
      href:
        "/login?error=" +
        encodeURIComponent(error.message) +
        "&redirectTo=" +
        encodeURIComponent(redirectTo),
      locale,
    });
  }

  // Sem link de retorno explícito: staff (secretaria/admin) cai direto no
  // painel administrativo — é o núcleo de trabalho deles, não o hub do
  // aluno. Checado antes de qualquer coisa de aluno: uma conta de staff
  // que também seja aluno continua indo pro /admin primeiro.
  if (!hasExplicitRedirect && signInData.user) {
    const isStaff = await checkIsStaff(supabase, signInData.user.id);
    if (isStaff) {
      redirect({ href: "/admin", locale });
    }
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
          redirect({ href: `/${course.module}/${matricula.course_id}`, locale });
        }
      }
    }
  }

  redirect({ href: redirectTo, locale });
}
