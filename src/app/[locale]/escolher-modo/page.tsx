import { ScanLine, LayoutDashboard } from "lucide-react";
import { escolherModoAction } from "./actions";

export default function EscolherModoPage() {
  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
        <div className="text-center">
          <p className="text-xs text-iw-muted mb-1">Acesso pelo celular</p>
          <h1 className="text-lg font-black text-iw-navy tracking-tight">
            Como você quer entrar?
          </h1>
        </div>

        <form action={escolherModoAction} className="space-y-3">
          <button
            type="submit"
            name="modo"
            value="provas"
            className="w-full flex flex-col items-center gap-1.5 rounded-2xl border-2 border-iw-blue bg-iw-blue/10 px-4 py-5 hover:bg-iw-blue/20 transition-colors"
          >
            <ScanLine className="w-6 h-6 text-iw-blue" />
            <span className="text-sm font-bold text-iw-navy">Provas</span>
            <span className="text-xs text-iw-muted">Escanear e corrigir</span>
          </button>

          <button
            type="submit"
            name="modo"
            value="portal"
            className="w-full flex flex-col items-center gap-1.5 rounded-2xl border border-iw-border bg-iw-surface px-4 py-5 hover:bg-iw-bg transition-colors"
          >
            <LayoutDashboard className="w-6 h-6 text-iw-muted" />
            <span className="text-sm font-bold text-iw-navy">Portal</span>
            <span className="text-xs text-iw-muted">Acesso normal</span>
          </button>
        </form>
      </div>
    </div>
  );
}
