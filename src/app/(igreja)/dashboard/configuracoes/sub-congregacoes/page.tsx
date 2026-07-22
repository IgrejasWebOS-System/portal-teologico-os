import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";

type Row = {
  id: string;
  name: string;
  pastor_name: string | null;
  pastor_role: string | null;
  pastor_phone: string | null;
  sectors: { name: string } | null;
  parent: { name: string } | null;
};

export default async function SubCongregacoesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("churches")
    .select("id, name, pastor_name, pastor_role, pastor_phone, sectors(name), parent:parent_id(name)")
    .eq("church_type", "SUB")
    .order("name");

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          icon={Building2}
          title="Sub-congregações"
          description="Congregações vinculadas a uma igreja-mãe"
          iconColor="text-iw-gold"
          iconBg="bg-iw-gold/10"
        />
        <Link
          href="/dashboard/configuracoes/sub-congregacoes/nova"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Sub-congregação
        </Link>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja / Setor</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Responsável</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building2 className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm font-medium">Nenhuma sub-congregação cadastrada.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Clique em &ldquo;Nova Sub-congregação&rdquo; para começar.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                <span className="text-sm font-semibold text-iw-navy truncate">{r.name}</span>
                <span className="text-xs text-iw-muted truncate">
                  {r.parent?.name ?? "—"} {r.sectors?.name ? `· ${r.sectors.name}` : ""}
                </span>
                <span className="text-xs text-iw-navy truncate">
                  {r.pastor_name ?? "—"}
                  {r.pastor_role && <span className="text-iw-muted"> ({r.pastor_role})</span>}
                </span>
                <span className="text-xs text-iw-muted truncate">{r.pastor_phone ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
