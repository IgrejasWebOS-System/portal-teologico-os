import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import ImprimirBotao from "./ImprimirBotao";

// ============================================================
// Casca comum das telas de Impressão (Ficha, Testes, Prova,
// Declaração, Certificado) — cabeçalho institucional + botão
// voltar (some na impressão) + botão imprimir, e uma faixa de
// papel branca central que é o que efetivamente sai impresso.
// ============================================================
export default function ImpressaoShell({
  titulo,
  voltarPara = "/escola",
  children,
}: {
  titulo: string;
  voltarPara?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-iw-bg print:bg-white">
      <header className="print:hidden bg-iw-navy shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={voltarPara}
            className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLTAR
          </Link>
          <ImprimirBotao />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl border border-iw-border shadow-sm print:shadow-none print:border-none print:rounded-none p-8 print:p-0">
          {/* Cabeçalho institucional padrão — mesmo modelo da MATRIZ FICHA
              ALUNO (formulário de matrícula): logo + "CETADP — Título" +
              subtítulo, com régua dourada embaixo. Vale pra todas as
              páginas de Impressão (Ficha, Testes, Prova, Declaração,
              Certificado, IRPF) — 14/09/2026. */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-[1.5px] border-[#E88D0C]">
            <Logo size="md" variant="dark" />
            <div>
              <h1 className="font-black text-iw-navy leading-none text-lg">CETADP — {titulo}</h1>
              <p className="text-xs text-iw-muted mt-1">
                Centro Educacional Teológico das Assembleias de Deus Piracicaba
              </p>
            </div>
          </div>

          {children}

          {/* Rodapé institucional padrão — mesmo endereço/contato da MATRIZ
              FICHA ALUNO, em todas as páginas de Impressão. */}
          <footer className="mt-10 pt-4 border-t border-iw-border text-center text-[10px] text-iw-muted/80 leading-relaxed print:mt-6">
            <p>Rua Alfredo Guedes, 1950 — Bairro Alto — Piracicaba — SP — 13.419-080</p>
            <p>Tel./WhatsApp: (19) 99812-1950 · www.cetadp.teo.br</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
