import Link from "next/link";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import { deleteProfessorFormAction } from "../actions";

type Row = {
  id: string;
  nome_completo: string;
  cargo: string | null;
  telefone: string | null;
  sectors: { name: string } | null;
  churches: { name: string } | null;
};

export default async function ProfessoresPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("professores")
    .select("id, nome_completo, cargo, telefone, sectors(name), churches(name)")
    .order("nome_completo");

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          icon={GraduationCap}
          title="Professores"
          description="Membros responsáveis por turmas, por setor e igreja"
          iconColor="text-iw-gold"
          iconBg="bg-iw-gold/10"
        />
        <Link
          href="/dashboard/configuracoes/professores/novo"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Professor
        </Link>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Cargo</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja / Setor</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <GraduationCap className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm font-medium">Nenhum professor cadastrado.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Clique em &ldquo;Novo Professor&rdquo; para começar.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                <span className="text-sm font-semibold text-iw-navy truncate">{r.nome_completo}</span>
                <span className="text-xs text-iw-muted truncate">{r.cargo ?? "—"}</span>
                <span className="text-xs text-iw-muted truncate">
                  {r.churches?.name ?? "—"} {r.sectors?.name ? `· ${r.sectors.name}` : ""}
                </span>
                <span className="text-xs text-iw-muted truncate">{r.telefone ?? "—"}</span>
                <form action={deleteProfessorFormAction.bind(null, r.id)}>
                  <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
