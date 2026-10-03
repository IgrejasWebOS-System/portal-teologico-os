"use client";

// ============================================================
// Filtro de Ano pra tela de Turmas. Até 02/10/2026 este componente também
// tinha Setor/Regional e Igreja em cascata, mas foram substituídos pelos
// 3 blocos SEDE/SETOR/REGIONAL clicáveis (mesmo padrão de
// Professores/Alunos) que aparecem na própria page.tsx depois que o Ano é
// escolhido — não faz sentido ter dois jeitos de filtrar a mesma coisa.
// Navega via query string (?ano=) pra ficar bookmarkável e não depender
// de estado perdido ao recarregar.
//
// 02/10/2026, pedido do Joaquim: caixa do Ano 60% menor, e o total
// (Total Turmas X, composição SEDE/SETOR/REGIONAL do ano escolhido) sai
// do cabeçalho da página e passa a aparecer do lado direito da própria
// caixa do Ano, na mesma linha — só depois que um Ano é selecionado.
// ============================================================

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };

interface Props {
  anos: number[];
  anoAtual: string;
  totalGeral: number;
  totalSede: number;
  totalSetor: number;
  totalRegional: number;
}

const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const cinzel = { fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" };

export default function TurmasFiltros({ anos, anoAtual, totalGeral, totalSede, totalSetor, totalRegional }: Props) {
  const router = useRouter();

  function navegar(ano: string) {
    const qs = new URLSearchParams();
    if (ano) qs.set("ano", ano);
    router.push(`/dashboard/configuracoes/persona/turmas${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  return (
    <div className="bg-iw-surface border border-iw-gold rounded-2xl p-5 flex flex-wrap items-end gap-4">
      <div className="w-32 shrink-0">
        <label className={labelCls}>
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Ano *</span>
        </label>
        <select
          value={anoAtual}
          onChange={(e) => navegar(e.target.value)}
          className={selectCls}
        >
          <option value="">Selecione...</option>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {anoAtual && (
        <p className="text-black text-sm pb-2.5">
          Total Turmas{" "}
          <span className="text-[22px] font-black text-black" style={cinzel}>{totalGeral}</span>
          , composição{" "}
          <span className="text-[20px] font-black uppercase text-black" style={cinzel}>SEDE</span>:{" "}
          <span className="text-[22px] font-black text-black" style={cinzel}>{totalSede}</span>,{" "}
          <span className="text-[20px] font-black uppercase text-black" style={cinzel}>SETOR</span>:{" "}
          <span className="text-[22px] font-black text-black" style={cinzel}>{totalSetor}</span>{" "}
          e{" "}
          <span className="text-[20px] font-black uppercase text-black" style={cinzel}>REGIONAL</span>:{" "}
          <span className="text-[22px] font-black text-black" style={cinzel}>{totalRegional}</span>.
        </p>
      )}
    </div>
  );
}
