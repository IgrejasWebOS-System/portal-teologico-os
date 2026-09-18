"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { validarCPF } from "@/utils/cpf";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";

// ============================================================
// Ações do gate "/completar-cadastro" (mutirão de cadastro, 18/09/2026).
// Mesmo padrão de professor/actions.ts: autentica com o client normal,
// resolve a identidade (professor ou aluno) com uma query já filtrada
// por user_id, e só depois grava com o client admin -- nunca confia em
// id vindo do form.
// ============================================================

export type CompletarCadastroResultado = { success: false; message: string } | void;

export async function completarCadastroProfessorAction(formData: FormData): Promise<CompletarCadastroResultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const cpf = (formData.get("cpf") as string)?.trim() || null;
  const cargo = (formData.get("cargo") as string)?.trim() || null;
  const unitId = (formData.get("unit_id") as string) || null;
  const setorUnitId = (formData.get("setor_unit_id") as string) || null;

  if (!telefone) return { success: false, message: "Informe seu telefone." };
  if (!cpf || !validarCPF(cpf)) return { success: false, message: "Informe um CPF válido." };
  if (!cargo) return { success: false, message: "Selecione seu cargo." };
  if (!unitId) return { success: false, message: "Selecione a igreja onde você dá aula." };

  const admin = createAdminClient();

  const { data: igrejaUnit } = await admin.from("units").select("type").eq("id", unitId).maybeSingle();
  const igrejaEhSede = igrejaUnit?.type === "SEDE";
  if (!setorUnitId && !igrejaEhSede) {
    return { success: false, message: "Selecione o Setor/Regional onde você dá aula." };
  }

  const { data: church } = await admin.from("churches").select("id").eq("unit_id", unitId).maybeSingle();
  const church_id = church?.id ?? null;
  let sector_id: string | null = null;
  if (setorUnitId) {
    const { data: sector } = await admin.from("sectors").select("id").eq("unit_id", setorUnitId).maybeSingle();
    sector_id = sector?.id ?? null;
  }

  // Casamento "soft" com o cadastro de membros por CPF, mesmo padrão do
  // autocadastro original -- só enriquece, nunca bloqueia.
  const { data: membro } = await admin.from("members").select("id").eq("cpf", cpf).maybeSingle();
  const memberId = membro?.id ?? null;

  const { error } = await admin
    .from("professores")
    .update({
      telefone,
      cpf,
      cargo,
      unit_id: unitId,
      church_id,
      sector_id,
      member_id: memberId,
      tipo_professor: memberId ? "MEMBRO" : "EXTERNO",
    })
    .eq("id", professor.id);

  if (error) {
    console.error("[completar-cadastro] atualizar professor", error);
    return { success: false, message: "Erro ao salvar seu cadastro. Tente novamente." };
  }

  revalidatePath("/professor");
  redirect("/professor");
}

export async function completarCadastroAlunoAction(formData: FormData): Promise<CompletarCadastroResultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const telefone = (formData.get("telefone") as string)?.trim() || null;
  if (!telefone) return { success: false, message: "Informe seu telefone." };

  const admin = createAdminClient();

  const { data: aluno } = await admin.from("ead_alunos").select("id").eq("user_id", user.id).maybeSingle();
  if (!aluno) redirect("/portal");

  const { error } = await admin.from("ead_alunos").update({ telefone }).eq("id", aluno.id);

  if (error) {
    console.error("[completar-cadastro] atualizar aluno", error);
    return { success: false, message: "Erro ao salvar seu cadastro. Tente novamente." };
  }

  redirect(await resolverDestinoPosLogin(supabase, user.id));
}
