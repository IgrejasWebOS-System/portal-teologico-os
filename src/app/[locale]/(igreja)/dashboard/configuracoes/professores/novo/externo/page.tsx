import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import ProfessorForm from "../../ProfessorForm";

export default async function NovoProfessorExternoPage() {
  const supabase = await createClient();

  const [{ data: units }, { data: churches }, { data: generos }, { data: estadosCivis }, { data: escolaridades }, { data: profissoes }, { data: cargos }] = await Promise.all([
    supabase.from("units").select("id, type, name, parent_id"),
    supabase.from("churches").select("id, unit_id"),
    supabase.from("settings_gender").select("id, name").order("name"),
    supabase.from("settings_civil_status").select("id, name").order("name"),
    supabase.from("settings_schooling").select("id, name").order("name"),
    supabase.from("settings_professions").select("id, name").order("name"),
    supabase.from("ecclesiastical_roles").select("id, name").order("name"),
  ]);

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <GraduationCap className="w-6 h-6 text-iw-gold shrink-0" />
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Novo Professor — de fora</h1>
          <p className="text-iw-muted text-sm">Professor sem cadastro de membro nesta igreja — ficha completa preenchida manualmente.</p>
        </div>
        <Link
          href="/dashboard/configuracoes/professores/novo/membro"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          VOLTAR
        </Link>
      </div>

      <ProfessorForm
        units={units ?? []}
        churches={churches ?? []}
        generos={generos ?? []}
        estadosCivis={estadosCivis ?? []}
        escolaridades={escolaridades ?? []}
        profissoes={profissoes ?? []}
        cargos={cargos ?? []}
        mostrarBusca={false}
      />
    </div>
  );
}
