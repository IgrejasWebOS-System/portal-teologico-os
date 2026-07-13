import { ShieldAlert } from "lucide-react";

export default function AcessoRestrito() {
  return (
    <div className="max-w-lg mx-auto mt-16 bg-iw-surface border border-iw-error/30 rounded-2xl p-8 text-center">
      <ShieldAlert className="w-10 h-10 text-iw-error mx-auto mb-3" />
      <h1 className="text-lg font-bold text-iw-navy mb-1">Acesso restrito</h1>
      <p className="text-iw-muted text-sm">
        Esta área é exclusiva da secretaria do CETADP. Fale com um
        administrador do sistema se você acredita que deveria ter acesso.
      </p>
    </div>
  );
}
