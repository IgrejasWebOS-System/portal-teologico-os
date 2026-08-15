import Link from "next/link";
import { MailCheck } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Verifique seu e-mail",
};

export default function ConfirmeRecuperacaoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex mb-4">
          <Logo size="lg" variant="dark" shape="circle" />
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-8">
          <div className="w-14 h-14 rounded-full bg-black border-2 border-[#E88D0C] flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-7 h-7 text-[#E88D0C]" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Verifique seu e-mail
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            Se houver uma conta cadastrada com o e-mail informado, você vai
            receber um link para definir uma nova senha em alguns minutos.
            Confira também a caixa de spam.
          </p>
          <Link
            href="/login"
            className="inline-block border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Voltar para o login
          </Link>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
