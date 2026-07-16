import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata = {
  title: "Inscrição enviada",
};

interface PageProps {
  searchParams: Promise<{ matricula?: string }>;
}

export default async function InscricaoObrigadoPage({ searchParams }: PageProps) {
  const { matricula } = await searchParams;

  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-iw-success-bg flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-iw-success" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Matrícula confirmada!
          </h1>
          {matricula && (
            <p className="text-iw-gold font-black text-lg mb-2">{matricula}</p>
          )}
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            Sua matrícula já está ativa. Enviamos um e-mail com o link para você
            definir sua senha e acessar o Portal do Aluno.
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
