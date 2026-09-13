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
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
          <ImprimirBotao />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl border border-iw-border shadow-sm print:shadow-none print:border-none print:rounded-none p-8 print:p-0">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-iw-border">
            <Logo size="md" variant="dark" />
            <div>
              <p className="font-black text-iw-navy leading-none">CETADP</p>
              <p className="text-xs text-iw-muted mt-1">Centro Educacional Teológico — Assembleia de Deus Piracicaba</p>
            </div>
          </div>

          <h1 className="text-xl font-black text-iw-navy mb-6">{titulo}</h1>

          {children}
        </div>
      </main>
    </div>
  );
}
