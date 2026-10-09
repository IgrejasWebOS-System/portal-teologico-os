"use client";

import { useState } from "react";
import { CICLOS_TURMA, dataFimPadrao, hojeIso } from "@/utils/turmas/periodo";

// ============================================================
// Campos de período da turma (09/10/2026, pedido do Joaquim): Ciclo +
// Data de início + Data final. A data de início começa no dia do sistema (ou
// no que for digitado/escolhido pelo ciclo) e a data final é preenchida
// sozinha com +12 meses (cursos de 12 meses); ambas continuam editáveis.
// Renderiza 3 itens de grade (fragmento) — o formulário pai fornece o grid.
// ============================================================

export default function PeriodoTurmaFields({
  inputClassName,
  selectClassName,
}: {
  inputClassName: string;
  selectClassName: string;
}) {
  const [inicio, setInicio] = useState<string>(() => hojeIso());
  const [fim, setFim] = useState<string>(() => dataFimPadrao(hojeIso()));
  const [ciclo, setCiclo] = useState<string>("");

  function aoMudarInicio(valor: string) {
    setInicio(valor);
    setCiclo("");
    setFim(dataFimPadrao(valor));
  }

  function aoMudarCiclo(valor: string) {
    setCiclo(valor);
    const c = CICLOS_TURMA.find((x) => x.value === valor);
    if (!c) return; // "Outra data": mantém as datas como estão
    const ano = inicio ? inicio.slice(0, 4) : hojeIso().slice(0, 4);
    const novoInicio = `${ano}-${c.mes}-01`;
    setInicio(novoInicio);
    setFim(dataFimPadrao(novoInicio));
  }

  const rotulo = "text-[11px] font-semibold text-black";

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className={rotulo}>Ciclo de início</span>
        <select value={ciclo} onChange={(e) => aoMudarCiclo(e.target.value)} className={selectClassName}>
          <option value="">Outra data</option>
          {CICLOS_TURMA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={rotulo}>Data de início</span>
        <input
          type="date"
          name="data_inicio"
          value={inicio}
          onChange={(e) => aoMudarInicio(e.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={rotulo}>Data final (12 meses)</span>
        <input
          type="date"
          name="data_fim"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className={inputClassName}
        />
      </label>
    </>
  );
}
