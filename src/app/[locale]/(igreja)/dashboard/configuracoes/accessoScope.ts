// ============================================================
// Escopo de acesso (Setor/Regional → Igreja → ...) pras páginas de
// Configurações que listam congregações (Igrejas, Sub-congregações,
// Pontos de Pregação, Células). Mesma regra que /dashboard/membros já
// aplica (get_accessible_unit_ids() + expandirUnidades) — reaproveitada
// aqui em vez de duplicada, pra não divergir com o tempo.
//
// Antes desta rotina, essas 4 páginas de Configurações não filtravam
// por escopo nenhum: qualquer staff (GLOBAL_ADMIN, SECTOR_ADMIN ou
// LOCAL_ADMIN) via TODAS as congregações do sistema, mesmo sem acesso
// a elas — só a tela de /dashboard/membros tinha esse filtro. Corrigido
// em 2026-09-17 (pedido do Joaquim: "se fosse um usuário de uma igreja
// específica, somente seus dados, da sua igreja").
// ============================================================

import { expandirUnidades, type UnitLite } from "../membros/unitScope";

export type EscopoConfiguracoes = {
  isGlobalAdmin: boolean;
  units: UnitLite[];
  /** null = sem restrição (GLOBAL_ADMIN vê tudo). Já vem expandido
   *  (unidade(s) atribuída(s) + toda a subárvore). */
  escopo: Set<string> | null;
  /** Unidade raiz "SEDE" (topo da árvore, acima de todos os
   *  Setores/Regionais) — usada como valor padrão do seletor. */
  sedeUnitId: string | null;
};

export async function carregarEscopoConfiguracoes(
  // Tipado como `any` de propósito -- ver src/utils/staff.ts: tipar
  // estruturalmente o client do Supabase aqui estoura o tsc com "Type
  // instantiation is excessively deep and possibly infinite".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<EscopoConfiguracoes> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("system_role").eq("id", user.id).single()
    : { data: null };
  const isGlobalAdmin = profile?.system_role === "GLOBAL_ADMIN";

  const { data: unitsRaw } = await supabase.from("units").select("id, type, name, parent_id");
  const units = (unitsRaw ?? []) as UnitLite[];
  const sedeUnitId = units.find((u) => u.type === "SEDE")?.id ?? null;

  if (isGlobalAdmin) {
    return { isGlobalAdmin, units, escopo: null, sedeUnitId };
  }

  const { data: acessiveis } = await supabase.rpc("get_accessible_unit_ids");
  const idsAcessiveis = ((acessiveis ?? []) as { unit_id: string }[]).map((r) => r.unit_id);
  const escopo = expandirUnidades(idsAcessiveis, units);

  return { isGlobalAdmin, units, escopo, sedeUnitId };
}
