import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MailCheck } from "lucide-react";
import Logo from "@/components/Logo";

export async function generateMetadata() {
  const t = await getTranslations("auth.confirmeEmail");
  return { title: t("titulo") };
}

export default function ConfirmeEmailPage() {
  const t = useTranslations("auth");
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
            {t("confirmeEmail.titulo")}
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            {t("confirmeEmail.texto")}
          </p>
          <Link
            href="/login"
            className="inline-block border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            {t("confirmeEmail.irParaLogin")}
          </Link>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          {t("rodape")}
        </p>
      </div>
    </div>
  );
}
