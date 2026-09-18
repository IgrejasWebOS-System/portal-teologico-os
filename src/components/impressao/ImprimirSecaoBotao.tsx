"use client";

import { Printer } from "lucide-react";

// ============================================================
// Botão de impressão de UMA seção só (ex.: só o Teste 1, só a Prova
// de uma matéria) — pedido do Joaquim em 14/09/2026: "trazer somente
// o título e a sua direita o botão impressão, imprime somente aquele".
//
// Marca <body data-imprimir-secao="..."> antes de chamar window.print();
// a página usa esse atributo numa regra CSS (@media print) pra esconder
// toda seção [data-secao] que não seja a escolhida. Limpa o atributo
// depois que a caixa de diálogo de impressão fecha ("afterprint").
// ============================================================
export default function ImprimirSecaoBotao({ secaoId, label = "Imprimir" }: { secaoId: string; label?: string }) {
  const imprimir = () => {
    document.body.setAttribute("data-imprimir-secao", secaoId);
    const limpar = () => {
      document.body.removeAttribute("data-imprimir-secao");
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    window.print();
  };

  return (
    <button
      type="button"
      onClick={imprimir}
      className="print:hidden inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy hover:text-iw-navy border border-iw-border rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
    >
      <Printer className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
