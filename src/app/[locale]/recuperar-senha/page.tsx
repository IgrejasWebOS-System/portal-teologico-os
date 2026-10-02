import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { Label, TextInput } from "@/components/ui";
import RecuperarSenhaButton from "./RecuperarSenhaButton";
import { recuperarSenhaAction } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("auth.recuperarSenha");
  return { title: t("titulo") };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function RecuperarSenhaPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("recuperarSenha.voltarLogin")}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            {t("recuperarSenha.titulo")}
          </h1>
          <p className="text-[#0D0D0D] text-sm mt-1">
            {t("recuperarSenha.subtitulo")}
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={recuperarSenhaAction} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            <div>
              <Label htmlFor="email" required>{t("recuperarSenha.email")}</Label>
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("recuperarSenha.placeholderEmail")}
              />
            </div>

            <RecuperarSenhaButton />
          </form>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          {t("rodape")}
        </p>
      </div>
    </div>
  );
}
