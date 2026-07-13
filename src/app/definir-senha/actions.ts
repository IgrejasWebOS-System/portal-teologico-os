"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function definirSenhaAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) {
    redirect(
      "/definir-senha?error=" +
        encodeURIComponent("A senha deve ter no mínimo 6 caracteres.")
    );
  }

  if (password !== confirm) {
    redirect(
      "/definir-senha?error=" + encodeURIComponent("As senhas não coincidem.")
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só chega aqui com sessão válida quem veio do link de convite/recuperação
  // (estabelecida em /auth/callback). Sem sessão, não há o que atualizar.
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      "/definir-senha?error=" +
        encodeURIComponent("Não foi possível definir a senha: " + error.message)
    );
  }

  redirect("/portal");
}
