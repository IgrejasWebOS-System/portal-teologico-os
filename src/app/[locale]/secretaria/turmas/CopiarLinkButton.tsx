"use client";

// Botão "Copiar link" — mesmo componente usado em
// /professor/TurmasDoProfessor.tsx, extraído aqui porque a página de
// Turmas da Secretaria é Server Component (não pode ter useState direto).
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopiarLinkButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // clipboard indisponível — o link ainda fica visível pra copiar manualmente.
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-black bg-white border border-iw-gold rounded-lg px-3 py-1.5 shadow-sm hover:bg-iw-gold/10 transition-colors shrink-0"
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
