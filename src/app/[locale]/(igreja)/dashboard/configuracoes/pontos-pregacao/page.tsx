import { MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import CongregacoesListClient, { type CongregacaoRow } from "../CongregacoesListClient";
import { carregarEscopoConfiguracoes } from "../accessoScope";
import ImportarMembrosLinks from "../ImportarMembrosLinks";

export default async function PontosPregacaoPage() {
  const supabase = await createClient();
  const { escopo } = await carregarEscopoConfiguracoes(supabase);

  const [{ data, error }, { data: sectorsData }, { data: churchesData }] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, pastor_name, pastor_role, pastor_phone, sector_id, parent_id, unit_id")
      .eq("church_type", "PONTO")
      .order("name"),
    supabase.from("sectors").select("id, name, categoria, unit_id"),
    supabase.from("churches").select("id, name, church_type, sector_id, unit_id"),
  ]);

  if (error) {
    console.error("[pontos-pregacao/page]", error);
  }

  const setores = (sectorsData ?? []).filter((s) => !escopo || (s.unit_id && escopo.has(s.unit_id)));
  const nomeSetor = new Map(setores.map((s) => [s.id as string, s.name as string]));
  const nomeIgreja = new Map((churchesData ?? []).map((c) => [c.id as string, c.name as string]));

  const linhasNoEscopo = (data ?? []).filter((r) => !escopo || (r.unit_id && escopo.has(r.unit_id)));
  const rows: CongregacaoRow[] = linhasNoEscopo.map((r) => ({
    id: r.id,
    name: r.name,
    pastor_name: r.pastor_name,
    pastor_role: r.pastor_role,
    pastor_phone: r.pastor_phone,
    sector_id: r.sector_id,
    sector_name: r.sector_id ? nomeSetor.get(r.sector_id) ?? "—" : null,
    parent_name: r.parent_id ? nomeIgreja.get(r.parent_id) ?? "—" : null,
  }));

  const churchesNoEscopo = (churchesData ?? []).filter((c) => !escopo || (c.unit_id && escopo.has(c.unit_id)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={MapPin}
        title="Pontos de Pregação"
        description="Vinculados a uma igreja-mãe"
        backHref="/dashboard/configuracoes/ministerio-setores-igrejas"
        backLabel="VOLTAR"
        backNovoPadrao
        actions={
          <div className="flex items-center gap-2">
            <ImportarMembrosLinks />
          </div>
        }
        iconColor="text-iw-gold"
        iconBg="bg-iw-gold/10"
      />

      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          Erro ao carregar os pontos de pregação: {error.message}
        </div>
      )}

      <CongregacoesListClient
        rows={rows}
        setores={setores}
        editBasePath="/dashboard/configuracoes/pontos-pregacao"
        emptyIcon={<MapPin className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />}
        emptyTitle="Nenhum ponto de pregação cadastrado."
        emptyHint='Clique em "Novo Ponto de Pregação" para começar.'
        showParentColumn
        allChurches={churchesNoEscopo.map((c) => ({ church_type: c.church_type, sector_id: c.sector_id }))}
        novoHref="/dashboard/configuracoes/pontos-pregacao/nova"
        novoLabel="Novo Ponto de Pregação"
      />
    </div>
  );
}
