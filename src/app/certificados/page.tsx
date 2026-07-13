import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata = {
  title: "Validar Certificado",
};

// TODO (fora do escopo do MVP para o pitch de 24/07): esta página é um
// placeholder. A validação real depende de um módulo de certificados
// (emissão + código público de verificação) ainda não implementado.
export default function CertificadosPage() {
  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
            <BadgeCheck className="w-7 h-7 text-iw-gold" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Validação de Certificados
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            Em breve você poderá validar aqui a autenticidade de certificados
            emitidos pelo CETADP. Este módulo está no roteiro do Portal EAD.
          </p>
          <Link
            href="/"
            className="inline-block border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Voltar para o início
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
