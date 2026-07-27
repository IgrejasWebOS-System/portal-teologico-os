"use client";

import { ESTADOS_BR } from "@/utils/estadosBrasil";

export type CoberturaPorUf = Record<string, { campos: number; setores: number; igrejas: number }>;

interface Props {
  cobertura: CoberturaPorUf;
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
}

export default function BrasilCartograma({ cobertura, ufSelecionada, onSelectUf }: Props) {
  const maxRow = Math.max(...ESTADOS_BR.map((e) => e.row)) + 1;
  const maxCol = Math.max(...ESTADOS_BR.map((e) => e.col)) + 1;

  return (
    <div className="space-y-2">
      <div
        className="grid gap-1"
        style={{
          gridTemplateRows: `repeat(${maxRow}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
        }}
      >
        {ESTADOS_BR.map((e) => {
          const dados = cobertura[e.uf];
          const temCobertura = !!dados && dados.campos > 0;
          const selecionado = ufSelecionada === e.uf;
          return (
            <button
              key={e.uf}
              type="button"
              onClick={() => onSelectUf(selecionado ? null : e.uf)}
              title={`${e.nome}${dados ? ` — ${dados.campos} campo(s), ${dados.setores} setor(es), ${dados.igrejas} igreja(s)` : " — sem cobertura"}`}
              style={{ gridRow: e.row + 1, gridColumn: e.col + 1 }}
              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold uppercase transition-colors border ${
                selecionado
                  ? "bg-iw-navy text-white border-iw-navy"
                  : temCobertura
                  ? "bg-iw-blue/20 text-iw-blue border-iw-blue/30 hover:bg-iw-blue/30"
                  : "bg-iw-bg text-iw-muted/60 border-iw-border hover:bg-iw-border/60"
              }`}
            >
              {e.uf}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-iw-muted">
        Esquemático (posição relativa dos estados, não é o contorno geográfico real). Cor azul = tem Campo cadastrado. Clique num estado pra filtrar a tabela abaixo.
      </p>
    </div>
  );
}
