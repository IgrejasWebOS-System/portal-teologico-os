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
  const regiaoId = (formData.get("regiao_id") as string) || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("sectors")
    .insert({ name: name.toUpperCase(), regiao_id: regiaoId });

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

export async function updateSetorRegiaoAction(formData: FormData) {
  const setorId = formData.get("setor_id") as string;
  const regiaoId = (formData.get("regiao_id") as string) || null;
  if (!setorId) return { success: false, message: "Setor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sectors")
    .update({ regiao_id: regiaoId })
    .eq("id", setorId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/setores");
  revalidatePath("/dashboard/configuracoes/regioes");
  return { success: true };
}

// ── Busca de membro por matrícula (autofill nome/cargo/telefone) ─
export type MembroEncontrado = {
  id: string;
  full_name: string;
  phone: string | null;
  cargo: string | null;
  church_id: string | null;
};

export async function buscarMembroPorMatriculaAction(
  matricula: string
): Promise<{ success: boolean; data?: MembroEncontrado; message?: string }> {
  const mat = matricula.trim();
  if (!mat) return { success: false, message: "Digite uma matrícula." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, phone, church_id, ecclesiastical_roles(name)")
    .eq("registration_number", mat)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!data) return { success: false, message: "Nenhum membro encontrado com essa matrícula." };

  const row = data as unknown as {
    id: string;
    full_name: string | null;
    phone: string | null;
    church_id: string | null;
    ecclesiastical_roles: { name: string } | null;
  };

  return {
    success: true,
    data: {
      id: row.id,
      full_name: row.full_name ?? "",
      phone: row.phone,
      cargo: row.ecclesiastical_roles?.name ?? null,
      church_id: row.church_id,
    },
  };
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

// ── Região ────────────────────────────────────────────────────
export async function addRegiaoAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, message: "Nome obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("regioes")
    .insert({ name: name.toUpperCase() });

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/regioes");
  return { success: true };
}

export async function deleteRegiaoAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("regioes").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/regioes");
  return { success: true };
}

export async function vincularSetorRegiaoAction(formData: FormData) {
  return updateSetorRegiaoAction(formData);
}

export async function desvincularSetorRegiaoAction(setorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sectors")
    .update({ regiao_id: null })
    .eq("id", setorId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/setores");
  revalidatePath("/dashboard/configuracoes/regioes");
  return { success: true };
}

// ── Professores ───────────────────────────────────────────────
export async function addProfessorAction(formData: FormData) {
  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  if (!nomeCompleto) return { success: false, message: "Nome do professor é obrigatório." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const payload = {
    sector_id: (formData.get("sector_id") as string) || null,
    church_id: (formData.get("church_id") as string) || null,
    member_id: (formData.get("member_id") as string) || null,
    matricula: (formData.get("matricula") as string) || null,
    nome_completo: nomeCompleto,
    cargo: (formData.get("cargo") as string) || null,
    telefone: (formData.get("telefone") as string) || null,
  };

  const { data, error } = await supabase
    .from("professores")
    .insert(payload)
    .select("id, nome_completo, church_id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/configuracoes/professores");
  return { success: true, data };
}

export async function deleteProfessorAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("professores").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/professores");
  return { success: true };
}

// ── Sedes Regionais ──────────────────────────────────────────
export async function promoverSedeAction(formData: FormData) {
  const churchId = (formData.get("church_id") as string) || "";
  if (!churchId) return { success: false, message: "Selecione uma igreja." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("churches")
    .update({ is_sede: true })
    .eq("id", churchId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/acessos/sedes");
  return { success: true };
}

export async function rebaixarSedeAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("churches")
    .update({ is_sede: false })
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/acessos/sedes");
  return { success: true };
}

export async function rebaixarSedeFormAction(id: string): Promise<void> {
  await rebaixarSedeAction(id);
}

export async function promoverSedeFormAction(formData: FormData): Promise<void> {
  await promoverSedeAction(formData);
}

// ── Líderes de Setor ─────────────────────────────────────────
export async function definirLiderSetorAction(formData: FormData) {
  const setorId = (formData.get("setor_id") as string) || "";
  const churchId = (formData.get("church_id") as string) || "";
  if (!setorId || !churchId) {
    return { success: false, message: "Selecione o setor e a igreja-mãe." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("sectors")
    .update({ mother_church_id: churchId })
    .eq("id", setorId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/acessos/lideres-setor");
  return { success: true };
}

export async function removerLiderSetorAction(setorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sectors")
    .update({ mother_church_id: null })
    .eq("id", setorId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/acessos/lideres-setor");
  return { success: true };
}

export async function removerLiderSetorFormAction(setorId: string): Promise<void> {
  await removerLiderSetorAction(setorId);
}

export async function definirLiderSetorFormAction(formData: FormData): Promise<void> {
  await definirLiderSetorAction(formData);
}

// ── Matriz de Usuários (RBAC) ────────────────────────────────
// Restrito a GLOBAL_ADMIN via RLS (profiles_update_global_admin) — mesmo
// critério do aviso já exibido na tela ("Master e Super Master").
const NIVEIS_VALIDOS = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN", "MEMBER"];

export async function atualizarNivelUsuarioAction(formData: FormData) {
  const userId = (formData.get("user_id") as string) || "";
  const novoNivel = (formData.get("system_role") as string) || "";

  if (!userId || !NIVEIS_VALIDOS.includes(novoNivel)) {
    return { success: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  if (userId === user.id) {
    return { success: false, message: "Você não pode alterar o próprio nível por aqui." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ system_role: novoNivel })
    .eq("id", userId);

  // RLS bloqueia quem não é GLOBAL_ADMIN — o erro do Postgres nesse caso
  // já é claro o suficiente pra repassar como mensagem.
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/configuracoes/acessos/usuarios");
  return { success: true };
}

export async function atualizarNivelUsuarioFormAction(formData: FormData): Promise<void> {
  await atualizarNivelUsuarioAction(formData);
}

// ── Wrappers void — para uso direto em <form action={...}> sem JS
//    (o form action do React/Next exige void | Promise<void>) ──────
export async function deleteProfessorFormAction(id: string): Promise<void> {
  await deleteProfessorAction(id);
}

export async function vincularSetorRegiaoFormAction(formData: FormData): Promise<void> {
  await vincularSetorRegiaoAction(formData);
}

export async function desvincularSetorRegiaoFormAction(id: string): Promise<void> {
  await desvincularSetorRegiaoAction(id);
}
