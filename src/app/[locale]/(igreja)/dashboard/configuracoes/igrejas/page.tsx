import { Church } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import CongregacoesListClient, { type CongregacaoRow } from "../CongregacoesListClient";
import { carregarEscopoConfiguracoes } from "../accessoScope";
import ImportarMembrosLinks from "../ImportarMembrosLinks";

export default async function IgrejasPage() {
  const supabase = await createClient();
  const { escopo, sedeUnitId } = await carregarEscopoConfiguracoes(supabase);

  const [{ data, error }, { data: sectorsData }, { data: membrosData }] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, church_type, sector_id, unit_id, pastor_name, pastor_role, pastor_phone")
      .order("name"),
    supabase.from("sectors").select("id, name, categoria, unit_id"),
    // Contagem de membros ativos por igreja -- alimenta o botão "Membros"
    // na lista (ver CongregacoesListClient). Base ainda pequena (dezenas
    // de registros nesta fase de importação), então um select simples +
    // reduce em JS é suficiente; não precisa de agregação no banco.
    supabase.from("members").select("church_id").eq("status", "ACTIVE"),
  ]);

  if (error) {
    console.error("[igrejas/page]", error);
  }

  // Sem restrição (GLOBAL_ADMIN) = escopo null, mostra tudo. Senão, só o
  // que estiver dentro da subárvore de unidades acessíveis ao usuário.
  const setores = (sectorsData ?? []).filter((s) => !escopo || (s.unit_id && escopo.has(s.unit_id)));
  const nomeSetor = new Map(setores.map((s) => [s.id as string, s.name as string]));

  const all = (data ?? []).filter((c) => !escopo || (c.unit_id && escopo.has(c.unit_id)));
  const main = all.filter((c) => c.church_type === "CHURCH" || !c.church_type);
  const sedeChurchId = sedeUnitId ? main.find((c) => c.unit_id === sedeUnitId)?.id ?? null : null;

  const memberCounts: Record<string, number> = {};
  for (const m of membrosData ?? []) {
    if (m.church_id) memberCounts[m.church_id] = (memberCounts[m.church_id] ?? 0) + 1;
  }

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
      <PageHeader
        icon={Church}
        title="Igrejas"
        description="Congregações, sub-congregações e células"
        backHref="/dashboard/configuracoes/ministerio-setores-igrejas"
        backLabel="VOLTAR"
        backNovoPadrao
        actions={
          <div className="flex items-center gap-2">
            <ImportarMembrosLinks />
          </div>
        }
      />

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
        novoHref="/dashboard/configuracoes/igrejas/nova"
        novoLabel="Nova Igreja"
        sedeChurchId={sedeChurchId}
        mostrarSeletorIgreja
        memberCounts={memberCounts}
      />
    </div>
  );
}
