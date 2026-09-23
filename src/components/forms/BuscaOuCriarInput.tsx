"use client";

// ============================================================
// Campo de busca com dropdown ancorado, com opção de "usar mesmo assim"
// quando não encontra (permitirLivre) — extraído de
// admin/matriculas/nova/NovaMatriculaForm.tsx em 20/09/2026 (pedido do
// Joaquim) pra poder ser reaproveitado também na ficha do aluno
// (EditarMatriculaForm.tsx, campo Profissão) sem duplicar a lógica de
// busca/seleção. Cada consumidor continua livre pra escolher seu
// próprio wrapper visual (Field/label/span) — este componente só
// resolve o input + dropdown de busca.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface ItemBusca {
  id: string;
  label: string;
  sublabel?: string;
}

function SeletorBuscaDropdown({
  titulo, valorInicial, itens, onFechar, onSelecionar, placeholder, permitirLivre,
}: {
  titulo: string;
  valorInicial: string;
  itens: ItemBusca[];
  onFechar: () => void;
  onSelecionar: (item: ItemBusca) => void;
  placeholder?: string;
  permitirLivre?: boolean;
}) {
  const [busca, setBusca] = useState(valorInicial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens.slice(0, 50);
    return itens.filter((i) => i.label.toLowerCase().startsWith(q)).slice(0, 50);
  }, [busca, itens]);

  return (
    <>
      {/* Camada invisível atrás do dropdown — clicar fora fecha, sem
          escurecer/tampar o resto da tela como um modal faria. */}
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      {/* 21/09/2026, achado em teste (Ana Magna, imagem naturalidade): em
          campos estreitos (ex.: Naturalidade — cidade, col-span-2), o
          dropdown herdava a largura do campo e os nomes de cidade
          quebravam linha e pareciam "cortados" (ex.: "São Paulo de
          Olivença" some no meio). min-w garante espaço suficiente pro
          texto mesmo quando o campo-gatilho é estreito; left-0/right-0
          continuam garantindo que ele nunca fique mais estreito que o
          próprio campo. */}
      <div className="absolute z-50 left-0 right-0 top-full mt-1 min-w-[280px] bg-white border border-iw-border rounded-xl shadow-lg flex flex-col max-h-80 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-iw-border shrink-0">
          <Search className="w-3.5 h-3.5 text-iw-muted shrink-0" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder ?? `Buscar ${titulo.toLowerCase()}...`}
            autoComplete="off"
            className="flex-1 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none py-1 bg-transparent"
          />
        </div>

        <ul className="flex-1 overflow-auto">
          {resultados.length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-iw-muted">
              Nenhum resultado encontrado{permitirLivre ? " — pode usar o botão abaixo" : ""}.
            </li>
          )}
          {resultados.map((item) => (
            <li key={item.id} className="border-b border-iw-border/60 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelecionar(item)}
                className="w-full text-left px-3 py-2 text-sm text-iw-navy hover:bg-iw-bg active:bg-iw-gold/10"
              >
                {item.label}
                {item.sublabel && <span className="text-iw-muted text-xs"> — {item.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>

        {permitirLivre && busca.trim().length > 0 && (
          <div className="p-2 border-t border-iw-border shrink-0">
            <button
              type="button"
              onClick={() => onSelecionar({ id: busca.trim(), label: busca.trim() })}
              className="w-full text-center text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 px-3 py-2 rounded-lg transition-colors"
            >
              Usar &ldquo;{busca.trim()}&rdquo; mesmo assim
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Componente "bare" — só o input somente-leitura + dropdown de busca, sem
// nenhum wrapper de label/borda. Cada tela usa seu próprio Field por cima
// (ver uso em NovaMatriculaForm.tsx e EditarMatriculaForm.tsx).
export function BuscaOuCriarInput({
  name, defaultValue = "", itens, placeholder, permitirLivre, className, onValorChange, required,
}: {
  name?: string;
  defaultValue?: string;
  itens: ItemBusca[];
  placeholder?: string;
  permitirLivre?: boolean;
  className?: string;
  onValorChange?: (valor: string) => void;
  // 21/09/2026, achado em teste: campos como Escolaridade precisam ser
  // obrigatórios em selfService — readOnly não impede o `required` nativo
  // de funcionar, já que o valor é setado por JS (onSelecionar), não digitado.
  required?: boolean;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        value={valor}
        readOnly
        required={required}
        onClick={() => setAberto(true)}
        placeholder={placeholder}
        className={className ?? "w-full bg-transparent border-none p-0 text-sm text-iw-navy cursor-pointer uppercase focus:outline-none"}
      />
      {aberto && (
        <SeletorBuscaDropdown
          titulo={placeholder ?? "item"}
          valorInicial={valor}
          itens={itens}
          permitirLivre={permitirLivre}
          placeholder={placeholder}
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            const novoValor = item.label.toUpperCase();
            setValor(novoValor);
            setAberto(false);
            onValorChange?.(novoValor);
          }}
        />
      )}
    </div>
  );
}

export { SeletorBuscaDropdown };
