"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Tabelas simples suportadas
type SimpleTable =
  | "ecclesiastical_roles"
  | "settings_professions"
  | "settings_schooling"
  | "settings_civil_status"
  | "settings_gender";

// ── Adicionar item simples ────────────────────────────────────
export async function addSettingItemAction(
  table: SimpleTable,
  formData: FormData
) {
  const name = (formData.get("name") as string)?.trim().toUpperCase();
  if (!name) return { success: false, message: "Nome obrigatório." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase.from(table).insert({ name });
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}

// ── Remover item simples ──────────────────────────────────────
export async function deleteSettingItemAction(
  table: SimpleTable,
  id: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}

// ── Regiões DF ────────────────────────────────────────────────
export async function addRegiaoDFAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, message: "Nome obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings_custom_regions")
    .insert({ name: name.toUpperCase(), state_uf: "DF" });

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/regioes-df");
  return { success: true };
}

export async function deleteRegiaoDFAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings_custom_regions")
    .delete()
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/regioes-df");
  return { success: true };
}

// ── Setores ───────────────────────────────────────────────────
export async function addSetorAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, message: "Nome obrigatório." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("sectors")
    .insert({ name: name.toUpperCase() });

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/setores");
  return { success: true };
}

export async function deleteSetorAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sectors").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/setores");
  return { success: true };
}

// ── Departamentos ─────────────────────────────────────────────
export async function addDepartamentoAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, message: "Nome obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .insert({ name: name.toUpperCase() });

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/departamentos");
  return { success: true };
}

export async function deleteDepartamentoAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/departamentos");
  return { success: true };
}
