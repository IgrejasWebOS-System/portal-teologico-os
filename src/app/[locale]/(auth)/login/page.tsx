import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { Label, TextInput, PasswordInput } from "@/components/ui";
import LoginButton from "./LoginButton";
import { loginAction } from "./actions";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("auth.login");
  return { title: t("entrar") };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { error, redirectTo } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-black hover:text-iw-navy text-sm font-medium transition-colors"
          >
            {t("login.voltarInicio")}
          </Link>
        </div>

        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            {t("login.titulo")}
          </h1>
          <p className="text-black text-base mt-1">
            {t("login.subtitulo")}
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-black mb-6">
            {t("login.acesseSuaConta")}
          </h2>

          {/* Erro de autenticação */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={loginAction} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            {redirectTo && (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            )}
            <div>
              <Label htmlFor="email" required className="text-sm text-black">{t("login.email")}</Label>
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("login.placeholderEmail")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" required className="text-sm text-black">{t("login.senha")}</Label>
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-bold text-black hover:underline"
                >
                  {t("login.esqueciSenha")}
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder={t("login.placeholderSenha")}
              />
            </div>

            <LoginButton />
          </form>

          <p className="text-center text-sm text-black mt-6">
            {t("login.problemasAcesso")}
          </p>
        </div>

        <p className="text-center text-base mt-6">
          <Link href="/inscricao" className="text-black font-semibold hover:underline">
            {t("login.aindaNaoAluno")}
          </Link>
        </p>

        <p className="text-center text-base mt-2">
          <Link href="/cadastro" className="text-black font-medium hover:underline">
            {t("login.naoMembro")}
          </Link>
        </p>

        <p className="text-center text-black text-sm mt-6">
          {t("rodape")}
        </p>
      </div>
    </div>
  );
}
