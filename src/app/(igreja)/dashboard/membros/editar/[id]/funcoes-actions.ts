"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Funções (papel operacional que o membro exerce numa área/
// departamento, num escopo de Igreja local ou Setor inteiro).
// Distinto de Cargo (posição eclesiástica única, members.role_id).
// Escrita protegida por RLS (member_functions_write_staff) — não
// precisa checar staff aqui, o erro do Postgres já é claro o
// suficiente caso um não-staff tente inserir.
// ============================================================

export async function addMemberFunctionAction(formData: FormData) {
  const memberId = (formData.get("member_id") as string) || "";
  const departmentId = (formData.get("department_id") as string) || "";
  const functionRoleId = (formData.get("function_role_id") as string) || "";
  const escopo = (formData.get("escopo") as string) || "";
  const churchId = (formData.get("church_id") as string) || "";
  const sectorId = (formData.get("sector_id") as string) || "";

  const voltar = `/dashboard/membros/editar/${memberId}`;

  if (!memberId) redirect("/dashboard/membros");

  if (!departmentId || !functionRoleId || (escopo !== "IGREJA" && escopo !== "SETOR")) {
    redirect(voltar + "?error=" + encodeURIComponent("Selecione departamento, papel e escopo."));
  }
  if (escopo === "IGREJA" && !churchId) {
    redirect(voltar + "?error=" + encodeURIComponent("Igreja do membro não identificada."));
  }
  if (escopo === "SETOR" && !sectorId) {
    redirect(voltar + "?error=" + encodeURIComponent("Selecione o setor."));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("member_functions").insert({
    member_id: memberId,
    department_id: departmentId,
    function_role_id: functionRoleId,
    escopo,
    church_id: escopo === "IGREJA" ? churchId : null,
    sector_id: escopo === "SETOR" ? sectorId : null,
  });

  if (error) {
    redirect(voltar + "?error=" + encodeURIComponent(error.message));
  }

  revalidatePath(voltar);
  redirect(voltar + "?msg=" + encodeURIComponent("Função adicionada."));
}

export async function deleteMemberFunctionAction(id: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("member_functions").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath(`/dashboard/membros/editar/${memberId}`);
  return { success: true };
}

export async function deleteMemberFunctionFormAction(id: string, memberId: string): Promise<void> {
  await deleteMemberFunctionAction(id, memberId);
}
