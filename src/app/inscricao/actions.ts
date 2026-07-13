"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ============================================================
// Inscrição pública no Portal EAD do CETADP
// Não exige login (RLS permite INSERT para "anon"). O pedido
// fica com status PENDENTE até a secretaria aprovar em
// /admin/inscricoes, quando então a matrícula é gerada.
// ============================================================

export async function submitInscricaoAction(formData: FormData) {
  const nome_completo    = (formData.get("nome_completo") as string)?.trim();
  const cpf              = (formData.get("cpf") as string)?.trim();
  const email            = (formData.get("email") as string)?.trim();
  const telefone         = (formData.get("telefone") as string)?.trim();
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const curso_pretendido = formData.get("curso_pretendido") as string;
  const mensagem         = (formData.get("mensagem") as string)?.trim();

  if (!nome_completo || !email || !curso_pretendido) {
    redirect(
      "/inscricao?error=" +
        encodeURIComponent("Preencha nome, e-mail e o curso pretendido.")
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.from("ead_inscricoes").insert({
    nome_completo,
    cpf: cpf || null,
    email,
    telefone: telefone || null,
    campo_ministerio_id: campo_ministerio_id || null,
    curso_pretendido,
    mensagem: mensagem || null,
    status: "PENDENTE",
  });

  if (error) {
    redirect(
      "/inscricao?error=" +
        encodeURIComponent("Não foi possível enviar sua inscrição. Tente novamente.")
    );
  }

  redirect("/inscricao/obrigado");
}
