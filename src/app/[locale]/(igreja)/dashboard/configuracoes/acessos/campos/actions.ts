"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LIST_PATH = "/dashboard/configuracoes/acessos/campos";

async function requireGlobalAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (profile?.system_role !== "GLOBAL_ADMIN") {
    redirect(LIST_PATH + "?error=" + encodeURIComponent("Apenas GLOBAL_ADMIN pode gerenciar Campos."));
  }

  return supabase;
}

function fail(message: string): never {
  redirect(LIST_PATH + "?error=" + encodeURIComponent(message));
}

function readCampoForm(formData: FormData) {
  return {
    nomeCampo: ((formData.get("nome_campo") as string) || "").trim(),
    nomeSede: ((formData.get("nome_sede") as string) || "").trim(),
    cep: ((formData.get("cep") as string) || "").trim() || null,
    endereco: ((formData.get("endereco") as string) || "").trim() || null,
    numero: ((formData.get("numero") as string) || "").trim() || null,
    complemento: ((formData.get("complemento") as string) || "").trim() || null,
    bairro: ((formData.get("bairro") as string) || "").trim() || null,
    cidade: ((formData.get("cidade") as string) || "").trim() || null,
    uf: ((formData.get("uf") as string) || "").trim().toUpperCase() || null,
    telefone: ((formData.get("telefone") as string) || "").trim() || null,
    contato: ((formData.get("contato") as string) || "").trim() || null,
    email: ((formData.get("email") as string) || "").trim() || null,
  };
}

// ── Criar Campo + Sede + igreja da Sede, tudo junto ────────────
export async function criarCampoAction(formData: FormData) {
  const supabase = await requireGlobalAdmin();
  const f = readCampoForm(formData);

  if (!f.nomeCampo || !f.nomeSede) {
    fail("Nome do Campo e nome da Sede são obrigatórios.");
  }

  const { data: campo, error: campoError } = await supabase
    .from("units")
    .insert({ type: "CAMPO", name: f.nomeCampo })
    .select("id")
    .single();
  if (campoError || !campo) fail("Erro ao criar o Campo: " + (campoError?.message ?? "desconhecido"));

  const { data: sede, error: sedeError } = await supabase
    .from("units")
    .insert({ type: "SEDE", name: f.nomeSede, parent_id: campo.id, is_headquarters: true })
    .select("id")
    .single();
  if (sedeError || !sede) fail("Erro ao criar a Sede: " + (sedeError?.message ?? "desconhecido"));

  const { data: igreja, error: igrejaError } = await supabase
    .from("churches")
    .insert({
      name: f.nomeSede,
      church_type: "CHURCH",
      is_sede: true,
      is_headquarters: true,
      sector_id: null,
      zip_code: f.cep,
      address: f.endereco,
      address_number: f.numero,
      address_complement: f.complemento,
      neighborhood: f.bairro,
      city: f.cidade,
      state: f.uf,
      church_phone: f.telefone,
      pastor_name: f.contato,
      email: f.email,
      unit_id: sede.id,
    })
    .select("id")
    .single();
  if (igrejaError || !igreja) fail("Campo e Sede criados, mas a igreja da Sede falhou: " + (igrejaError?.message ?? "desconhecido"));

  await supabase.from("units").update({ legacy_church_id: igreja.id }).eq("id", sede.id);

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

// ── Editar Campo + Sede (cria a igreja da Sede agora, se ainda não existir) ──
export async function atualizarCampoAction(formData: FormData) {
  const supabase = await requireGlobalAdmin();
  const f = readCampoForm(formData);

  const campoId = (formData.get("campo_id") as string) || "";
  const sedeId = (formData.get("sede_id") as string) || "";
  const churchId = (formData.get("church_id") as string) || "";

  if (!campoId || !sedeId) fail("Campo inválido.");
  if (!f.nomeCampo || !f.nomeSede) fail("Nome do Campo e nome da Sede são obrigatórios.");

  const { error: campoError } = await supabase.from("units").update({ name: f.nomeCampo }).eq("id", campoId);
  if (campoError) fail("Erro ao atualizar o Campo: " + campoError.message);

  const { error: sedeError } = await supabase.from("units").update({ name: f.nomeSede }).eq("id", sedeId);
  if (sedeError) fail("Erro ao atualizar a Sede: " + sedeError.message);

  const churchPayload = {
    name: f.nomeSede,
    zip_code: f.cep,
    address: f.endereco,
    address_number: f.numero,
    address_complement: f.complemento,
    neighborhood: f.bairro,
    city: f.cidade,
    state: f.uf,
    church_phone: f.telefone,
    pastor_name: f.contato,
    email: f.email,
  };

  if (churchId) {
    const { error } = await supabase.from("churches").update(churchPayload).eq("id", churchId);
    if (error) {
      console.error("[campos/actions]", error);
      fail("Erro ao atualizar a igreja da Sede. Tente novamente.");
    }
  } else {
    // Campo criado direto via SQL (M11), sem igreja da Sede ainda — cria agora.
    const { data: igreja, error } = await supabase
      .from("churches")
      .insert({
        ...churchPayload,
        church_type: "CHURCH",
        is_sede: true,
        is_headquarters: true,
        sector_id: null,
        unit_id: sedeId,
      })
      .select("id")
      .single();
    if (error || !igreja) fail("Erro ao criar a igreja da Sede: " + (error?.message ?? "desconhecido"));
    await supabase.from("units").update({ legacy_church_id: igreja.id }).eq("id", sedeId);
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

// ── Excluir Campo (de baixo pra cima: igreja da Sede → Sede → Campo) ──
export async function deleteCampoAction(campoId: string) {
  const supabase = await requireGlobalAdmin();

  const { data: sede } = await supabase
    .from("units")
    .select("id, legacy_church_id")
    .eq("type", "SEDE")
    .eq("parent_id", campoId)
    .maybeSingle();

  if (sede) {
    const { data: filhos } = await supabase
      .from("units")
      .select("id")
      .eq("parent_id", sede.id)
      .limit(1);

    if (filhos && filhos.length > 0) {
      fail("Não é possível excluir: existem Setores cadastrados nesta Sede. Remova-os primeiro.");
    }

    if (sede.legacy_church_id) {
      const { error: churchDeleteError } = await supabase
        .from("churches")
        .delete()
        .eq("id", sede.legacy_church_id);
      if (churchDeleteError) {
        fail("Não é possível excluir: " + churchDeleteError.message + " (provavelmente há membros ou dados vinculados à igreja da Sede).");
      }
    }

    const { error: sedeDeleteError } = await supabase.from("units").delete().eq("id", sede.id);
    if (sedeDeleteError) fail("Erro ao excluir a Sede: " + sedeDeleteError.message);
  }

  const { error: campoDeleteError } = await supabase.from("units").delete().eq("id", campoId);
  if (campoDeleteError) fail("Erro ao excluir o Campo: " + campoDeleteError.message);

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

export async function deleteCampoFormAction(campoId: string): Promise<void> {
  await deleteCampoAction(campoId);
}
