"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectToRaw = formData.get("redirectTo") as string | null;
  // Só aceita caminhos internos (evita open redirect via query string).
  const redirectTo =
    redirectToRaw && redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//")
      ? redirectToRaw
      : "/portal";

  if (!email || !password) {
    redirect(
      "/login?error=Preencha email e senha&redirectTo=" + encodeURIComponent(redirectTo)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent(error.message) +
        "&redirectTo=" +
        encodeURIComponent(redirectTo)
    );
  }

  redirect(redirectTo);
}
