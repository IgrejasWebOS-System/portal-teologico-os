"use client";

// ============================================================
// Agrupar por Setor/Regional > Igreja + busca (29/09/2026, pedido do
// Joaquim): lista plana de alunos não dava pra achar núcleo rápido. Agora
// agrupa em accordion (Setor/Regional > Igreja), com contagem em cada
// nível, e um filtro por Setor/Regional + busca por nome que, quando
// preenchido, aplaina a lista (não faz sentido navegar accordion enquanto
// busca por nome). "SEDE" é pseudo-valor (church.is_sede=true), igual ao
// filtro de Professores.
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";

type Row = {
  id: string;
  nome_completo: string;
  matricula: string;
  status: string;
  curso_pretendido: string | null;
  telefone: string | null;
  campo_ministerio_nome: string | null;
  sector_id: string | null;
  church_id: string | null;
  sectors: { name: string; categoria: string | null } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

interface SetorItem {
  id: string;
  name: string;
}

const STATUS_STYLE: Record<string, string> = {
  ATIVO: "bg-iw-success-bg text-iw-success",
  INATIVO: "bg-iw-bg text-iw-muted",
  TRANCADO: "bg-iw-warning-bg text-iw-warning",
};

function AlunoRow({ r }: { r: Row }) {
  return (
    <Link
      href={`/dashboard/configuracoes/persona/alunos/${r.id}`}
      className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] items-center px-5 py-3 hover:bg-iw-bg/50 transition-colors gap-4"
    >
      <span className="text-sm font-semibold text-iw-navy truncate">{r.nome_completo}</span>
      <span className="text-xs text-iw-muted truncate">{r.matricula}</span>
      <span className="text-xs text-iw-muted truncate">{r.curso_pretendido ?? "—"}</span>
      <span
        className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-center ${
          STATUS_STYLE[r.status] ?? "bg-iw-bg text-iw-muted"
        }`}
      >
        {r.status}
      </span>
    </Link>
  );
}

// 02/10/2026, pedido do Joaquim: a tela agora abre com só 3 opções — SEDE /
// SETOR / REGIONAL, uma embaixo da outra (mesmo critério aplicado em
// Professores/ProfessoresListClient.tsx). Clicar em SEDE abre a lista de
// igrejas/alunos da sede direto. Clicar em SETOR ou REGIONAL abre, dentro,
// os sub-grupos por setor/regional individual > igreja (nível extra que
// Professores não tem). Função fora do componente (não depende de nenhum
// estado/prop em closure) pra não disparar aviso de dependência no useMemo.
type Igreja = { key: string; nome: string; alunos: Row[] };
type SubGrupo = { key: string; nome: string; total: number; igrejas: Igreja[] };

function agruparPorIgreja(rows: Row[]): Igreja[] {
  const map = new Map<string, Igreja>();
  for (const r of rows) {
    const key = r.church_id ?? "SEM_IGREJA";
    const nome = r.churches?.name ?? r.campo_ministerio_nome ?? "Sem igreja definida";
    if (!map.has(key)) map.set(key, { key, nome, alunos: [] });
    map.get(key)!.alunos.push(r);
  }
  return Array.from(map.values());
}

export default function AlunosListClient({ rows, setores }: { rows: Row[]; setores: SetorItem[] }) {
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("");

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

  const categorias = useMemo(() => {
    if (modoBusca) return [];
    const setorMap = new Map<string, Row[]>();
    const setorNomes = new Map<string, string>();
    const regionalMap = new Map<string, Row[]>();
    const regionalNomes = new Map<string, string>();
    const sedeRows: Row[] = [];

    for (const r of rowsFiltradas) {
      const ehSede = !!r.churches?.is_sede;
      const ehRegional = !ehSede && r.sectors?.categoria === "REGIONAL";
      if (ehSede) {
        sedeRows.push(r);
      } else if (ehRegional) {
        const key = r.sector_id ?? "SEM_SETOR";
        regionalNomes.set(key, r.sectors?.name ?? "Sem setor definido");
        if (!regionalMap.has(key)) regionalMap.set(key, []);
        regionalMap.get(key)!.push(r);
      } else {
        const key = r.sector_id ?? "SEM_SETOR";
        setorNomes.set(key, r.sectors?.name ?? "Sem setor definido");
        if (!setorMap.has(key)) setorMap.set(key, []);
        setorMap.get(key)!.push(r);
      }
    }

    const montarSubgrupos = (map: Map<string, Row[]>, nomes: Map<string, string>): SubGrupo[] =>
      Array.from(map.entries())
        .map(([key, rows]) => ({ key, nome: nomes.get(key) ?? "Sem setor definido", total: rows.length, igrejas: agruparPorIgreja(rows) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return [
      { chave: "SEDE", nome: "SEDE", total: sedeRows.length, subgrupos: null, igrejas: agruparPorIgreja(sedeRows) },
      { chave: "SETOR", nome: "SETOR", total: Array.from(setorMap.values()).reduce((acc, rows) => acc + rows.length, 0), subgrupos: montarSubgrupos(setorMap, setorNomes), igrejas: null },
      { chave: "REGIONAL", nome: "REGIONAL", total: Array.from(regionalMap.values()).reduce((acc, rows) => acc + rows.length, 0), subgrupos: montarSubgrupos(regionalMap, regionalNomes), igrejas: null },
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
            placeholder="Buscar por nome do aluno..."
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

      {modoBusca ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Matrícula</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Curso pretendido</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Status</span>
          </div>
          {rowsBuscadas.length === 0 ? (
            <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhum aluno encontrado com esse filtro.</div>
          ) : (
            <ul className="divide-y divide-iw-border">
              {rowsBuscadas.map((r) => <li key={r.id}><AlunoRow r={r} /></li>)}
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
                  <span className="text-[15px] font-black text-iw-navy">{cat.total}</span> aluno
                  {cat.total === 1 ? "" : "s"}
                </span>
              </summary>

              {cat.igrejas !== null ? (
                cat.igrejas.length === 0 ? (
                  <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhum aluno nesta categoria.</div>
                ) : (
                  <div className="divide-y divide-iw-border">
                    {cat.igrejas.map((igreja) => (
                      <details key={igreja.key} className="group/igreja">
                        <summary className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                          <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/igreja:rotate-90" />
                            {igreja.nome}
                          </span>
                          <span className="text-[11px] font-bold text-iw-muted">{igreja.alunos.length}</span>
                        </summary>
                        <ul className="divide-y divide-iw-border bg-iw-bg/30">
                          {igreja.alunos.map((r) => <li key={r.id}><AlunoRow r={r} /></li>)}
                        </ul>
                      </details>
                    ))}
                  </div>
                )
              ) : cat.subgrupos!.length === 0 ? (
                <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhum aluno nesta categoria.</div>
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
                          {sub.total} aluno{sub.total === 1 ? "" : "s"}
                        </span>
                      </summary>
                      <div className="divide-y divide-iw-border bg-iw-bg/30">
                        {sub.igrejas.map((igreja) => (
                          <details key={igreja.key} className="group/igreja">
                            <summary className="flex items-center justify-between px-8 py-2 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                              <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                                <ChevronRight className="w-3 h-3 transition-transform group-open/igreja:rotate-90" />
                                {igreja.nome}
                              </span>
                              <span className="text-[11px] font-bold text-iw-muted">{igreja.alunos.length}</span>
                            </summary>
                            <ul className="divide-y divide-iw-border bg-iw-bg/50">
                              {igreja.alunos.map((r) => <li key={r.id}><AlunoRow r={r} /></li>)}
                            </ul>
                          </details>
                        ))}
                      </div>
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
