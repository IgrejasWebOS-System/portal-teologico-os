"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Tabelas simples suportadas
type SimpleTable =
  | "ecclesiastical_roles"
  | "settings_professions"
  | "settings_schooling"
  | "settings_civil_status"
  | "settings_gender"
  | "function_roles";

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

  // M10a: cria a unit SETOR junto, pra já nascer com escopo territorial
  // real (sem isso, só GLOBAL_ADMIN/Super-Master enxergariam o setor
  // depois). Só resolve a Sede automaticamente porque hoje existe uma
  // única — se um dia houver mais de uma, isso vai precisar de um
  // seletor de Sede no formulário. Se a criação da unit falhar por
  // qualquer motivo, não bloqueia o cadastro do setor — só fica sem
  // unit_id, do jeito que era antes deste módulo.
  let unitId: string | null = null;
  const { data: sedes } = await supabase.from("units").select("id").eq("type", "SEDE");
  if (sedes && sedes.length === 1) {
    const { data: newUnit } = await supabase
      .from("units")
      .insert({ type: "SETOR", name: name.toUpperCase(), parent_id: sedes[0].id })
      .select("id")
      .single();
    unitId = newUnit?.id ?? null;
  }

  const { error } = await supabase
    .from("sectors")
    .insert({ name: name.toUpperCase(), regiao_id: regiaoId, unit_id: unitId });

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
  email: string | null;
  cargo: string | null;
  church_id: string | null;
  registration_number: string | null;
};

export async function buscarMembroPorMatriculaAction(
  matricula: string
): Promise<{ success: boolean; data?: MembroEncontrado; message?: string }> {
  const mat = matricula.trim();
  if (!mat) return { success: false, message: "Digite uma matrícula." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, phone, email, church_id, registration_number, ecclesiastical_roles(name)")
    .eq("registration_number", mat)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!data) return { success: false, message: "Nenhum membro encontrado com essa matrícula." };

  const row = data as unknown as {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    church_id: string | null;
    registration_number: string | null;
    ecclesiastical_roles: { name: string } | null;
  };

  return {
    success: true,
    data: {
      id: row.id,
      full_name: row.full_name ?? "",
      phone: row.phone,
      email: row.email,
      cargo: row.ecclesiastical_roles?.name ?? null,
      church_id: row.church_id,
      registration_number: row.registration_number,
    },
  };
}

// ── Busca de membro por nome (retorna vários — nome não é único) ──
export async function buscarMembroPorNomeAction(
  nome: string
): Promise<{ success: boolean; data?: MembroEncontrado[]; message?: string }> {
  const termo = nome.trim();
  if (termo.length < 3) return { success: false, message: "Digite pelo menos 3 letras." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, phone, email, church_id, registration_number, ecclesiastical_roles(name)")
    .ilike("full_name", `%${termo}%`)
    .order("full_name")
    .limit(8);

  if (error) return { success: false, message: error.message };
  if (!data || data.length === 0) return { success: false, message: "Nenhum membro encontrado com esse nome." };

  const rows = data as unknown as {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    church_id: string | null;
    registration_number: string | null;
    ecclesiastical_roles: { name: string } | null;
  }[];

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      full_name: row.full_name ?? "",
      phone: row.phone,
      email: row.email,
      cargo: row.ecclesiastical_roles?.name ?? null,
      church_id: row.church_id,
      registration_number: row.registration_number,
    })),
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

// Resolve os IDs legados (sector_id/church_id) a partir dos units
// escolhidos na cascata, para não quebrar telas que ainda leem
// professores.sector_id/church_id diretamente.
async function resolverBridgeUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unitId: string | null,
  setorUnitId: string | null
): Promise<{ church_id: string | null; sector_id: string | null }> {
  let church_id: string | null = null;
  let sector_id: string | null = null;

  if (unitId) {
    const { data: church } = await supabase
      .from("churches")
      .select("id")
      .eq("unit_id", unitId)
      .maybeSingle();
    church_id = church?.id ?? null;
  }
  if (setorUnitId) {
    const { data: sector } = await supabase
      .from("sectors")
      .select("id")
      .eq("unit_id", setorUnitId)
      .maybeSingle();
    sector_id = sector?.id ?? null;
  }
  return { church_id, sector_id };
}

export async function addProfessorAction(formData: FormData) {
  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  if (!nomeCompleto) return { success: false, message: "Nome do professor é obrigatório." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const unitId = (formData.get("unit_id") as string) || null;
  const setorUnitId = (formData.get("setor_unit_id") as string) || null;
  const { church_id, sector_id } = await resolverBridgeUnits(supabase, unitId, setorUnitId);

  const payload = {
    unit_id: unitId,
    sector_id,
    church_id,
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

export async function updateProfessorAction(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  if (!id) return { success: false, message: "ID obrigatório." };

  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  if (!nomeCompleto) return { success: false, message: "Nome do professor é obrigatório." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const unitId = (formData.get("unit_id") as string) || null;
  const setorUnitId = (formData.get("setor_unit_id") as string) || null;
  const { church_id, sector_id } = await resolverBridgeUnits(supabase, unitId, setorUnitId);

  const payload = {
    unit_id: unitId,
    sector_id,
    church_id,
    member_id: (formData.get("member_id") as string) || null,
    matricula: (formData.get("matricula") as string) || null,
    nome_completo: nomeCompleto,
    cargo: (formData.get("cargo") as string) || null,
    telefone: (formData.get("telefone") as string) || null,
  };

  const { error } = await supabase.from("professores").update(payload).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/dashboard/configuracoes/professores");
  return { success: true };
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

// ── Turmas (course_editions) ─────────────────────────────────
// Segue o mesmo padrão redirect-based de admin/patrimonio/actions.ts
// (em vez de retornar {success,message}) porque esta action é usada
// direto em <form action={...}> num Server Component — o tipo do
// action de <form> exige void | Promise<void>, e uma função que só
// termina em redirect() (never) satisfaz isso.
export async function addTurmaConfigAction(formData: FormData) {
  const courseId = (formData.get("course_id") as string) || "";
  const nome = (formData.get("nome") as string)?.trim();
  const dataInicio = (formData.get("data_inicio") as string) || null;
  const dataFim = (formData.get("data_fim") as string) || null;

  if (!courseId || !nome) {
    redirect(
      "/dashboard/configuracoes/persona/turmas?error=" +
        encodeURIComponent("Selecione o curso e informe o nome da turma.")
    );
  }

  const ano = dataInicio ? Number(dataInicio.slice(0, 4)) : new Date().getFullYear();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("course_editions").insert({
    course_id: courseId,
    nome: nome!.toUpperCase(),
    ano,
    data_inicio: dataInicio,
    data_fim: dataFim,
    status: "ABERTA",
  });

  if (error) {
    redirect(
      "/dashboard/configuracoes/persona/turmas?error=" + encodeURIComponent(error.message)
    );
  }

  revalidatePath("/dashboard/configuracoes/persona/turmas");
  redirect(
    "/dashboard/configuracoes/persona/turmas?msg=" +
      encodeURIComponent(`Turma "${nome}" cadastrada.`)
  );
}

export async function updateTurmaConfigAction(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  const courseId = (formData.get("course_id") as string) || "";
  const nome = (formData.get("nome") as string)?.trim();
  const dataInicio = (formData.get("data_inicio") as string) || null;
  const dataFim = (formData.get("data_fim") as string) || null;
  const status = (formData.get("status") as string) || "ABERTA";

  if (!id || !courseId || !nome) {
    redirect(
      "/dashboard/configuracoes/persona/turmas?error=" +
        encodeURIComponent("Selecione o curso e informe o nome da turma.")
    );
  }

  const ano = dataInicio ? Number(dataInicio.slice(0, 4)) : new Date().getFullYear();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("course_editions")
    .update({
      course_id: courseId,
      nome: nome!.toUpperCase(),
      ano,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status,
    })
    .eq("id", id);

  if (error) {
    redirect(
      "/dashboard/configuracoes/persona/turmas?error=" + encodeURIComponent(error.message)
    );
  }

  revalidatePath("/dashboard/configuracoes/persona/turmas");
  redirect(
    "/dashboard/configuracoes/persona/turmas?msg=" +
      encodeURIComponent(`Turma "${nome}" atualizada.`)
  );
}

export async function deleteTurmaAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("course_editions").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  revalidatePath("/dashboard/configuracoes/persona/turmas");
  return { success: true };
}

export async function deleteTurmaFormAction(id: string): Promise<void> {
  await deleteTurmaAction(id);
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

// ── Convite de novo operador (M9 — substitui a senha padrão
//    compartilhada por convite via e-mail do próprio Supabase Auth
//    + admin_roles com nível/unidade real) ─────────────────────
//
// Restrito a GLOBAL_ADMIN por enquanto (mesma regra da RLS de
// admin_roles — ver 059_admin_roles_e_escopo.sql). Usa o cliente
// admin (service_role) porque criar usuário de auth e popular
// admin_roles em nome de outra pessoa legitimamente exige
// privilégio que o usuário comum não tem — a checagem de "quem
// pode convidar" é feita ANTES, aqui embaixo, com o cliente normal.
export async function inviteStaffAction(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const fullName = ((formData.get("full_name") as string) || "").trim();
  const levelRaw = (formData.get("level") as string) || "";
  const unitId = ((formData.get("unit_id") as string) || "").trim() || null;
  const roleTitle = ((formData.get("role_title") as string) || "").trim() || null;

  const level = Number.parseInt(levelRaw, 10);

  if (!email || !email.includes("@")) {
    return { success: false, message: "E-mail inválido." };
  }
  if (Number.isNaN(level) || level < 0 || level > 4) {
    return { success: false, message: "Nível inválido." };
  }
  if (level === 0 && unitId) {
    return { success: false, message: "Super-Master (nível 0) não deve ter unidade selecionada." };
  }
  if (level > 0 && !unitId) {
    return { success: false, message: "Selecione a unidade para esse nível." };
  }

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, message: "Não autenticado." };

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", currentUser.id)
    .single();

  if (meProfile?.system_role !== "GLOBAL_ADMIN") {
    return { success: false, message: "Apenas GLOBAL_ADMIN pode convidar novos operadores." };
  }

  const admin = createAdminClient();

  // Alguém com esse e-mail já pode existir (ex: já é aluno de um curso
  // avulso) — inviteUserByEmail falha nesse caso ("e-mail já cadastrado"),
  // e o cenário certo não é erro, é PROMOVER a conta existente: só
  // adiciona o nível de acesso, sem reenviar convite nem mexer na senha
  // que a pessoa já tem.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let targetUserId: string;
  let promovendoExistente = false;

  if (existingProfile?.id) {
    targetUserId = existingProfile.id;
    promovendoExistente = true;
    if (fullName) {
      await admin.from("profiles").update({ full_name: fullName }).eq("id", targetUserId);
    }
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
    });

    if (inviteError || !invited?.user) {
      return {
        success: false,
        message: inviteError?.message ?? "Não foi possível enviar o convite.",
      };
    }

    targetUserId = invited.user.id;

    // handle_new_user() (trigger em auth.users) já criou a linha em
    // profiles — só completa com nome e a flag de troca de senha.
    await admin
      .from("profiles")
      .update({ full_name: fullName || null, must_change_password: true })
      .eq("id", targetUserId);
  }

  const { error: roleError } = await admin.from("admin_roles").insert({
    user_id: targetUserId,
    level,
    unit_id: level === 0 ? null : unitId,
    role_title: roleTitle,
    invited_by: currentUser.id,
  });

  if (roleError) {
    return {
      success: false,
      message: promovendoExistente
        ? `Falha ao gravar o nível de acesso: ${roleError.message}`
        : `Convite enviado, mas houve um erro ao gravar o nível de acesso: ${roleError.message}`,
    };
  }

  revalidatePath("/dashboard/configuracoes/acessos/usuarios");
  return {
    success: true,
    message: promovendoExistente
      ? `${email} já tinha conta — nível de acesso adicionado.`
      : `Convite enviado para ${email}.`,
  };
}

export async function inviteStaffFormAction(formData: FormData): Promise<void> {
  await inviteStaffAction(formData);
}
