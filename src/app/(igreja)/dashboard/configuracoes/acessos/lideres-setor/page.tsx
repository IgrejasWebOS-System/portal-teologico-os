import Link from "next/link";
import { ArrowLeft, Users2, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

type SectorLeader = {
  id: string;
  name: string;
  mother_church_id: string | null;
  churches: { name: string } | null;
};

export default async function LidereSetorPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sectors")
    .select("id, name, mother_church_id, churches(name)")
    .order("name");

  const sectors = (data ?? []) as unknown as SectorLeader[];
  const withLeader    = sectors.filter((s) => s.mother_church_id);
  const withoutLeader = sectors.filter((s) => !s.mother_church_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/configuracoes/acessos"
            className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-iw-success/10 flex items-center justify-center shrink-0">
              <Users2 className="w-5 h-5 text-iw-success" />
            </div>
            <div>
              <h1 className="text-xl font-black text-iw-navy tracking-tight">Líderes de Setor</h1>
              <p className="text-iw-muted text-xs mt-0.5">Defina a Igreja-Mãe responsável por cada setor</p>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Definir Líder de Setor
        </button>
      </div>

      {withLeader.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja-Mãe</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
          </div>
          <ul className="divide-y divide-iw-border">
            {withLeader.map((s) => (
              <li key={s.id} className="grid grid-cols-[1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 gap-4">
                <span className="text-sm font-semibold text-iw-navy">{s.name}</span>
                <span className="text-sm text-iw-muted">{s.churches?.name ?? "—"}</span>
                <button className="text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8">
                  Alterar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withoutLeader.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-warning/30 overflow-hidden shadow-sm">
          <div className="px-5 py-2.5 bg-iw-warning-bg border-b border-iw-warning/20">
            <span className="text-xs font-bold text-iw-warning uppercase tracking-wider">
              Setores sem líder definido ({withoutLeader.length})
            </span>
          </div>
          <ul className="divide-y divide-iw-border">
            {withoutLeader.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-iw-bg/50">
                <span className="text-sm font-semibold text-iw-navy">{s.name}</span>
                <button className="text-xs font-semibold text-iw-gold hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-warning-bg">
                  Definir Líder
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sectors.length === 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border px-5 py-12 text-center shadow-sm">
          <Users2 className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhuma liderança definida.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Cadastre setores primeiro em Configurações → Setores.
          </p>
        </div>
      )}
    </div>
  );
}
