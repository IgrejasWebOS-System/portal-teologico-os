// ============================================================
// Utilitário compartilhado (server + client) pra resolver a árvore
// Setor/Regional → Igreja → Sub-congregação/Ponto de Pregação → Célula
// sem round-trip ao banco a cada nível: a lista completa de `units`
// já vem inteira do servidor (~470 linhas hoje, leve) e tudo aqui é
// filtro em memória por parent_id.
//
// Mesma árvore que supabase/migrations/057_expandir_unit_type.sql
// valida no banco (trigger validate_unit_hierarchy):
//   SETOR → IGREJA → {SUB_CONGREGACAO, PONTO_PREGACAO, CELULA direto}
//         → CELULA (dentro de SUB_CONGREGACAO/PONTO_PREGACAO também)
// ============================================================

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };

export const SUB_UNIT_TYPES = ["SUB_CONGREGACAO", "PONTO_PREGACAO"];

// Expande uma lista de unit_ids "raiz" pra incluir toda a subárvore
// (todo mundo que descende delas, seguindo parent_id). Usado tanto
// pra achar quais church_id caem "dentro" do nó que a pessoa escolheu
// no seletor, quanto (no page.tsx) pra decidir se o escopo de uma
// conta não-GLOBAL_ADMIN colapsa pra uma única igreja.
export function expandirUnidades(raizes: string[], units: UnitLite[]): Set<string> {
  const resultado = new Set(raizes);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const u of units) {
      if (u.parent_id && resultado.has(u.parent_id) && !resultado.has(u.id)) {
        resultado.add(u.id);
        mudou = true;
      }
    }
  }
  return resultado;
}
