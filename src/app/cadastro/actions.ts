"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ============================================================
// cadastroAction — cadastro público autosserviço, para pessoas
// de fora do ministério que querem comprar/matricular em cursos
// avulsos e material da biblioteca. Diferente do fluxo de
// /inscricao (que passa pela aprovação da secretaria), aqui a
// conta é criada na hora — o acesso ao conteúdo pago é liberado
// só depois da confirmação do pagamento (Mercado Pago), não daqui.
//
// O perfil criado pelo trigger handle_new_user() já nasce com
// system_role = 'MEMBER' (não-staff) — ver migração 012.
// ============================================================

export async function cadastroAction(formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const senha = formData.get("senha") as string;
  const confirmar = formData.get("confirmar") as string;
  const redirectToRaw = formData.get("redirectTo") as string | null;
  // Só aceita caminhos internos (evita open redirect via query string).
  const redirectTo =
    redirectToRaw && redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//")
      ? redirectToRaw
      : "/portal";

  if (!nome || !email || !senha || !confirmar) {
    redirect("/cadastro?error=" + encodeURIComponent("Preencha todos os campos."));
  }

  if (senha.length < 6) {
    redirect("/cadastro?error=" + encodeURIComponent("A senha precisa ter pelo menos 6 caracteres."));
  }

  if (senha !== confirmar) {
    redirect("/cadastro?error=" + encodeURIComponent("As senhas não coincidem."));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { full_name: nome },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    redirect("/cadastro?error=" + encodeURIComponent(error.message));
  }

  redirect("/cadastro/confirme-email");
}
