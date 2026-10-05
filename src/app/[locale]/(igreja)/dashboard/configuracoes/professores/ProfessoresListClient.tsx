"use client";

// ============================================================
// Busca por Setor/Regional + nome (29/09/2026, pedido do Joaquim: "um
// professor me ligou, tenho que olhar a lista toda" — lista sem filtro
// não escala). Filtro 100% client-side porque a lista inteira já vem
// carregada do server component (mesmo padrão simples usado em telas
// pequenas do admin) -- sem precisar de nova query por letra digitada.
// "SEDE" é um valor especial (não é um sector_id de verdade) porque a
// SEDE não tem setor -- é a própria igreja marcada church.is_sede=true.
//
// 30/09/2026, pedido do Joaquim: "trazer por SEDE, SETOR E REGIONAL e
// quando clicar abrir" — trocado o toggle "Agrupado/Lista" pelo MESMO
// padrão de accordion (<details>/<summary>, fechado por padrão) já usado
// em /dashboard/configuracoes/persona/alunos (AlunosListClient.tsx):
// grupo fechado até o usuário clicar, com contagem no cabeçalho. Quando
// o usuário busca por nome, a lista aplaina automaticamente (não faz
// sentido navegar accordion enquanto busca).
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Search, LogIn, Loader2, ChevronRight } from "lucide-react";
import { deleteProfessorFormAction, acessarPortalProfessorAction } from "../actions";

type Row = {
  id: string;
  nome_completo: string;
  cargo: string | null;
  telefone: string | null;
  veio_de_fora: boolean;
  matricula: string | null;
  sector_id: string | null;
  sectors: { name: string; categoria: string | null } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

interface SetorItem {
  id: string;
  name: string;
}

const COLS = "grid-cols-[1.2fr_1fr_1fr_1fr_auto]";

function CabecalhoColunas() {
  return (
    <div className={`grid ${COLS} px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4`}>
      <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
      <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Cargo</span>
      <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja / Setor</span>
      <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
      <span></span>
    </div>
  );
}

function LinhaProfessor({
  r,
  acessandoId,
  onAcessar,
}: {
  r: Row;
  acessandoId: string | null;
  onAcessar: (id: string) => void;
}) {
  return (
    <li className={`grid ${COLS} items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4`}>
      <span className="text-sm font-semibold text-iw-navy truncate inline-flex items-center gap-1.5">
        {r.nome_completo}
        <span
          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
            r.veio_de_fora ? "bg-iw-gold/10 text-iw-gold" : "bg-iw-blue/10 text-iw-navy"
          }`}
        >
          {r.veio_de_fora ? "De fora" : "Membro"}
        </span>
      </span>
      <span className="text-xs text-iw-muted truncate">
        {r.cargo ?? "—"}
        {r.matricula && <span className="text-iw-muted/60"> · {r.matricula}</span>}
      </span>
      <span className="text-xs text-iw-muted truncate">
        {r.churches?.name ?? "—"} {r.sectors?.name ? `· ${r.sectors.name}` : ""}
      </span>
      <span className="text-xs text-iw-muted truncate">{r.telefone ?? "—"}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={acessandoId === r.id}
          onClick={() => onAcessar(r.id)}
          title="Acessar o portal deste professor (abre numa aba nova)"
          className="flex items-center gap-1 text-[#CF8403] font-bold hover:opacity-75 transition-opacity disabled:opacity-50 shrink-0"
        >
          {acessandoId === r.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogIn className="w-3.5 h-3.5" />
          )}
          <span className="text-[11px] uppercase tracking-wide">Portal Professor</span>
        </button>
        <Link
          href={`/dashboard/configuracoes/professores/editar/${r.id}`}
          className="text-iw-muted hover:text-iw-navy transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <form action={deleteProfessorFormAction.bind(null, r.id)}>
          <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </li>
  );
}

export default function ProfessoresListClient({
  rows,
  setores,
}: {
  rows: Row[];
  setores: SetorItem[];
}) {
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("");
  const [acessandoId, setAcessandoId] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);

  // 30/09/2026, pedido do Joaquim: "entrar como o professor de verdade" —
  // gera um link de login real (mesmo mecanismo do convite) e abre numa
  // aba nova. Troca a sessão do navegador pra a do professor (é login de
  // verdade, não um modo "visualização"), por isso abre em aba separada —
  // decisão confirmada com o Joaquim (ver actions.ts).
  async function handleAcessarPortal(id: string) {
    setAcessandoId(id);
    setErroAcesso(null);
    try {
      const res = await acessarPortalProfessorAction(id);
      if (!res.success || !res.url) {
        setErroAcesso(res.message ?? "Erro ao gerar o link de acesso.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setAcessandoId(null);
    }
  }

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (setorFiltro === "SEDE" && !r.churches?.is_sede) return false;
      if (setorFiltro && setorFiltro !== "SEDE" && r.sector_id !== setorFiltro) return false;
      return true;
    });
  }, [rows, setorFiltro]);

  const buscaLower = busca.trim().toLowerCase();
  const modoBusca = buscaLower.length > 0;

  const rowsBuscadas = useMemo(() => {
    if (!modoBusca) return [];
    return rowsFiltradas.filter((r) => r.nome_completo.toLowerCase().includes(buscaLower));
  }, [rowsFiltradas, buscaLower, modoBusca]);

  // 02/10/2026, pedido do Joaquim: a tela agora abre com só 3 opções —
  // SEDE / SETOR / REGIONAL, uma embaixo da outra. Clicar em SEDE abre a
  // lista de professores da sede direto (só existe 1 grupo). Clicar em
  // SETOR ou REGIONAL abre, dentro, os sub-grupos por setor/regional
  // individual (o que antes aparecia tudo junto, no mesmo nível).
  const categorias = useMemo(() => {
    if (modoBusca) return [];
    const setorMap = new Map<string, { nome: string; rows: Row[] }>();
    const regionalMap = new Map<string, { nome: string; rows: Row[] }>();
    const sedeRows: Row[] = [];

    for (const r of rowsFiltradas) {
      const ehSede = !!r.churches?.is_sede;
      const ehRegional = !ehSede && r.sectors?.categoria === "REGIONAL";
      if (ehSede) {
        sedeRows.push(r);
      } else if (ehRegional) {
        const key = r.sector_id ?? "SEM_SETOR";
        const nome = r.sectors?.name ?? "Sem setor definido";
        if (!regionalMap.has(key)) regionalMap.set(key, { nome, rows: [] });
        regionalMap.get(key)!.rows.push(r);
      } else {
        const key = r.sector_id ?? "SEM_SETOR";
        const nome = r.sectors?.name ?? "Sem setor definido";
        if (!setorMap.has(key)) setorMap.set(key, { nome, rows: [] });
        setorMap.get(key)!.rows.push(r);
      }
    }

    const ordenar = (map: Map<string, { nome: string; rows: Row[] }>) =>
      Array.from(map.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return [
      { chave: "SEDE", nome: "SEDE", total: sedeRows.length, subgrupos: null, rows: sedeRows },
      { chave: "SETOR", nome: "SETOR", total: Array.from(setorMap.values()).reduce((acc, v) => acc + v.rows.length, 0), subgrupos: ordenar(setorMap), rows: null },
      { chave: "REGIONAL", nome: "REGIONAL", total: Array.from(regionalMap.values()).reduce((acc, v) => acc + v.rows.length, 0), subgrupos: ordenar(regionalMap), rows: null },
    ] as const;
  }, [rowsFiltradas, modoBusca]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5">
          <Search className="w-4 h-4 text-iw-muted shrink-0" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome do professor..."
            className="flex-1 bg-transparent border-none p-0 text-sm text-black placeholder-iw-muted focus:outline-none focus:ring-0"
          />
        </div>
        <select
          value={setorFiltro}
          onChange={(e) => setSetorFiltro(e.target.value)}
          className="bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm text-black cursor-pointer sm:w-64"
        >
          <option value="">Todos os setores/regionais</option>
          <option value="SEDE">SEDE</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {erroAcesso && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {erroAcesso}
        </div>
      )}

      {modoBusca ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
          <CabecalhoColunas />
          {rowsBuscadas.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-iw-muted text-sm font-medium">Nenhum professor encontrado com esse filtro.</p>
            </div>
          ) : (
            <ul className="divide-y divide-iw-border">
              {rowsBuscadas.map((r) => (
                <LinhaProfessor key={r.id} r={r} acessandoId={acessandoId} onAcessar={handleAcessarPortal} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {categorias.map((cat) => (
            <details key={cat.chave} className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm group">
              <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-iw-bg select-none list-none">
                <span className="flex items-center gap-2 text-sm font-bold text-iw-navy">
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  {cat.nome}
                </span>
                <span className="text-xs font-semibold text-iw-muted">
                  <span className="text-[15px] font-black text-iw-navy">{cat.total}</span> professor
                  {cat.total === 1 ? "" : "es"}
                </span>
              </summary>

              {cat.rows !== null ? (
                cat.rows.length === 0 ? (
                  <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhum professor nesta categoria.</div>
                ) : (
                  <>
                    <CabecalhoColunas />
                    <ul className="divide-y divide-iw-border">
                      {cat.rows.map((r) => (
                        <LinhaProfessor key={r.id} r={r} acessandoId={acessandoId} onAcessar={handleAcessarPortal} />
                      ))}
                    </ul>
                  </>
                )
              ) : cat.subgrupos!.length === 0 ? (
                <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhum professor nesta categoria.</div>
              ) : (
                <div className="divide-y divide-iw-border">
                  {cat.subgrupos!.map((sub) => (
                    <details key={sub.key} className="group/sub">
                      <summary className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                        <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/sub:rotate-90" />
                          {sub.nome}
                        </span>
                        <span className="text-[11px] font-bold text-iw-muted">
                          {sub.rows.length} professor{sub.rows.length === 1 ? "" : "es"}
                        </span>
                      </summary>
                      <CabecalhoColunas />
                      <ul className="divide-y divide-iw-border bg-iw-bg/30">
                        {sub.rows.map((r) => (
                          <LinhaProfessor key={r.id} r={r} acessandoId={acessandoId} onAcessar={handleAcessarPortal} />
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
