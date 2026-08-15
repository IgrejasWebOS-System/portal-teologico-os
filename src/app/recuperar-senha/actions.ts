"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ============================================================
// Recuperação de senha — sempre redireciona para a mesma tela de
// confirmação genérica, exista ou não uma conta com o e-mail
// informado. Isso evita "user enumeration" (OWASP): um atacante não
// consegue descobrir, por tentativa e erro, quais e-mails têm conta
// no sistema só observando a resposta desta ação.
//
// A única validação que reflete de volta pro usuário é a de FORMATO
// do e-mail (não revela nada sobre existência de conta, só que o
// texto digitado não é um e-mail válido).
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function recuperarSenhaAction(formData: FormData) {
  const email = (formData.get("email") as string || "").trim();

  if (!email || !EMAIL_REGEX.test(email)) {
    redirect(
      "/recuperar-senha?error=" +
        encodeURIComponent("Informe um e-mail válido.")
    );
  }

  const supabase = await createClient();

  // Resultado (erro ou sucesso) é ignorado de propósito — sempre segue
  // pra confirmação genérica, por segurança (ver comentário acima).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  redirect("/recuperar-senha/confirme");
}
