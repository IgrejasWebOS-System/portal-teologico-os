import Link from "next/link";
import { MailCheck } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Confirme seu e-mail",
};

export default function ConfirmeEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex mb-4">
          <Logo size="lg" variant="dark" shape="circle" />
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-8">
          <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-7 h-7 text-iw-gold" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Confirme seu e-mail
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            Enviamos um link de confirmação para o e-mail informado. Clique
            nele para ativar sua conta e poder fazer login.
          </p>
          <Link
            href="/login"
            className="inline-block border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Ir para o login
          </Link>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
