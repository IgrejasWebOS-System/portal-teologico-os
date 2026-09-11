import Link from "next/link";
import { Church, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import CongregacoesListClient, { type CongregacaoRow } from "../CongregacoesListClient";

export default async function IgrejasPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: sectorsData }] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, church_type, sector_id, pastor_name, pastor_role, pastor_phone")
      .order("name"),
    supabase.from("sectors").select("id, name, categoria"),
  ]);

  if (error) {
    console.error("[igrejas/page]", error);
  }

  const setores = sectorsData ?? [];
  const nomeSetor = new Map(setores.map((s) => [s.id as string, s.name as string]));

  const all = data ?? [];
  const main = all.filter((c) => c.church_type === "CHURCH" || !c.church_type);

  const rows: CongregacaoRow[] = main.map((c) => ({
    id: c.id,
    name: c.name,
    pastor_name: c.pastor_name,
    pastor_role: c.pastor_role,
    pastor_phone: c.pastor_phone,
    sector_id: c.sector_id,
    sector_name: c.sector_id ? nomeSetor.get(c.sector_id) ?? "—" : null,
    parent_name: null,
  }));

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

      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          Erro ao carregar as igrejas: {error.message}
        </div>
      )}

      <CongregacoesListClient
        rows={rows}
        setores={setores}
        editBasePath="/dashboard/configuracoes/igrejas"
        emptyIcon={<Church className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />}
        emptyTitle="Nenhuma igreja cadastrada."
        emptyHint='Clique em "Nova Igreja" para começar.'
        allChurches={all.map((c) => ({ church_type: c.church_type, sector_id: c.sector_id }))}
      />
    </div>
  );
}
