"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Funil de contato simples dos Leads da Loja (loja_leads_crm).
// ============================================================

export async function atualizarStatusLeadAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect("/admin/leads-loja?error=" + encodeURIComponent("Acesso restrito à secretaria do CETADP."));
  }

  const leadUserId = formData.get("user_id") as string;
  const status = (formData.get("status") as string) || "NAO_CONTATADO";
  const observacao = (formData.get("observacao") as string)?.trim() || null;

  const { error } = await supabase.from("loja_leads_crm").upsert(
    {
      user_id: leadUserId,
      status,
      observacao,
      atualizado_por: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect("/admin/leads-loja?error=" + encodeURIComponent("Erro ao atualizar lead: " + error.message));
  }

  revalidatePath("/admin/leads-loja");
  redirect("/admin/leads-loja?msg=" + encodeURIComponent("Lead atualizado."));
}
