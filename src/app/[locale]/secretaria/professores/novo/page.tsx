import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario } from "@/utils/secretaria";
import NovoProfessorSecretariaClient from "./NovoProfessorSecretariaClient";

export const metadata = { title: "Novo Professor — Área da Secretaria" };

// ============================================================
// /secretaria/professores/novo — Etapa 7 (04/10/2026). Reaproveita o
// MESMO ProfessorForm (e a MESMA addProfessorAction) que o admin usa
// em /dashboard/configuracoes/professores/novo/membro — sem duplicar
// formulário nem action. Único ajuste é o pós-save (ver
// NovoProfessorSecretariaClient).
//
// Limitação conhecida (igual já existe hoje na tela do admin, não é
// regressão introduzida aqui): o seletor de Campo/Setor/Igreja dentro
// do ProfessorForm não é filtrado pelo escopo do secretário — ele
// escolhe de uma cascata com TODAS as unidades do sistema, não só as
// suas. addProfessorAction também não valida escopo (só checkIsStaff).
// Restringir isso exigiria reescrever a cascata de seleção pra
// trabalhar só com o subconjunto de unidades acessíveis — deixado pra
// uma etapa futura, se o Joaquim quiser.
// ============================================================

export default async function NovoProfessorSecretariaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const [{ data: units }, { data: churches }, { data: generos }, { data: estadosCivis }, { data: escolaridades }, { data: profissoes }, { data: cargos }] =
    await Promise.all([
      supabase.from("units").select("id, type, name, parent_id"),
      supabase.from("churches").select("id, unit_id"),
      supabase.from("settings_gender").select("id, name").order("name"),
      supabase.from("settings_civil_status").select("id, name").order("name"),
      supabase.from("settings_schooling").select("id, name").order("name"),
      supabase.from("settings_professions").select("id, name").order("name"),
      supabase.from("ecclesiastical_roles").select("id, name").order("name"),
    ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <GraduationCap className="w-6 h-6 text-iw-gold shrink-0" />
          <h1 className="text-2xl font-black text-black tracking-tight">Novo Professor</h1>
          <p className="text-black text-sm">(por matrícula ou nome) Campo/Setor/Igreja.</p>
        </div>
        <Link
          href="/secretaria/professores"
          className="inline-flex items-center gap-1.5 text-sm uppercase text-iw-gold font-semibold border-[2px] border-iw-gold rounded-lg px-2.5 py-1 bg-black hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          VOLTAR
        </Link>
      </div>

      <NovoProfessorSecretariaClient
        units={units ?? []}
        churches={churches ?? []}
        generos={generos ?? []}
        estadosCivis={estadosCivis ?? []}
        escolaridades={escolaridades ?? []}
        profissoes={profissoes ?? []}
        cargos={cargos ?? []}
      />
    </div>
  );
}
