import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { Label, TextInput, PasswordInput } from "@/components/ui";
import CadastroButton from "./CadastroButton";
import { cadastroAction } from "./actions";

interface CadastroPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("auth.cadastro");
  return { title: t("titulo") };
}

// ============================================================
// /cadastro — cadastro público autosserviço, para quem não é
// membro de uma igreja do ministério e quer comprar cursos
// avulsos ou material da biblioteca. Sem aprovação da secretaria
// (diferente de /inscricao) — a conta já nasce ativa; o acesso ao
// conteúdo pago é liberado depois, quando o pagamento é confirmado.
// ============================================================
export default async function CadastroPage({ params, searchParams }: CadastroPageProps) {
  const { locale } = await params;
  const { error, redirectTo } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-iw-muted hover:text-iw-navy text-xs font-medium transition-colors"
          >
            {t("cadastro.voltarInicio")}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            {t("cadastro.titulo")}
          </h1>
          <p className="text-iw-muted text-sm mt-1">
            {t("cadastro.subtitulo")}
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={cadastroAction} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            {redirectTo && (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            )}
            <div>
              <Label htmlFor="nome" required>{t("cadastro.nomeCompleto")}</Label>
              <TextInput
                id="nome"
                name="nome"
                type="text"
                required
                autoComplete="name"
                placeholder={t("cadastro.placeholderNome")}
              />
            </div>

            <div>
              <Label htmlFor="email" required>{t("cadastro.email")}</Label>
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("cadastro.placeholderEmail")}
              />
            </div>

            <div>
              <Label htmlFor="senha" required>{t("cadastro.senha")}</Label>
              <PasswordInput
                id="senha"
                name="senha"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder={t("cadastro.placeholderSenhaMin")}
              />
            </div>

            <div>
              <Label htmlFor="confirmar" required>{t("cadastro.confirmarSenha")}</Label>
              <PasswordInput
                id="confirmar"
                name="confirmar"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder={t("cadastro.placeholderRepitaSenha")}
              />
            </div>

            <CadastroButton />
          </form>

          <p className="text-center text-xs text-iw-muted mt-6">
            {t("cadastro.ehMembro")} <Link href="/inscricao" className="text-iw-gold font-semibold hover:underline">{t("cadastro.facaInscricaoAqui")}</Link>.
          </p>
        </div>

        <p className="text-center text-sm mt-6">
          <Link href="/login" className="text-iw-gold font-semibold hover:underline">
            {t("cadastro.jaTenhoConta")}
          </Link>
        </p>

        <p className="text-center text-iw-muted text-xs mt-6">
          {t("rodape")}
        </p>
      </div>
    </div>
  );
}
