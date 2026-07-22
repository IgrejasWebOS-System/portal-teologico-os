"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function LinkPagamentoBanner({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — o campo de texto abaixo já permite selecionar manualmente
    }
  }

  return (
    <div className="px-4 py-3 rounded-lg bg-iw-blue/10 border border-iw-blue/30 text-iw-navy text-sm space-y-2">
      <p className="font-bold">Link de pagamento (Mercado Pago) gerado — copie e envie ao aluno:</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-[240px] bg-white border border-iw-border rounded-lg px-3 py-2 text-xs text-iw-navy"
        />
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1.5 bg-iw-blue hover:bg-iw-navy text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
        >
          {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? "Copiado!" : "Copiar"}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-iw-navy/30 hover:border-iw-navy text-iw-navy text-xs font-bold px-3 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}
