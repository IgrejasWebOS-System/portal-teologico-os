"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Parser DD/MM/YYYY → YYYY-MM-DD ──────────────────────────
function parseDateBrToIso(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.length !== 10) return null;
  const [day, month, year] = dateStr.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

// ── Helper: inserir entrada na timeline ──────────────────────
async function insertTimeline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    member_id,
    church_id,
    event_type,
    description,
    created_by,
    created_by_name,
  }: {
    member_id: string;
    church_id: string | null;
    event_type: string;
    description: string;
    created_by: string;
    created_by_name: string | null;
  }
) {
  await supabase.from("member_timeline").insert({
    member_id,
    church_id,
    event_type,
    description,
    created_by,
    created_by_name,
    created_at: new Date().toISOString(),
  });
}

// ── AÇÃO 1: ARQUIVAR MEMBRO ──────────────────────────────────
export async function archiveMemberAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return { success: false, message: "ID obrigatório." };

  const { error } = await supabase
    .from("members")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, message: "Erro ao arquivar membro." };

  // Timeline
  const { data: profile } = await supabase
    .from("profiles").select("church_id, full_name").eq("id", user.id).single();
  await insertTimeline(supabase, {
    member_id: id,
    church_id: profile?.church_id ?? null,
    event_type: "ARQUIVAMENTO",
    description: "Membro movido para o arquivo morto.",
    created_by: user.id,
    created_by_name: profile?.full_name ?? null,
  });

  revalidatePath("/dashboard/membros");
  redirect("/dashboard/membros");
}

// ── AÇÃO 2: RESTAURAR MEMBRO ─────────────────────────────────
export async function restoreMemberAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return { success: false, message: "ID obrigatório." };

  const { error } = await supabase
    .from("members")
    .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, message: "Erro ao restaurar membro." };

  // Timeline
  const { data: profile } = await supabase
    .from("profiles").select("church_id, full_name").eq("id", user.id).single();
  await insertTimeline(supabase, {
    member_id: id,
    church_id: profile?.church_id ?? null,
    event_type: "RESTAURAÇÃO",
    description: "Membro restaurado ao rol ativo.",
    created_by: user.id,
    created_by_name: profile?.full_name ?? null,
  });

  revalidatePath("/dashboard/membros");
  redirect("/dashboard/membros");
}

// ── AÇÃO 3: BUSCAR MEMBRO + TIMELINE POR MATRÍCULA ──────────
export async function getMemberByMatriculaAction(matricula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  if (!matricula.trim()) return { success: false, message: "Digite uma matrícula válida." };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(`*, churches(name), ecclesiastical_roles(name)`)
    .eq("registration_number", matricula.trim())
    .single();

  if (memberError || !member) {
    return { success: false, message: "Matrícula não encontrada." };
  }

  const { data: timeline } = await supabase
    .from("member_timeline")
    .select("*")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  return {
    success: true,
    data: {
      profile: {
        ...member,
        church_name: (member.churches as any)?.name ?? "—",
        role_name: (member.ecclesiastical_roles as any)?.name ?? "—",
      },
      timeline: timeline ?? [],
    },
  };
}

// ── AÇÃO 3b: BUSCAR TIMELINE POR MEMBER_ID ──────────────────
export async function fetchTimelineAction(memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: [] };

  const { data: timeline } = await supabase
    .from("member_timeline")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  return { success: true, data: timeline ?? [] };
}

// ── AÇÃO 3c: ADICIONAR ENTRADA NA TIMELINE ───────────────────
export async function addTimelineEntryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };

  const member_id   = formData.get("member_id") as string;
  const event_type  = (formData.get("event_type") as string) || "OCORRÊNCIA";
  const description = formData.get("description") as string;

  if (!member_id || !description?.trim()) {
    return { success: false, message: "Campos obrigatórios ausentes." };
  }

  const { data: profile } = await supabase
    .from("profiles").select("church_id, full_name").eq("id", user.id).single();

  const { error } = await supabase.from("member_timeline").insert({
    member_id,
    church_id: profile?.church_id ?? null,
    event_type,
    description: description.trim(),
    created_by: user.id,
    created_by_name: profile?.full_name ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) return { success: false, message: "Erro ao salvar ocorrência." };
  return { success: true };
}

// ── AÇÃO 3d: PRÓXIMA MATRÍCULA (callable do client) ─────────
export async function getNextRegistrationNumberAction(isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, data: null };

  const { data, error } = await supabase.rpc("get_next_matricula", {
    is_active: isActive,
  });

  if (error || !data) return { success: false, data: null };
  return { success: true, data: data as string };
}

// ── AÇÃO 4: CRIAR NOVO MEMBRO ────────────────────────────────
export async function createMemberAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = formData.get("full_name") as string;
  if (!full_name) return { success: false, message: "Nome é obrigatório." };

  // Lê church_id do perfil do usuário logado
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("church_id, full_name")
    .eq("id", user.id)
    .single();

  const church_id = (formData.get("church_id") as string) || userProfile?.church_id;
  if (!church_id) return { success: false, message: "Igreja não identificada. Configure seu perfil." };

  const cpf = formData.get("cpf") as string;
  if (cpf?.trim()) {
    const { data: cpfExists } = await supabase
      .from("members").select("id").eq("cpf", cpf).single();
    if (cpfExists) return { success: false, message: "CPF já cadastrado no sistema." };
  }

  const ecclesiastical_status = (formData.get("ecclesiastical_status") as string) || "ACTIVE";
  let registration_number = formData.get("registration_number") as string;

  if (!registration_number?.trim()) {
    const { data: nextMat } = await supabase.rpc("get_next_matricula", {
      is_active: ecclesiastical_status === "ACTIVE",
    });
    registration_number = nextMat;
  } else {
    const { data: matExists } = await supabase
      .from("members").select("id").eq("registration_number", registration_number).single();
    if (matExists) return { success: false, message: `Matrícula ${registration_number} já em uso.` };
  }

  const { data: newMember, error } = await supabase.from("members").insert({
    church_id,
    full_name,
    birth_date:          parseDateBrToIso(formData.get("birth_date") as string),
    gender:              formData.get("gender") as string,
    civil_status:        formData.get("civil_status") as string,
    profession:          formData.get("profession") as string,
    photo_url:           formData.get("photo_url") as string,
    email:               formData.get("email") as string,
    phone:               formData.get("phone") as string,
    nationality_city:    formData.get("nationality_city") as string,
    nationality_state:   formData.get("nationality_state") as string,
    schooling:           formData.get("schooling") as string,
    origin_church:       formData.get("origin_church") as string,
    cpf:                 formData.get("cpf") as string,
    rg:                  formData.get("rg") as string,
    rg_issuer:           formData.get("rg_issuer") as string,
    rg_state:            formData.get("rg_state") as string,
    role_id:             (formData.get("role_id") as string) || null,
    ecclesiastical_status,
    registration_number,
    baptism_date:        parseDateBrToIso(formData.get("baptism_date") as string),
    spouse_name:         formData.get("spouse_name") as string,
    father_name:         formData.get("father_name") as string,
    mother_name:         formData.get("mother_name") as string,
    marriage_date:       parseDateBrToIso(formData.get("marriage_date") as string),
    zip_code:            formData.get("zip_code") as string,
    address:             formData.get("address") as string,
    number:              formData.get("number") as string,
    neighborhood:        formData.get("neighborhood") as string,
    city:                formData.get("city") as string,
    state:               formData.get("state") as string,
    financial_status:    (formData.get("financial_status") as string) || "PENDING",
    status:              "ACTIVE",
    created_at:          new Date().toISOString(),
  }).select("id").single();

  if (error) {
    if (error.code === "23505") return { success: false, message: "Matrícula ou CPF já existem." };
    return { success: false, message: "Erro ao cadastrar membro." };
  }

  // Inserir entrada inicial na timeline
  if (newMember) {
    await insertTimeline(supabase, {
      member_id: newMember.id,
      church_id,
      event_type: "CRIAÇÃO",
      description: "Ficha cadastral criada no sistema.",
      created_by: user.id,
      created_by_name: userProfile?.full_name ?? null,
    });
  }

  revalidatePath("/dashboard/membros");
  redirect("/dashboard/membros");
}

// ── AÇÃO 5: ATUALIZAR MEMBRO ─────────────────────────────────
export async function updateMemberAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  if (!id) return { success: false, message: "ID obrigatório." };

  const cpf = formData.get("cpf") as string;
  if (cpf?.trim()) {
    const { data: cpfExists } = await supabase
      .from("members").select("id").eq("cpf", cpf).neq("id", id).single();
    if (cpfExists) return { success: false, message: "CPF já pertence a outro membro." };
  }

  const ecclesiastical_status = formData.get("ecclesiastical_status") as string;
  let registration_number = formData.get("registration_number") as string;

  if (!registration_number?.trim()) {
    const { data: nextMat } = await supabase.rpc("get_next_matricula", {
      is_active: ecclesiastical_status === "ACTIVE",
    });
    if (nextMat) registration_number = nextMat;
  } else {
    const { data: matExists } = await supabase
      .from("members").select("id").eq("registration_number", registration_number).neq("id", id).single();
    if (matExists) return { success: false, message: `Matrícula ${registration_number} já em uso.` };
  }

  const { error } = await supabase
    .from("members")
    .update({
      full_name:           formData.get("full_name") as string,
      birth_date:          parseDateBrToIso(formData.get("birth_date") as string),
      gender:              formData.get("gender") as string,
      civil_status:        formData.get("civil_status") as string,
      profession:          formData.get("profession") as string,
      photo_url:           formData.get("photo_url") as string,
      email:               formData.get("email") as string,
      phone:               formData.get("phone") as string,
      nationality_city:    formData.get("nationality_city") as string,
      nationality_state:   formData.get("nationality_state") as string,
      schooling:           formData.get("schooling") as string,
      origin_church:       formData.get("origin_church") as string,
      cpf:                 formData.get("cpf") as string,
      rg:                  formData.get("rg") as string,
      rg_issuer:           formData.get("rg_issuer") as string,
      rg_state:            formData.get("rg_state") as string,
      role_id:             (formData.get("role_id") as string) || null,
      church_id:           (formData.get("church_id") as string) || null,
      ecclesiastical_status,
      registration_number,
      baptism_date:        parseDateBrToIso(formData.get("baptism_date") as string),
      spouse_name:         formData.get("spouse_name") as string,
      father_name:         formData.get("father_name") as string,
      mother_name:         formData.get("mother_name") as string,
      marriage_date:       parseDateBrToIso(formData.get("marriage_date") as string),
      zip_code:            formData.get("zip_code") as string,
      address:             formData.get("address") as string,
      number:              formData.get("number") as string,
      neighborhood:        formData.get("neighborhood") as string,
      city:                formData.get("city") as string,
      state:               formData.get("state") as string,
      financial_status:    formData.get("financial_status") as string,
      updated_at:          new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { success: false, message: "Matrícula ou CPF já existem." };
    return { success: false, message: "Erro ao atualizar membro." };
  }

  // Inserir entrada de atualização na timeline
  const { data: userProfile } = await supabase
    .from("profiles").select("church_id, full_name").eq("id", user.id).single();
  await insertTimeline(supabase, {
    member_id: id,
    church_id: userProfile?.church_id ?? null,
    event_type: "ATUALIZAÇÃO",
    description: "Ficha cadastral atualizada.",
    created_by: user.id,
    created_by_name: userProfile?.full_name ?? null,
  });

  revalidatePath("/dashboard/membros");
  redirect("/dashboard/membros");
}
