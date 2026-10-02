"use client";

import { Printer } from "lucide-react";

// Botão simples de imprimir — some no papel via "print:hidden" (o
// próprio Ctrl+P do navegador já oferece "Salvar como PDF", então
// não precisamos gerar PDF no servidor).
export default function ImprimirBotao() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-iw-navy text-white text-sm font-semibold hover:bg-iw-sky hover:text-gray-900 transition-colors"
    >
      <Printer className="w-4 h-4" />
      Imprimir / Salvar PDF
    </button>
  );
}
