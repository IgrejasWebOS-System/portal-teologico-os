import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import ProfessorForm from "../../ProfessorForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProfessorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: professor }, unitsRes, churchesRes] = await Promise.all([
    supabase
      .from("professores")
      .select("id, unit_id, member_id, matricula, nome_completo, cargo, telefone")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("units").select("id, type, name, parent_id"),
    supabase.from("churches").select("id, unit_id"),
  ]);

  if (!professor) notFound();

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <GraduationCap className="w-6 h-6 text-iw-gold shrink-0" />
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Editar Professor</h1>
          <p className="text-iw-muted text-sm">{professor.nome_completo}</p>
        </div>
        <Link
          href="/dashboard/configuracoes/professores"
          className="shrink-0 px-5 py-2.5 rounded-xl bg-iw-blue text-white text-sm font-bold uppercase tracking-wider hover:bg-iw-navy transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <ProfessorForm
        units={unitsRes.data ?? []}
        churches={churchesRes.data ?? []}
        submitLabel="Salvar alterações"
        existing={{
          id: professor.id,
          unitId: professor.unit_id,
          memberId: professor.member_id,
          matricula: professor.matricula,
          nome: professor.nome_completo,
          cargo: professor.cargo,
          telefone: professor.telefone,
        }}
      />
    </div>
  );
}
