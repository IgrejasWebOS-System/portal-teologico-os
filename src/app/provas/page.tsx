import { ScanLine } from "lucide-react";

export default function ProvasPage() {
  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 text-center space-y-3">
        <ScanLine className="w-8 h-8 text-iw-blue mx-auto" />
        <h1 className="text-lg font-black text-iw-navy tracking-tight">
          Scanner de provas
        </h1>
        <p className="text-sm text-iw-muted">
          Em construção — a leitura por câmera e QR code chega nas próximas etapas.
        </p>
      </div>
    </div>
  );
}
