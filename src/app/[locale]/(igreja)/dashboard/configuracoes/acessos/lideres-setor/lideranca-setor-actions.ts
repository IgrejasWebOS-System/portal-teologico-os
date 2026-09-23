"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Liderança de Setor (escopo SETOR em member_functions) — 23/09/2026,
// pedido do Joaquim: gerenciar direto na tela de Líderes de Setor quem
// representa o setor inteiro num departamento/papel (ex.: "Líder de
// Jovens do Setor 001"), sem precisar abrir a ficha de cada membro.
//
// A mesma pessoa pode ter uma linha com escopo IGREJA (na própria
// congregação) e outra com escopo SETOR (representando o setor) — são
// registros independentes em member_functions, nenhum duplica o outro.
// Reaproveita a mesma tabela/regra de RLS já usada em
// membros/editar/[id]/funcoes-actions.ts, só que sempre com
// escopo="SETOR" e redirecionando de volta pra esta tela.
// ============================================================

const VOLTAR = "/dashboard/configuracoes/acessos/lideres-setor";

export async function addSetorFunctionAction(formData: FormData) {
  const memberId = (formData.get("member_id") as string) || "";
  const departmentId = (formData.get("department_id") as string) || "";
  const functionRoleId = (formData.get("function_role_id") as string) || "";
  const sectorId = (formData.get("sector_id") as string) || "";
  const voltar = `${VOLTAR}?setor=${sectorId}`;

  if (!memberId || !departmentId || !functionRoleId || !sectorId) {
    redirect(voltar + "&error=" + encodeURIComponent("Selecione o setor, o membro, o departamento e o papel."));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("member_functions").insert({
    member_id: memberId,
    department_id: departmentId,
    function_role_id: functionRoleId,
    escopo: "SETOR",
    sector_id: sectorId,
    church_id: null,
  });

  if (error) {
    console.error("[lideranca-setor-actions]", error);
    redirect(voltar + "&error=" + encodeURIComponent("Erro ao salvar. Tente novamente."));
  }

  revalidatePath(VOLTAR);
  redirect(voltar + "&msg=" + encodeURIComponent("Liderança de setor adicionada."));
}

export async function removeSetorFunctionFormAction(id: string, sectorId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("member_functions").delete().eq("id", id);
  if (error) console.error("[lideranca-setor-actions]", error);
  revalidatePath(`${VOLTAR}?setor=${sectorId}`);
}
