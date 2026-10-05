"use client";

// ============================================================
// FinanceiroSecretariaPainel — 04/10/2026, Etapa 5 (paridade com
// /professor/financeiro). Espelha FinanceiroDoNucleoPainel
// (professor/financeiro/FinanceiroDoNucleoPainel.tsx): abas A
// receber/Recebidas/Todas + filtros de mês/turma/curso, tudo client-
// side (useState/useMemo) sobre a lista já buscada no server — zero
// round-trip novo. Diferença: aqui cada linha também carrega o nome do
// NÚCLEO (igreja), porque o escopo do secretário pode abranger vários
// núcleos ao mesmo tempo (o professor só vê o próprio).
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Wallet } from "lucide-react";

export type ParcelaSecretaria = {
  id: string;
  alunoNome: string;
  nucleoNome: string;
  numeroParcela: number;
  totalParcelas: number;
  descricao: string;
  valorCentavos: number;
  dataVencimento: string;
  status: string;
  origemId: string | null;
  origemTipo: string | null;
  turmaNome: string | null;
  cursoNome: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ATRASADO: "Atrasado",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  PENDENTE: "bg-white border border-iw-border text-iw-gold",
  ATRASADO: "bg-iw-error/10 text-iw-error",
  PAGO: "bg-iw-success/10 text-iw-success",
  CANCELADO: "bg-iw-muted/10 text-iw-muted",
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceiroSecretariaPainel({ parcelas }: { parcelas: ParcelaSecretaria[] }) {
  const [filtro, setFiltro] = useState<"PENDENTE" | "PAGO" | "TODAS">("PENDENTE");
  const [mesFiltro, setMesFiltro] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.dataVencimento.slice(0, 7)))).sort(),
    [parcelas]
  );
  const turmasDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.turmaNome).filter((t): t is string => !!t))).sort(),
    [parcelas]
  );
  const cursosDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.cursoNome).filter((c): c is string => !!c))).sort(),
    [parcelas]
  );

  const parcelasFiltradas = useMemo(() => {
    let lista =
      filtro === "TODAS" ? parcelas : parcelas.filter((p) => (filtro === "PAGO" ? p.status === "PAGO" : p.status !== "PAGO"));
    if (mesFiltro) lista = lista.filter((p) => p.dataVencimento.slice(0, 7) === mesFiltro);
    if (turmaFiltro) lista = lista.filter((p) => p.turmaNome === turmaFiltro);
    if (cursoFiltro) lista = lista.filter((p) => p.cursoNome === cursoFiltro);
    return [...lista].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  }, [parcelas, filtro, mesFiltro, turmaFiltro, cursoFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(
            [
              ["PENDENTE", "A receber"],
              ["PAGO", "Recebidas"],
              ["TODAS", "Todas"],
            ] as [typeof filtro, string][]
          ).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                filtro === valor ? "bg-black text-white border-black" : "bg-white text-black border-iw-border hover:bg-iw-bg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
      </div>

      {parcelasFiltradas.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <Wallet className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhuma parcela encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border bg-iw-bg/50">
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Aluno</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Parcela</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Vencimento</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-right">Valor</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Status</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {parcelasFiltradas.map((c) => (
                <tr key={c.id} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                  <td className="py-2.5 px-4 text-black font-medium">{c.alunoNome}</td>
                  <td className="py-2.5 px-4 text-black">{c.nucleoNome}</td>
                  <td className="py-2.5 px-4 text-black">
                    {c.numeroParcela}/{c.totalParcelas} — {c.descricao}
                  </td>
                  <td className="py-2.5 px-4 text-black">{new Date(c.dataVencimento).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2.5 px-4 text-right text-black font-medium">{fmt(c.valorCentavos)}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COR[c.status] ?? "bg-iw-muted/10 text-black"}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {c.origemTipo === "MATRICULA_DIRETA" && c.origemId ? (
                      <Link
                        href={`/admin/matriculas/${c.origemId}?voltarPara=/secretaria/financeiro&voltarLabel=Financeiro`}
                        className={`inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 border shadow-sm transition-colors ${
                          c.status === "PAGO"
                            ? "bg-black border-black text-iw-gold hover:opacity-90"
                            : "bg-iw-error/10 border-iw-error/30 text-iw-error hover:bg-iw-error/15"
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" /> {c.status === "PAGO" ? "Ver" : "Dar baixa"}
                      </Link>
                    ) : (
                      <span className="text-xs text-black">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
