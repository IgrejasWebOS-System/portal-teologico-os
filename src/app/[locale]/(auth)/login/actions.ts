"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { checkIsProfessor } from "@/utils/professor";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import { resolverGateCompletarCadastro } from "@/utils/completarCadastro";
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

  if (signInData.user) {
    const isStaff = await checkIsStaff(supabase, signInData.user.id);
    const professor = isStaff ? null : await checkIsProfessor(supabase, signInData.user.id);

    // Gate "ficha incompleta" (mutirão de cadastro, 18/09/2026) — sempre
    // prioritário, mesmo com redirectTo explícito: sem os dados
    // obrigatórios, a área administrativa/portal não tem base confiável
    // pra abrir de qualquer jeito.
    const gate = await resolverGateCompletarCadastro(supabase, signInData.user.id, professor);
    if (gate) {
      redirect({ href: gate, locale });
    }

    if (!hasExplicitRedirect) {
      // Staff (secretaria/admin) cai direto no painel administrativo — é
      // o núcleo de trabalho deles, não o hub do aluno. Checado antes de
      // qualquer coisa de aluno: uma conta de staff que também seja aluno
      // continua indo pro /admin primeiro.
      if (isStaff) {
        redirect({ href: "/admin", locale });
      }

      // Professor com login vinculado (Módulo 1, professores.user_id) cai
      // direto na área dele — antes de checar aluno oficial, já que uma
      // mesma pessoa não deveria ser as duas coisas, mas a ordem aqui
      // prioriza o papel de professor.
      if (professor) {
        redirect({ href: "/professor", locale });
      }

      // Todo aluno oficial com matrícula em andamento cai direto na
      // própria sala de aula, sem passar pelo /portal (regra em
      // utils/aluno/destino.ts, compartilhada com o proxy.ts).
      const destino = await resolverDestinoPosLogin(supabase, signInData.user.id);
      if (destino !== "/portal") {
        redirect({ href: destino, locale });
      }
    }
  }

  redirect({ href: redirectTo, locale });
}
