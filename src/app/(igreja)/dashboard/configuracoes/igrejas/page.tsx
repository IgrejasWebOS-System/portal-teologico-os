import Link from "next/link";
import { Church, Plus, Building2, GitBranch } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";

type ChurchRow = {
  id: string;
  name: string;
  church_type: string | null;
  sector_id: string | null;
  sectors: { name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  CHURCH:    "Igreja",
  SUB:       "Sub-congregação",
  CELL:      "Célula",
};

const TYPE_COLOR: Record<string, string> = {
  CHURCH: "bg-iw-blue/10 text-iw-blue",
  SUB:    "bg-iw-gold/10 text-iw-gold",
  CELL:   "bg-iw-success/10 text-iw-success",
};

export default async function IgrejasPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("churches")
    .select("id, name, church_type, sector_id, sectors(name)")
    .order("name");

  const churches = (data ?? []) as ChurchRow[];

  // Separar por tipo
  const main  = churches.filter((c) => c.church_type === "CHURCH" || !c.church_type);
  const subs  = churches.filter((c) => c.church_type === "SUB");
  const cells = churches.filter((c) => c.church_type === "CELL");

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          icon={Church}
          title="Igrejas"
          description="Congregações, sub-congregações e células"
        />
        <Link
          href="/dashboard/configuracoes/igrejas/nova"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Igreja
        </Link>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Igrejas", count: main.length,  color: "text-iw-blue",    icon: Church },
          { label: "Sub-congregações", count: subs.length,  color: "text-iw-gold",    icon: Building2 },
          { label: "Células",  count: cells.length, color: "text-iw-success", icon: GitBranch },
        ].map(({ label, count, color, icon: Icon }) => (
          <div
            key={label}
            className="bg-iw-surface rounded-2xl border border-iw-border p-4 flex items-center gap-3"
          >
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className="text-xl font-black text-iw-navy">{count}</p>
              <p className="text-xs text-iw-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Tipo</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor</span>
        </div>

        {churches.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Church className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm font-medium">Nenhuma igreja cadastrada.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Clique em &ldquo;Nova Igreja&rdquo; para começar.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {churches.map((church) => {
              const type = church.church_type ?? "CHURCH";
              return (
                <li
                  key={church.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4"
                >
                  <span className="text-sm font-semibold text-iw-navy truncate">
                    {church.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border border-transparent ${TYPE_COLOR[type] ?? "bg-iw-bg text-iw-muted"}`}
                  >
                    {TYPE_LABEL[type] ?? type}
                  </span>
                  <span className="text-xs text-iw-muted truncate max-w-[120px]">
                    {church.sectors?.name ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
