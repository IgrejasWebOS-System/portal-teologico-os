import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata = {
  title: "Inscrição enviada",
};

export default function InscricaoObrigadoPage() {
  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-iw-success-bg flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-iw-success" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Inscrição enviada com sucesso!
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            A secretaria do CETADP vai analisar seus dados. Assim que sua
            inscrição for aprovada, você receberá sua matrícula e as
            instruções de acesso no e-mail informado.
          </p>
          <Link
            href="/"
            className="inline-block bg-iw-gold hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity"
          >
            Voltar para o início
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
