"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import MonthlyBarChart from "@/components/admin/dashboard/MonthlyBarChart";

// ============================================================
// Gráficos do Dashboard com caixa seletora de período (10/10/2026, pedido
// do Joaquim): Matrículas (Semanal / Quinzenal / Mensal) e Receita líquida
// (1º–4º trimestre / Semestral / Anual). O servidor manda só as datas
// (matrículas do ano e pagamentos do ano); o agrupamento é feito aqui.
// ============================================================

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const SELECT_CLASS =
  "text-xs font-semibold text-iw-navy bg-iw-surface border border-iw-border rounded-lg px-2 py-1 focus:outline-none focus:border-iw-gold";

function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------
// Matrículas
// ---------------------------------------------------------------
type PeriodoMatriculas = "SEMANAL" | "QUINZENAL" | "MENSAL";

export function GraficoMatriculas({ datas, referencia }: { datas: string[]; referencia: string }) {
  const [periodo, setPeriodo] = useState<PeriodoMatriculas>("MENSAL");

  const { dados, titulo } = useMemo(() => {
    // "Hoje" do gráfico: hoje no ano corrente; 31/12 em anos passados.
    const hoje = new Date(referencia);
    const contagem = new Map<string, number>();
    for (const iso of datas) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      const k = chaveDia(d);
      contagem.set(k, (contagem.get(k) ?? 0) + 1);
    }

    if (periodo === "MENSAL") {
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const lista = Array.from({ length: diasNoMes }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth(), i + 1);
        return { label: String(i + 1), value: contagem.get(chaveDia(d)) ?? 0 };
      });
      const nome = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return { dados: lista, titulo: `Matrículas por dia (${nome})` };
    }

    const qtd = periodo === "SEMANAL" ? 7 : 15;
    const lista = Array.from({ length: qtd }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (qtd - 1 - i));
      return { label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, value: contagem.get(chaveDia(d)) ?? 0 };
    });
    return { dados: lista, titulo: `Matrículas por dia (últimos ${qtd} dias)` };
  }, [datas, periodo, referencia]);

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-iw-navy shrink-0" />
          <h2 className="font-bold text-iw-navy text-[12.5pt] truncate">{titulo}</h2>
        </div>
        <select
          aria-label="Período das matrículas"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoMatriculas)}
          className={SELECT_CLASS}
        >
          <option value="SEMANAL">SEMANAL</option>
          <option value="QUINZENAL">QUINZENAL</option>
          <option value="MENSAL">MENSAL</option>
        </select>
      </div>
      <MonthlyBarChart data={dados} color="bg-iw-blue" compacto={dados.length > 12} />
    </div>
  );
}

// ---------------------------------------------------------------
// Receita líquida
// ---------------------------------------------------------------
type PeriodoReceita = "T1" | "T2" | "T3" | "T4" | "SEMESTRAL" | "ANUAL";

const PERIODOS_RECEITA: { value: PeriodoReceita; label: string }[] = [
  { value: "T1", label: "1º TRIMESTRE" },
  { value: "T2", label: "2º TRIMESTRE" },
  { value: "T3", label: "3º TRIMESTRE" },
  { value: "T4", label: "4º TRIMESTRE" },
  { value: "SEMESTRAL", label: "SEMESTRAL" },
  { value: "ANUAL", label: "ANUAL" },
];

export function GraficoReceita({
  itens,
  ano,
  referencia,
}: {
  itens: { data: string; valor: number }[];
  ano: number;
  referencia: string;
}) {
  const [periodo, setPeriodo] = useState<PeriodoReceita>("ANUAL");

  const { dados, titulo } = useMemo(() => {
    const porMes = Array.from({ length: 12 }, () => 0);
    for (const it of itens) {
      const d = new Date(it.data);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== ano) continue;
      porMes[d.getMonth()] += it.valor;
    }

    let inicio = 0;
    let fim = 12; // exclusivo
    let rotulo = `${ano}`;
    if (periodo === "T1" || periodo === "T2" || periodo === "T3" || periodo === "T4") {
      const n = Number(periodo.slice(1));
      inicio = (n - 1) * 3;
      fim = inicio + 3;
      rotulo = `${n}º trimestre de ${ano}`;
    } else if (periodo === "SEMESTRAL") {
      // semestre corrente (Jan–Jun ou Jul–Dez)
      const s = new Date(referencia).getMonth() < 6 ? 1 : 2;
      inicio = (s - 1) * 6;
      fim = inicio + 6;
      rotulo = `${s}º semestre de ${ano}`;
    }
    // ANUAL: 4 barras (uma por trimestre) em vez de 12 meses — cabe no card e
    // acompanha as opções 1º–4º trimestre (10/10/2026, pedido do Joaquim).
    if (periodo === "ANUAL") {
      const trimestres = [0, 1, 2, 3].map((t) => ({
        label: `${t + 1}º trimestre`,
        value: porMes.slice(t * 3, t * 3 + 3).reduce((s, v) => s + v, 0),
      }));
      return { dados: trimestres, titulo: `Receita líquida por trimestre (${rotulo})` };
    }
    const lista = porMes.slice(inicio, fim).map((value, i) => ({ label: MESES[inicio + i], value }));
    return { dados: lista, titulo: `Receita líquida por mês (${rotulo})` };
  }, [itens, ano, periodo, referencia]);

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-iw-success shrink-0" />
          <h2 className="font-bold text-iw-navy text-[12.5pt] truncate">{titulo}</h2>
        </div>
        <select
          aria-label="Período da receita"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoReceita)}
          className={SELECT_CLASS}
        >
          {PERIODOS_RECEITA.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <MonthlyBarChart data={dados} color="bg-iw-success" formatValue={fmtBRL} />
    </div>
  );
}
