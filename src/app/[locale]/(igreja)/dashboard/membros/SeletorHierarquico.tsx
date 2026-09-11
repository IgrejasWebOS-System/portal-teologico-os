"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { SUB_UNIT_TYPES, type UnitLite } from "./unitScope";

export type SectorOption = { id: string; name: string; categoria: string; unit_id: string | null };
export type ChurchOption = { id: string; name: string; unit_id: string | null };

type Props = {
  sectors: SectorOption[];
  units: UnitLite[];
  churches: ChurchOption[];
  // null = sem restrição (GLOBAL_ADMIN vê tudo). Quando preenchido, já
  // vem expandido (setor + toda a subárvore) — ver get_accessible_unit_ids().
  accessibleUnitIds: string[] | null;
  setorId: string;
  igrejaId: string;
  subUnidadeId: string;
  celulaId: string;
  onSetorChange: (id: string) => void;
  onIgrejaChange: (id: string) => void;
  onSubUnidadeChange: (id: string) => void;
  onCelulaChange: (id: string) => void;
};

const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function SeletorHierarquico({
  sectors,
  units,
  churches,
  accessibleUnitIds,
  setorId,
  igrejaId,
  subUnidadeId,
  celulaId,
  onSetorChange,
  onIgrejaChange,
  onSubUnidadeChange,
  onCelulaChange,
}: Props) {
  const podeAcessar = (unitId: string | null) =>
    !accessibleUnitIds || (unitId !== null && accessibleUnitIds.includes(unitId));

  const setoresDisponiveis = useMemo(
    () => sectors.filter((s) => podeAcessar(s.unit_id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectors, accessibleUnitIds]
  );

  const setorSelecionado = setoresDisponiveis.find((s) => s.id === setorId);

  const igrejasDoSetor = useMemo(() => {
    if (!setorSelecionado?.unit_id) return [];
    return units
      .filter((u) => u.type === "IGREJA" && u.parent_id === setorSelecionado.unit_id)
      .map((u) => churches.find((c) => c.unit_id === u.id))
      .filter((c): c is ChurchOption => !!c)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [setorSelecionado, units, churches]);

  const igrejaSelecionada = churches.find((c) => c.id === igrejaId);

  const subUnidadesDaIgreja = useMemo(() => {
    if (!igrejaSelecionada?.unit_id) return [];
    return units
      .filter((u) => SUB_UNIT_TYPES.includes(u.type) && u.parent_id === igrejaSelecionada.unit_id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [igrejaSelecionada, units]);

  const noParaCelulas = subUnidadeId || igrejaSelecionada?.unit_id || "";

  const celulasDoNo = useMemo(() => {
    if (!noParaCelulas) return [];
    return units
      .filter((u) => u.type === "CELULA" && u.parent_id === noParaCelulas)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [noParaCelulas, units]);

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-iw-blue shrink-0" />
        <p className="text-sm font-bold text-iw-navy">Escolha o escopo</p>
        <p className="text-xs text-iw-muted">
          — selecione ao menos o Setor/Regional para carregar os membros
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Setor / Regional</label>
          <select
            value={setorId}
            onChange={(e) => {
              onSetorChange(e.target.value);
              onIgrejaChange("");
              onSubUnidadeChange("");
              onCelulaChange("");
            }}
            className={selectCls}
          >
            <option value="">— Selecione —</option>
            {setoresDisponiveis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.categoria === "REGIONAL" ? "Regional" : "Setor"} · {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Igreja</label>
          <select
            value={igrejaId}
            onChange={(e) => {
              onIgrejaChange(e.target.value);
              onSubUnidadeChange("");
              onCelulaChange("");
            }}
            disabled={!setorId}
            className={selectCls}
          >
            <option value="">
              {setorId && igrejasDoSetor.length === 0
                ? "— Nenhuma igreja cadastrada neste setor —"
                : "— Todas as igrejas do setor —"}
            </option>
            {igrejasDoSetor.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {igrejaId && subUnidadesDaIgreja.length > 0 && (
          <div>
            <label className={labelCls}>Sub-congregação / Ponto de Pregação</label>
            <select
              value={subUnidadeId}
              onChange={(e) => {
                onSubUnidadeChange(e.target.value);
                onCelulaChange("");
              }}
              className={selectCls}
            >
              <option value="">— Toda a igreja —</option>
              {subUnidadesDaIgreja.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.type === "PONTO_PREGACAO" ? "Ponto de Pregação" : "Sub-congregação"} · {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {noParaCelulas && celulasDoNo.length > 0 && (
          <div>
            <label className={labelCls}>Célula</label>
            <select value={celulaId} onChange={(e) => onCelulaChange(e.target.value)} className={selectCls}>
              <option value="">— Todas as células —</option>
              {celulasDoNo.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
