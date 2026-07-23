import Link from "next/link";
import { ArrowLeft, Users2, Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { definirLiderSetorFormAction, removerLiderSetorFormAction } from "../../actions";

type SectorLeader = {
  id: string;
  name: string;
  mother_church_id: string | null;
  churches: { name: string } | null;
};

export default async function LidereSetorPage() {
  const supabase = await createClient();

  const [sectorsRes, churchesRes] = await Promise.all([
    supabase
      .from("sectors")
      .select("id, name, mother_church_id, churches(name)")
      .order("name"),
    supabase
      .from("churches")
      .select("id, name")
      .eq("church_type", "CHURCH")
      .order("name"),
  ]);

  const sectors = (sectorsRes.data ?? []) as unknown as SectorLeader[];
  const churches = churchesRes.data ?? [];
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
      </div>

      {/* Definir / alterar líder de um setor */}
      <form
        action={definirLiderSetorFormAction}
        className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Setor</label>
          <select
            name="setor_id"
            required
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer"
          >
            <option value="">Selecione um setor...</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.mother_church_id ? ` (líder: ${s.churches?.name ?? "?"})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Igreja-Mãe</label>
          <select
            name="church_id"
            required
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer"
          >
            <option value="">Selecione uma igreja...</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Definir
        </button>
      </form>

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
                <form action={removerLiderSetorFormAction.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs font-semibold text-iw-muted hover:text-iw-error transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-error-bg ml-auto"
                    title="Remover liderança"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </form>
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
