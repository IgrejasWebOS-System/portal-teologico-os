"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, Pencil, Church, Building2, MapPinned, GitBranch } from "lucide-react";

export type CongregacaoRow = {
  id: string;
  name: string;
  pastor_name: string | null;
  pastor_role: string | null;
  pastor_phone: string | null;
  sector_id: string | null;
  sector_name: string | null;
  parent_name: string | null;
};

export type ChurchTypeCount = { church_type: string | null; sector_id: string | null };

type SetorOption = { id: string; name: string; categoria?: string | null };

interface Props {
  rows: CongregacaoRow[];
  setores: SetorOption[];
  editBasePath: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyHint: string;
  /** Mostra a coluna "Igreja-mãe" em vez de depender só do Setor (Sub/Ponto/Célula). */
  showParentColumn?: boolean;
  /**
   * Todas as congregações (dos 4 tipos), só com tipo + setor — usado pra
   * calcular os 4 cards (Igreja/Sub/Ponto/Célula) geral E individualizado
   * pelo Setor/Regional selecionado no filtro abaixo.
   */
  allChurches?: ChurchTypeCount[];
}

const TIPO_CARDS = [
  { tipo: "CHURCH", label: "Igrejas", icon: Church, color: "text-iw-blue" },
  { tipo: "SUB", label: "Sub-congregações", icon: Building2, color: "text-iw-gold" },
  { tipo: "PONTO", label: "Pontos de Pregação", icon: MapPinned, color: "text-iw-gold" },
  { tipo: "CELL", label: "Células", icon: GitBranch, color: "text-iw-success" },
] as const;

export default function CongregacoesListClient({
  rows,
  setores,
  editBasePath,
  emptyIcon,
  emptyTitle,
  emptyHint,
  showParentColumn = false,
  allChurches,
}: Props) {
  const [busca, setBusca] = useState("");
  const [setorId, setSetorId] = useState("");

  const setoresOrdenados = useMemo(
    () => [...setores].sort((a, b) => a.name.localeCompare(b.name)),
    [setores]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return rows.filter((r) => {
      if (setorId && r.sector_id !== setorId) return false;
      if (termo && !r.name.toUpperCase().includes(termo)) return false;
      return true;
    });
  }, [rows, busca, setorId]);

  const contagens = useMemo(() => {
    if (!allChurches) return null;
    const setorLabel = setorId ? setoresOrdenados.find((s) => s.id === setorId)?.name ?? "" : "";
    return TIPO_CARDS.map(({ tipo }) => {
      const tipoNorm = (c: ChurchTypeCount) => (c.church_type ?? "CHURCH") === tipo;
      const global = allChurches.filter(tipoNorm).length;
      const escopo = setorId
        ? allChurches.filter((c) => tipoNorm(c) && c.sector_id === setorId).length
        : null;
      return { tipo, global, escopo, setorLabel };
    });
  }, [allChurches, setorId, setoresOrdenados]);

  return (
    <div className="space-y-4">
      {contagens && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TIPO_CARDS.map(({ tipo, label, icon: Icon, color }, i) => {
            const c = contagens[i];
            return (
              <div key={tipo} className="bg-iw-surface rounded-2xl border border-iw-border p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 shrink-0 ${color}`} />
                <div>
                  <p className="text-xl font-black text-iw-navy">
                    {c.escopo !== null ? c.escopo : c.global}
                  </p>
                  <p className="text-xs text-iw-muted">
                    {label}
                    {c.escopo !== null && (
                      <span className="block text-[10px] text-iw-muted/70">
                        de {c.global} no geral · {c.setorLabel}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Consulta: por nome e por Setor/Regional */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-iw-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full bg-white border border-iw-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors"
          />
        </div>
        <select
          value={setorId}
          onChange={(e) => setSetorId(e.target.value)}
          className="bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors sm:w-64"
        >
          <option value="">Todos os Setores/Regionais</option>
          {setoresOrdenados.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">
            {showParentColumn ? "Igreja-mãe / Setor" : "Setor / Regional"}
          </span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Responsável</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
          <span />
        </div>

        {filtradas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            {emptyIcon}
            <p className="text-iw-muted text-sm font-medium">
              {rows.length === 0 ? emptyTitle : "Nenhum resultado para esta busca."}
            </p>
            <p className="text-iw-muted/60 text-xs mt-1">{emptyHint}</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {filtradas.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4"
              >
                <span className="text-sm font-semibold text-iw-navy truncate">{r.name}</span>
                <span className="text-xs text-iw-muted truncate">
                  {showParentColumn
                    ? `${r.parent_name ?? "—"}${r.sector_name ? ` · ${r.sector_name}` : ""}`
                    : r.sector_name ?? "—"}
                </span>
                <span className="text-xs text-iw-navy truncate">
                  {r.pastor_name ?? "—"}
                  {r.pastor_role && <span className="text-iw-muted"> ({r.pastor_role})</span>}
                </span>
                <span className="text-xs text-iw-muted truncate">{r.pastor_phone ?? "—"}</span>
                <Link
                  href={`${editBasePath}/${r.id}/editar`}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-iw-muted hover:text-iw-blue hover:bg-iw-blue/10 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
