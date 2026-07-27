import Link from "next/link";
import { ArrowLeft, Building } from "lucide-react";
import CampoForm from "../CampoForm";

export default function NovoCampoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard/configuracoes/acessos/campos"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Campos / Ministérios
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E88D0C] flex items-center justify-center shrink-0">
            <Building className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Novo Campo</h1>
            <p className="text-iw-muted text-xs mt-0.5">Cria o Campo, a Sede e a igreja da Sede juntos.</p>
          </div>
        </div>
      </div>

      <CampoForm submitLabel="Cadastrar Campo" />
    </div>
  );
}
