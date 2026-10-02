"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, X } from "lucide-react";
import { buscarMembroPorNomeAction, type MembroEncontrado } from "../../actions";

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";

interface Props {
  selecionado: MembroEncontrado | null;
  onSelecionar: (membro: MembroEncontrado | null) => void;
}

/**
 * Busca membro por nome (mínimo 3 letras) e deixa escolher um dos
 * resultados — mesma action já usada em outras telas de Configurações
 * (buscarMembroPorNomeAction), só que aqui a UI é de autocomplete em vez
 * de preencher um formulário de matrícula.
 */
export default function BuscaMembroSetor({ selecionado, onSelecionar }: Props) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<MembroEncontrado[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const buscar = (valor: string) => {
    setTermo(valor);
    setMensagem("");
    if (valor.trim().length < 3) {
      setResultados([]);
      return;
    }
    startTransition(async () => {
      const res = await buscarMembroPorNomeAction(valor);
      if (res.success && res.data) {
        setResultados(res.data);
      } else {
        setResultados([]);
        setMensagem(res.message ?? "Nenhum membro encontrado.");
      }
    });
  };

  if (selecionado) {
    return (
      <div className="flex items-center justify-between gap-2 bg-iw-bg border border-iw-border rounded-xl px-3 py-2.5">
        <div className="min-w-0 text-sm">
          <span className="font-bold text-iw-navy">{selecionado.full_name}</span>
          {selecionado.cargo && <span className="text-iw-muted"> · {selecionado.cargo}</span>}
        </div>
        <button
          type="button"
          onClick={() => onSelecionar(null)}
          className="shrink-0 text-iw-muted hover:text-iw-error transition-colors"
          title="Trocar membro"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={termo}
          onChange={(e) => buscar(e.target.value)}
          placeholder="Buscar membro pelo nome..."
          className={inputCls}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-iw-muted">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </span>
      </div>

      {mensagem && <p className="mt-1.5 text-[11px] font-semibold text-iw-error">{mensagem}</p>}

      {resultados.length > 0 && (
        <ul className="absolute z-10 mt-1.5 w-full bg-white border border-iw-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {resultados.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onSelecionar(m);
                  setTermo("");
                  setResultados([]);
                }}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-iw-bg transition-colors border-b border-iw-border last:border-0"
              >
                <span className="font-bold text-iw-navy">{m.full_name}</span>
                {m.cargo && <span className="text-iw-muted text-xs"> · {m.cargo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
