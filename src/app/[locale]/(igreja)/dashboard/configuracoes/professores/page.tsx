import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import ProfessoresListClient from "./ProfessoresListClient";

type Row = {
  id: string;
  nome_completo: string;
  cargo: string | null;
  telefone: string | null;
  veio_de_fora: boolean;
  matricula: string | null;
  sector_id: string | null;
  sectors: { name: string } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

export default async function ProfessoresPage() {
  const supabase = await createClient();

  const [{ data }, { data: setores }] = await Promise.all([
    supabase
      .from("professores")
      .select(
        "id, nome_completo, cargo, telefone, veio_de_fora, matricula, sector_id, sectors(name), churches(name, is_sede)"
      )
      .order("nome_completo"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={GraduationCap}
        title="Professores"
        description="Membros responsáveis por turmas, por setor e igreja"
        iconColor="text-iw-gold"
        iconBg="bg-iw-gold/10"
        backHref="/dashboard/configuracoes/persona"
        backNovoPadrao
        actions={
          <Link
            href="/dashboard/configuracoes/professores/novo/membro"
            className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Professor
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <GraduationCap className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Nenhum professor cadastrado.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Clique em &ldquo;Novo Professor&rdquo; para começar.
          </p>
        </div>
      ) : (
        <ProfessoresListClient rows={rows} setores={setores ?? []} />
      )}
    </div>
  );
}
