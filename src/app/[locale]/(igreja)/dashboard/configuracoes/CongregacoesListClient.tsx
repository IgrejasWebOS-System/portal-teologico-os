"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Search, Pencil, Church, Building2, MapPinned, GitBranch, Plus, Users, FileText, ClipboardList, Archive,
} from "lucide-react";
import HistoricoRelatorio from "@/app/[locale]/(igreja)/dashboard/membros/HistoricoRelatorio";

/** Pega os últimos dígitos do nome do setor/regional (ex.: "REGIONAL 002"
 * -> "002", "SETOR 013" -> "013"). */
function extrairNumero(nome: string): string | null {
  return /(\d+)\s*$/.exec(nome)?.[1] ?? null;
}

/** Sentinela do filtro Setor/Regional/SEDE: representa a igreja "SEDE"
 * (topo da árvore, acima de todos os Setores/Regionais). Selecioná-la
 * filtra a lista pra mostrar só essa igreja -- igual a escolher um Setor
 * ou Regional especifico, não "mostrar tudo" (pedido do Joaquim em
 * 2026-09-17: "SEDE, E JÁ TRAZ IGREJA SEDE"). */
const SEDE_SENTINEL = "SEDE";

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
  /** Link + rótulo do botão "Novo/Nova X" (Igreja, Sub-congregação, Ponto
   *  de Pregação ou Célula), dentro da caixa de busca/filtro. */
  novoHref: string;
  novoLabel: string;
  /** Id da igreja "SEDE" (achado via unit type='SEDE') -- só passa quando
   *  fizer sentido essa página oferecer o filtro por SEDE (hoje: só
   *  Igrejas, já que Sub-congregação/Ponto/Célula não têm nenhuma
   *  vinculada à SEDE ainda). */
  sedeChurchId?: string | null;
  /** Mostra um segundo seletor "Igreja" (cascata, depois de escolher
   *  SEDE/Setor/Regional) pra ir direto numa igreja específica -- só faz
   *  sentido na própria página de Igrejas. */
  mostrarSeletorIgreja?: boolean;
  /** Quantidade de membros ATIVOS por congregação (church_id -> total) --
   *  alimenta o botão "Membros" que substitui a coluna Setor/Regional
   *  (redundante, já que a lista inteira já está filtrada por ele).
   *  Pedido do Joaquim em 2026-09-18. */
  memberCounts?: Record<string, number>;
}

const TIPO_CARDS = [
  { tipo: "CHURCH", label: "Igrejas", icon: Church, color: "text-iw-navy" },
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
  novoHref,
  novoLabel,
  sedeChurchId = null,
  mostrarSeletorIgreja = false,
  memberCounts = {},
}: Props) {
  const [busca, setBusca] = useState("");
  const [setorId, setSetorId] = useState("");
  const [igrejaId, setIgrejaId] = useState("");
  const [menuMembrosAbertoId, setMenuMembrosAbertoId] = useState<string | null>(null);
  const menuMembrosRef = useRef<HTMLDivElement>(null);

  // Fecha o menu "Membros" ao clicar fora dele.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (menuMembrosRef.current && !menuMembrosRef.current.contains(e.target as Node)) {
        setMenuMembrosAbertoId(null);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const setoresOrdenados = useMemo(
    () => [...setores].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [setores]
  );
  const regionais = useMemo(() => setoresOrdenados.filter((s) => s.categoria === "REGIONAL"), [setoresOrdenados]);
  const setoresComuns = useMemo(() => setoresOrdenados.filter((s) => s.categoria !== "REGIONAL"), [setoresOrdenados]);

  // Atalho numérico na busca (pedido do Joaquim em 2026-09-17): digitar
  // 3 dígitos ("002") já seleciona o REGIONAL daquele número; digitar 2
  // dígitos ("02") já seleciona o SETOR "0" + esses 2 dígitos ("002").
  // Só entra em ação quando o texto digitado é PURAMENTE numérico -- nome
  // de igreja continua filtrando normalmente por substring, como antes.
  //
  // Debounce de 400ms (bug reportado em 2026-09-18): sem isso, o efeito
  // rodava a CADA tecla -- digitar "022" passa pelo estado intermediário
  // "02" (2 dígitos) antes do "2" final, disparando o match do Setor 002
  // no meio da digitação. Só reagimos depois que a pessoa parar de digitar,
  // com o texto já completo.
  useEffect(() => {
    const termo = busca.trim();
    if (!/^\d{2,3}$/.test(termo)) return;

    const timer = setTimeout(() => {
      if (termo.length === 3) {
        const alvo = regionais.find((s) => extrairNumero(s.name) === termo);
        if (alvo) {
          setSetorId(alvo.id);
          setIgrejaId("");
          setBusca("");
        }
        return;
      }
      const alvoNum = termo.padStart(3, "0");
      const alvo = setoresComuns.find((s) => extrairNumero(s.name) === alvoNum);
      if (alvo) {
        setSetorId(alvo.id);
        setIgrejaId("");
        setBusca("");
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, regionais, setoresComuns]);

  // Linhas dentro do escopo SEDE/Setor/Regional escolhido (antes da busca
  // por nome e antes do seletor de Igreja) -- usado tanto pra popular o
  // segundo seletor quanto como base da lista final.
  const linhasNoEscopo = useMemo(() => {
    if (setorId === SEDE_SENTINEL) {
      return sedeChurchId ? rows.filter((r) => r.id === sedeChurchId) : [];
    }
    if (setorId) {
      return rows.filter((r) => r.sector_id === setorId);
    }
    return rows;
  }, [rows, setorId, sedeChurchId]);

  // Só mostra alguma coisa depois que a pessoa escolher SEDE/Setor/Regional
  // OU digitar uma busca -- nunca a lista inteira de cara (pedido do
  // Joaquim em 2026-09-17: "não trazer tela poluída").
  const algumaSelecaoFeita = setorId !== "" || busca.trim() !== "";

  const filtradas = useMemo(() => {
    if (!algumaSelecaoFeita) return [];
    const termo = busca.trim().toUpperCase();
    return linhasNoEscopo.filter((r) => {
      if (igrejaId && r.id !== igrejaId) return false;
      if (termo && !r.name.toUpperCase().includes(termo)) return false;
      return true;
    });
  }, [linhasNoEscopo, busca, igrejaId, algumaSelecaoFeita]);

  // Os cards (Igrejas/Sub/Ponto/Célula) mostram a contagem GLOBAL sempre,
  // mesmo antes de qualquer busca/seleção -- só a LISTA de baixo fica
  // vazia até escolher SEDE/Setor/Regional ou digitar uma busca (pedido
  // do Joaquim em 2026-09-18: cards sempre visíveis, lista que espera).
  const contagens = useMemo(() => {
    if (!allChurches) return null;
    const filtroSetorAtivo = setorId && setorId !== SEDE_SENTINEL ? setorId : null;
    const setorLabel = filtroSetorAtivo
      ? setoresOrdenados.find((s) => s.id === filtroSetorAtivo)?.name ?? ""
      : setorId === SEDE_SENTINEL
      ? "SEDE"
      : "";
    return TIPO_CARDS.map(({ tipo }) => {
      const tipoNorm = (c: ChurchTypeCount) => (c.church_type ?? "CHURCH") === tipo;
      const global = allChurches.filter(tipoNorm).length;
      const escopo = filtroSetorAtivo
        ? allChurches.filter((c) => tipoNorm(c) && c.sector_id === filtroSetorAtivo).length
        : null;
      return { tipo, global, escopo, setorLabel };
    });
  }, [allChurches, setorId, setoresOrdenados, algumaSelecaoFeita]);

  return (
    <div className="space-y-4">
      {/* Consulta: por nome, SEDE/Setor/Regional e (só Igrejas) por Igreja */}
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:w-56">
          <Search className="w-4 h-4 text-iw-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, ou nº (01=Setor, 001=Regional)..."
            className="w-full bg-white border border-iw-navy rounded-xl pl-9 pr-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
          />
        </div>
        <select
          value={setorId}
          onChange={(e) => {
            setSetorId(e.target.value);
            setIgrejaId("");
          }}
          className="bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors sm:w-56"
        >
          <option value="">— Selecione —</option>
          {sedeChurchId && <option value={SEDE_SENTINEL}>SEDE</option>}
          {setoresComuns.length > 0 && (
            <optgroup label="Setor">
              {setoresComuns.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          )}
          {regionais.length > 0 && (
            <optgroup label="Regional">
              {regionais.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          )}
        </select>

        {mostrarSeletorIgreja && setorId !== "" && linhasNoEscopo.length > 0 && (
          <select
            value={igrejaId}
            onChange={(e) => setIgrejaId(e.target.value)}
            className="bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors sm:w-56"
          >
            <option value="">— Todas as igrejas —</option>
            {[...linhasNoEscopo]
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
          </select>
        )}

        {/* Atalhos globais de Membros -- Histórico e Arquivo Morto, do mesmo
            jeito que aparecem em Gestão de Membros (pedido do Joaquim em
            2026-09-18: acesso rápido sem precisar trocar de tela). */}
        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
          <HistoricoRelatorio />
          <Link
            href="/dashboard/membros?arquivo=1"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border bg-iw-error/8 text-iw-error border-iw-error/20 hover:bg-iw-error/15 transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
            Arquivo Morto
          </Link>
          <Link
            href={novoHref}
            className="flex items-center justify-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            {novoLabel}
          </Link>
        </div>
      </div>

      {contagens && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TIPO_CARDS.map(({ tipo, label, icon: Icon, color }, i) => {
            const c = contagens[i];
            return (
              <div key={tipo} className="bg-iw-surface rounded-2xl border border-iw-gold p-4 flex items-center gap-3">
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

      <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">
            {showParentColumn ? "Igreja-mãe / Setor" : "Membros"}
          </span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Responsável</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
          <span />
        </div>

        {!algumaSelecaoFeita ? (
          <div className="px-5 py-16 text-center">
            <p className="text-iw-muted text-sm">
              Busque por nome ou selecione SEDE / Setor / Regional acima para carregar os registros.
            </p>
          </div>
        ) : filtradas.length === 0 ? (
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
                {showParentColumn ? (
                  <span className="text-xs text-iw-muted truncate">
                    {`${r.parent_name ?? "—"}${r.sector_name ? ` · ${r.sector_name}` : ""}`}
                  </span>
                ) : (
                  <div className="relative" ref={menuMembrosAbertoId === r.id ? menuMembrosRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setMenuMembrosAbertoId(menuMembrosAbertoId === r.id ? null : r.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-iw-gold/10 text-iw-navy border border-iw-gold/30 hover:bg-iw-gold/20 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {memberCounts[r.id] ?? 0} membro{(memberCounts[r.id] ?? 0) !== 1 ? "s" : ""}
                    </button>

                    {menuMembrosAbertoId === r.id && (
                      <div className="absolute left-0 top-9 z-50 w-52 bg-iw-surface rounded-xl border border-iw-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                        <Link
                          href={`/dashboard/membros?igreja=${r.id}`}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-navy hover:bg-iw-bg transition-colors"
                          onClick={() => setMenuMembrosAbertoId(null)}
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-iw-navy" />
                          Ir para Cadastro
                        </Link>
                        <div className="px-4 pt-2 pb-1 text-[10px] font-bold text-iw-muted uppercase tracking-wider">
                          Imprimir
                        </div>
                        <a
                          href={`/api/relatorios/ficha-igreja?igrejaId=${r.id}&tipo=resumida`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-navy hover:bg-iw-bg transition-colors"
                          onClick={() => setMenuMembrosAbertoId(null)}
                        >
                          <FileText className="w-3.5 h-3.5 text-iw-gold" />
                          Ficha Resumida
                        </a>
                        <a
                          href={`/api/relatorios/ficha-igreja?igrejaId=${r.id}&tipo=completa`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-navy hover:bg-iw-bg transition-colors"
                          onClick={() => setMenuMembrosAbertoId(null)}
                        >
                          <FileText className="w-3.5 h-3.5 text-iw-gold" />
                          Ficha Completa
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <span className="text-xs text-iw-navy truncate">
                  {r.pastor_name ?? "—"}
                  {r.pastor_role && <span className="text-iw-muted"> ({r.pastor_role})</span>}
                </span>
                <span className="text-xs text-iw-muted truncate">{r.pastor_phone ?? "—"}</span>
                <Link
                  href={`${editBasePath}/${r.id}/editar`}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-iw-muted hover:text-iw-navy hover:bg-iw-blue/10 transition-colors"
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
