"use client";

import { useMemo, useState } from "react";
import { Map, X } from "lucide-react";
import { ESTADOS_BR, REGIOES_BR } from "@/utils/estadosBrasil";
import BrasilCartograma, { type CoberturaPorUf } from "./BrasilCartograma";

interface Props {
  cobertura: CoberturaPorUf;
}

const REGIAO_LABEL: Record<string, string> = {
  NORTE: "Norte",
  NORDESTE: "Nordeste",
  "CENTRO-OESTE": "Centro-Oeste",
  SUDESTE: "Sudeste",
  SUL: "Sul",
};

export default function CoberturaNacional({ cobertura }: Props) {
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);

  const totais = useMemo(() => {
    let campos = 0, setores = 0, igrejas = 0, estadosComCobertura = 0;
    for (const e of ESTADOS_BR) {
      const d = cobertura[e.uf];
      if (d && d.campos > 0) {
        campos += d.campos;
        setores += d.setores;
        igrejas += d.igrejas;
        estadosComCobertura++;
      }
    }
    return { campos, setores, igrejas, estadosComCobertura };
  }, [cobertura]);

  const estadosFiltrados = ufSelecionada
    ? ESTADOS_BR.filter((e) => e.uf === ufSelecionada)
    : ESTADOS_BR;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-iw-bg rounded-xl p-3">
          <p className="text-[11px] text-black uppercase tracking-wider font-bold">Estados com Campo</p>
          <p className="text-xl font-black text-black mt-1">{totais.estadosComCobertura}<span className="text-sm text-black font-medium"> / 27</span></p>
        </div>
        <div className="bg-iw-bg rounded-xl p-3">
          <p className="text-[11px] text-black uppercase tracking-wider font-bold">Campos</p>
          <p className="text-xl font-black text-black mt-1">{totais.campos}</p>
        </div>
        <div className="bg-iw-bg rounded-xl p-3">
          <p className="text-[11px] text-black uppercase tracking-wider font-bold">Setores</p>
          <p className="text-xl font-black text-black mt-1">{totais.setores}</p>
        </div>
        <div className="bg-iw-bg rounded-xl p-3">
          <p className="text-[11px] text-black uppercase tracking-wider font-bold">Igrejas / sub-unidades</p>
          <p className="text-xl font-black text-black mt-1">{totais.igrejas}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMostrarMapa((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-white border border-iw-border hover:border-iw-blue text-black text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
        >
          <Map className="w-3.5 h-3.5" />
          {mostrarMapa ? "Ocultar mapa" : "Ver mapa"}
        </button>
        {ufSelecionada && (
          <button
            type="button"
            onClick={() => setUfSelecionada(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:text-iw-error transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtro ({ufSelecionada})
          </button>
        )}
      </div>

      {mostrarMapa && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border p-4">
          <BrasilCartograma cobertura={cobertura} ufSelecionada={ufSelecionada} onSelectUf={setUfSelecionada} />
        </div>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-black uppercase tracking-wider">Estado</span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">Região</span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">Campos</span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">Setores</span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">Igrejas</span>
        </div>
        {REGIOES_BR.map((regiao) => {
          const estadosDaRegiao = estadosFiltrados.filter((e) => e.regiao === regiao);
          if (estadosDaRegiao.length === 0) return null;
          return (
            <div key={regiao}>
              <div className="px-5 py-1.5 bg-iw-bg/60 text-[11px] font-black text-black uppercase tracking-widest">
                {REGIAO_LABEL[regiao]}
              </div>
              <ul className="divide-y divide-iw-border">
                {estadosDaRegiao.map((e) => {
                  const d = cobertura[e.uf];
                  const temCobertura = !!d && d.campos > 0;
                  return (
                    <li
                      key={e.uf}
                      className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-2.5 gap-4 ${
                        temCobertura ? "" : "bg-iw-bg/40"
                      }`}
                    >
                      <span className="text-sm font-semibold text-black">{e.nome} <span className="text-black font-normal">({e.uf})</span></span>
                      <span className="text-xs text-black">{REGIAO_LABEL[e.regiao]}</span>
                      <span className="text-sm text-black text-center">{d?.campos ?? 0}</span>
                      <span className="text-sm text-black text-center">{d?.setores ?? 0}</span>
                      <span className="text-sm text-black text-center">{d?.igrejas ?? 0}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
