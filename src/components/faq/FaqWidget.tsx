"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X, Search, MessageCircleQuestion } from "lucide-react";
import { searchFaqItemsAction, type FaqCategoria, type FaqItem } from "./actions";

export default function FaqWidget({
  categoriasIniciais,
}: {
  categoriasIniciais: FaqCategoria[];
}) {
  const [open, setOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca só roda enquanto o widget está aberto — sem carga extra em
  // toda página só por o componente estar montado no layout raiz.
  useEffect(() => {
    if (!open) return;

    let ativo = true;
    const timer = setTimeout(async () => {
      if (!ativo) return;
      setLoading(true);
      const resultado = await searchFaqItemsAction(categoriaId, query);
      if (ativo) {
        setItems(resultado);
        setLoading(false);
      }
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [open, categoriaId, query]);

  if (categoriasIniciais.length === 0) return null;

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-black border-2 border-[#E88D0C] text-white shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Central de Ajuda"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircleQuestion className="w-6 h-6" />}
      </button>

      {/* Painel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[22rem] max-w-[calc(100vw-3rem)] max-h-[70vh] bg-white rounded-2xl border border-iw-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-iw-navy shrink-0">
            <HelpCircle className="w-5 h-5 text-iw-gold shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Central de Ajuda</p>
              <p className="text-iw-sky/60 text-[11px]">Perguntas frequentes</p>
            </div>
          </div>

          {/* Busca */}
          <div className="px-3 pt-3 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-iw-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite sua dúvida..."
                className="w-full bg-iw-bg border border-iw-border rounded-xl pl-8 pr-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Categorias */}
          <div className="flex gap-1.5 px-3 pt-2.5 pb-1 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setCategoriaId(null)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                categoriaId === null
                  ? "bg-iw-navy text-white"
                  : "bg-iw-bg text-iw-muted hover:bg-iw-border"
              }`}
            >
              Todas
            </button>
            {categoriasIniciais.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaId(cat.id)}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                  categoriaId === cat.id
                    ? "bg-iw-navy text-white"
                    : "bg-iw-bg text-iw-muted hover:bg-iw-border"
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {loading ? (
              <p className="text-xs text-iw-muted text-center py-8">Buscando...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-iw-muted text-center py-8">
                Nenhuma pergunta encontrada.
              </p>
            ) : (
              items.map((item) => (
                <details
                  key={item.id}
                  className="bg-iw-bg/60 border border-iw-border rounded-xl overflow-hidden"
                >
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-iw-navy">
                    {item.pergunta}
                  </summary>
                  <p className="px-3 pb-3 text-xs text-black leading-relaxed whitespace-pre-line">
                    {item.resposta}
                  </p>
                </details>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
