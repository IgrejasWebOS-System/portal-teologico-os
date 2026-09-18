"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { checkIsStaff } from "@/utils/staff";
import { checkIsProfessor } from "@/utils/professor";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import { resolverGateCompletarCadastro } from "@/utils/completarCadastro";

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

  // Pra onde vai depois de definir a senha — mesmo critério do middleware
  // em /login (checkIsStaff → checkIsProfessor → resolverDestinoPosLogin),
  // senão todo mundo caía em /portal, mesmo quem é professor e devia cair
  // direto na Área do Professor (pedido do Joaquim, 18/09/2026: mutirão de
  // cadastro).
  const isStaff = await checkIsStaff(supabase, user.id);
  const professor = isStaff ? null : await checkIsProfessor(supabase, user.id);
  const gate = isStaff ? null : await resolverGateCompletarCadastro(supabase, user.id, professor);
  const destino = isStaff
    ? "/admin"
    : gate
      ? gate
      : professor
        ? "/professor"
        : await resolverDestinoPosLogin(supabase, user.id);
  redirect(destino);
}
