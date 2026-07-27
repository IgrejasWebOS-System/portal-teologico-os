// ============================================================
// ancestryChain() — dado um unit_id (folha) e a lista completa de
// units, sobe pela cadeia parent_id até a raiz (CAMPO) e devolve os
// nós em ordem [CAMPO, SEDE, SETOR, IGREJA, SUB_CONGREGACAO?].
// Usado tanto no cadastro de Professor (cascata de selects) quanto
// no convite de operador (exibição de Ministério/Setor/Igreja).
// ============================================================

export type UnitNode = {
  id: string;
  type: string;
  name: string;
  parent_id: string | null;
};

export function ancestryChain(
  unitId: string | null | undefined,
  units: UnitNode[]
): UnitNode[] {
  if (!unitId) return [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const chain: UnitNode[] = [];
  let current = byId.get(unitId);
  let guard = 0;
  while (current && guard < 10) {
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
    guard++;
  }
  return chain;
}

export const SUB_UNIT_TYPES = ["SUB_CONGREGACAO", "PONTO_PREGACAO", "CELULA"];
