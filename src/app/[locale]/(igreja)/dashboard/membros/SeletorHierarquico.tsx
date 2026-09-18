"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2, FileSpreadsheet, ImagePlus } from "lucide-react";
import { SUB_UNIT_TYPES, type UnitLite } from "./unitScope";

export type SectorOption = { id: string; name: string; categoria: string; unit_id: string | null };
export type ChurchOption = { id: string; name: string; unit_id: string | null };

/** Sentinela pro item "SEDE" dentro do MESMO seletor de Setor/Regional
 * (não é uma linha de `sectors`, é a igreja "SEDE" — topo da árvore).
 * Escolhê-la já seleciona a igreja SEDE direto, sem precisar de um
 * segundo clique (pedido do Joaquim em 2026-09-17: "SEDE, E JÁ TRAZ
 * IGREJA SEDE"). */
const SEDE_SENTINEL = "SEDE";

/** Pega os últimos dígitos do nome do setor/regional (ex.: "REGIONAL 002"
 * -> "002", "SETOR 013" -> "013") -- mesmo critério usado no atalho
 * numérico de busca em CongregacoesListClient.tsx. */
function extrairNumero(nome: string): string | null {
  return /(\d+)\s*$/.exec(nome)?.[1] ?? null;
}

/** Rótulo do seletor Setor/Regional (pedido do Joaquim em 2026-09-18):
 * Setor mostra 2 dígitos ("Setor 01"), Regional mostra 3 dígitos
 * ("Regional 001"), independente de como o número está gravado no nome. */
function formatarLabelSetor(s: SectorOption): string {
  const num = extrairNumero(s.name);
  if (!num) return s.categoria === "REGIONAL" ? `Regional · ${s.name}` : `Setor · ${s.name}`;
  return s.categoria === "REGIONAL" ? num.padStart(3, "0") : num.slice(-2).padStart(2, "0");
}

type Props = {
  sectors: SectorOption[];
  units: UnitLite[];
  churches: ChurchOption[];
  // null = sem restrição (GLOBAL_ADMIN vê tudo). Quando preenchido, já
  // vem expandido (setor + toda a subárvore) — ver get_accessible_unit_ids().
  accessibleUnitIds: string[] | null;
  /** Id da igreja "SEDE" (unit type='SEDE') — null se não existir/fora do
   *  escopo do usuário logado; nesse caso a opção nem aparece. */
  sedeChurchId?: string | null;
  setorId: string;
  igrejaId: string;
  subUnidadeId: string;
  celulaId: string;
  onSetorChange: (id: string) => void;
  onIgrejaChange: (id: string) => void;
  onSubUnidadeChange: (id: string) => void;
  onCelulaChange: (id: string) => void;
  /** Mostra "Importar CSV"/"Importar Fotos" na extremidade direita da caixa
   * (pedido do Joaquim em 2026-09-18) -- escondido no Arquivo Morto. */
  mostrarImportar?: boolean;
};

const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function SeletorHierarquico({
  sectors,
  units,
  churches,
  accessibleUnitIds,
  sedeChurchId = null,
  setorId,
  igrejaId,
  subUnidadeId,
  celulaId,
  onSetorChange,
  onIgrejaChange,
  onSubUnidadeChange,
  onCelulaChange,
  mostrarImportar = false,
}: Props) {
  const podeAcessar = (unitId: string | null) =>
    !accessibleUnitIds || (unitId !== null && accessibleUnitIds.includes(unitId));

  const setoresDisponiveis = useMemo(
    () => sectors.filter((s) => podeAcessar(s.unit_id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectors, accessibleUnitIds]
  );
  const regionaisDisponiveis = useMemo(
    () => setoresDisponiveis.filter((s) => s.categoria === "REGIONAL"),
    [setoresDisponiveis]
  );
  const setoresComunsDisponiveis = useMemo(
    () => setoresDisponiveis.filter((s) => s.categoria !== "REGIONAL"),
    [setoresDisponiveis]
  );

  // SEDE só aparece se existir E estiver dentro do escopo acessível.
  const sedeChurch = useMemo(() => {
    if (!sedeChurchId) return null;
    const igreja = churches.find((c) => c.id === sedeChurchId);
    if (!igreja || !podeAcessar(igreja.unit_id)) return null;
    return igreja;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeChurchId, churches, accessibleUnitIds]);

  const setorSelecionado = setoresDisponiveis.find((s) => s.id === setorId);

  const igrejasDoSetor = useMemo(() => {
    // SEDE não é uma linha de `sectors` -- é ela mesma a igreja, então
    // "as igrejas do setor SEDE" é só ela própria.
    if (setorId === SEDE_SENTINEL) return sedeChurch ? [sedeChurch] : [];
    if (!setorSelecionado?.unit_id) return [];
    return units
      .filter((u) => u.type === "IGREJA" && u.parent_id === setorSelecionado.unit_id)
      .map((u) => churches.find((c) => c.unit_id === u.id))
      .filter((c): c is ChurchOption => !!c)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [setorId, sedeChurch, setorSelecionado, units, churches]);

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
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-iw-navy shrink-0" />
        <p className="text-sm font-bold text-iw-navy">Escolha o escopo</p>
        <p className="text-xs text-iw-muted">
          — selecione ao menos o Setor/Regional para carregar os membros
        </p>

        {mostrarImportar && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/membros/importar-csv"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-iw-gold/10 text-iw-gold border border-iw-gold/30 hover:bg-iw-gold/20 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importar CSV
            </Link>
            <Link
              href="/dashboard/membros/importar-fotos"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-iw-gold/10 text-iw-gold border border-iw-gold/30 hover:bg-iw-gold/20 transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Importar Fotos
            </Link>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Setor / Regional</label>
          <select
            value={setorId}
            onChange={(e) => {
              const valor = e.target.value;
              onSetorChange(valor);
              // SEDE já traz a igreja SEDE direto, sem precisar de um
              // segundo clique no seletor de Igreja.
              onIgrejaChange(valor === SEDE_SENTINEL && sedeChurch ? sedeChurch.id : "");
              onSubUnidadeChange("");
              onCelulaChange("");
            }}
            className={selectCls}
          >
            <option value="">— Selecione —</option>
            {sedeChurch && <option value={SEDE_SENTINEL}>SEDE</option>}
            {regionaisDisponiveis.length > 0 && (
              <optgroup label="Regional">
                {regionaisDisponiveis.map((s) => (
                  <option key={s.id} value={s.id}>{formatarLabelSetor(s)}</option>
                ))}
              </optgroup>
            )}
            {setoresComunsDisponiveis.length > 0 && (
              <optgroup label="Setor">
                {setoresComunsDisponiveis.map((s) => (
                  <option key={s.id} value={s.id}>{formatarLabelSetor(s)}</option>
                ))}
              </optgroup>
            )}
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
