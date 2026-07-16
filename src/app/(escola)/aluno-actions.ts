"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ============================================================
// Ações do painel "Área do Aluno" (menu lateral retrátil da
// Escola de Teologia) — self-service: o próprio aluno logado
// troca a senha da própria conta. Sem checagem de staff aqui:
// updateUser() já opera só sobre a sessão de quem está logado.
// ============================================================

export async function trocarSenhaAlunoAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  const returnPath = (formData.get("returnPath") as string) || "/escola";

  if (!password || password.length < 6) {
    redirect(`${returnPath}?contaError=` + encodeURIComponent("A senha deve ter no mínimo 6 caracteres."));
  }

  if (password !== confirm) {
    redirect(`${returnPath}?contaError=` + encodeURIComponent("As senhas não coincidem."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`${returnPath}?contaError=` + encodeURIComponent("Não foi possível trocar a senha: " + error.message));
  }

  redirect(`${returnPath}?contaMsg=` + encodeURIComponent("Senha atualizada com sucesso."));
}
