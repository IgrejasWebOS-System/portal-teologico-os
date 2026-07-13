import Link from "next/link";
import { ArrowLeft, CalendarClock, Construction } from "lucide-react";

export const metadata = { title: "Ocorrências — Igreja" };

export default function OcorrenciasPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Visão Geral
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <p className="text-iw-muted text-sm">Dossiê disciplinar e registros de ocorrências.</p>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Ocorrências</h1>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-iw-gold/10 flex items-center justify-center mx-auto mb-4">
          <CalendarClock className="w-7 h-7 text-iw-gold" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Construction className="w-4 h-4 text-iw-muted" />
          <p className="text-sm font-bold text-iw-navy">Módulo em Desenvolvimento</p>
        </div>
        <p className="text-xs text-iw-muted max-w-sm mx-auto leading-relaxed">
          O registro de ocorrências disciplinares e pastorais será implementado em breve.
          Esta seção permitirá documentar advertências, disciplinas e acompanhamentos individuais.
        </p>
      </div>
    </div>
  );
}
