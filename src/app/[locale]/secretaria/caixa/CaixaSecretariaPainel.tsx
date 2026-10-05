"use client";

// ============================================================
// CaixaSecretariaPainel — 04/10/2026, Etapa 5 (paridade com
// /professor/caixa → CaixaDoNucleoPainel.tsx). Filtros de mês/turma/
// curso client-side (useState/useMemo) sobre a lista já buscada no
// server, e "Lançar despesa" virou um botão que abre modal (igual o
// professor) em vez do formulário sempre visível. Diferenças do
// professor:
// - cada linha carrega NÚCLEO também (o escopo do secretário cobre
//   vários núcleos ao mesmo tempo);
// - o formulário de lançar despesa tem um select de NÚCLEO (o
//   professor lança sempre pro próprio núcleo, fixo na sessão — o
//   secretário escolhe em qual núcleo do escopo a despesa aconteceu).
// ============================================================

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Ban, Banknote, Plus, X } from "lucide-react";

export type MovimentacaoSecretaria = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  descricao: string;
  valorCentavos: number;
  data: string;
  nucleoNome: string;
  turmaNome: string | null;
  cursoNome: string | null;
  excluivel: boolean;
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CaixaSecretariaPainel({
  movimentacoes,
  categorias,
  nucleos,
  lancarAction,
  excluirAction,
}: {
  movimentacoes: MovimentacaoSecretaria[];
  categorias: { id: string; nome: string }[];
  nucleos: { churchId: string; nome: string }[];
  lancarAction: (formData: FormData) => Promise<void> | void;
  excluirAction: (formData: FormData) => Promise<void> | void;
}) {
  const [aberto, setAberto] = useState(false);
  const [mesFiltro, setMesFiltro] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(movimentacoes.map((m) => m.data.slice(0, 7)))).sort(),
    [movimentacoes]
  );
  const turmasDisponiveis = useMemo(
    () => Array.from(new Set(movimentacoes.map((m) => m.turmaNome).filter((t): t is string => !!t))).sort(),
    [movimentacoes]
  );
  const cursosDisponiveis = useMemo(
    () => Array.from(new Set(movimentacoes.map((m) => m.cursoNome).filter((c): c is string => !!c))).sort(),
    [movimentacoes]
  );

  const movimentacoesFiltradas = useMemo(() => {
    let lista = movimentacoes;
    if (mesFiltro) lista = lista.filter((m) => m.data.slice(0, 7) === mesFiltro);
    if (turmaFiltro) lista = lista.filter((m) => m.turmaNome === turmaFiltro);
    if (cursoFiltro) lista = lista.filter((m) => m.cursoNome === cursoFiltro);
    return lista;
  }, [movimentacoes, mesFiltro, turmaFiltro, cursoFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
          >
            <option value="">Todas as datas</option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
          >
            <option value="">Todas as turmas</option>
            {turmasDisponiveis.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
          >
            <option value="">Todos os cursos</option>
            {cursosDisponiveis.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-black text-iw-gold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Lançar despesa
        </button>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-iw-border bg-iw-bg/50">
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Tipo</th>
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Descrição</th>
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Data</th>
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-right">Valor</th>
              <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-black text-sm">
                  Nenhuma movimentação encontrada com esses filtros.
                </td>
              </tr>
            ) : (
              movimentacoesFiltradas.map((m) => (
                <tr key={`${m.tipo}-${m.id}`} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                  <td className="py-2.5 px-4">
                    {m.tipo === "ENTRADA" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-iw-success">
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-iw-error">
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Saída
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-black">{m.descricao}</td>
                  <td className="py-2.5 px-4 text-black">{m.nucleoNome}</td>
                  <td className="py-2.5 px-4 text-black">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${m.tipo === "ENTRADA" ? "text-iw-success" : "text-iw-error"}`}>
                    {fmt(m.valorCentavos)}
                  </td>
                  <td className="py-2.5 px-4">
                    {m.excluivel ? (
                      <form action={excluirAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-iw-error bg-iw-error/10 border border-iw-error/30 rounded-lg px-3 py-1.5 shadow-sm hover:bg-iw-error/15 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </form>
                    ) : (
                      <span className="text-black text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-black flex items-center gap-2">
                <Banknote className="w-4 h-4 text-iw-gold" /> Lançar despesa
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="text-black/50 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={lancarAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-iw-muted mb-1">Núcleo</label>
                <select name="church_id" required className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white">
                  <option value="">Selecione...</option>
                  {nucleos.map((n) => (
                    <option key={n.churchId} value={n.churchId}>
                      {n.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-iw-muted mb-1">Descrição</label>
                <input name="descricao" required type="text" className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Valor (R$)</label>
                <input
                  name="valor"
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Data</label>
                <input
                  name="data_despesa"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Categoria</label>
                <select name="categoria_id" className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white">
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Forma de pagamento</label>
                <select name="forma_pagamento" className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white">
                  <option value="">—</option>
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-lg border border-iw-border px-4 py-2 text-sm font-semibold text-black hover:bg-iw-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-black text-iw-gold font-semibold text-sm px-4 py-2 hover:opacity-90"
                >
                  <Plus className="w-4 h-4" /> Lançar despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
