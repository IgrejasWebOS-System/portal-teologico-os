import Link from "next/link";
import Logo from "@/components/Logo";
import { Label, TextInput, PasswordInput } from "@/components/ui";
import LoginButton from "./LoginButton";
import { loginAction } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

export const metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, redirectTo } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-iw-muted hover:text-iw-navy text-xs font-medium transition-colors"
          >
            ← Voltar para o início
          </Link>
        </div>

        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            CETADP
          </h1>
          <p className="text-iw-muted text-sm mt-1">
            Portal do Aluno · Centro Educacional Teológico
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-iw-navy mb-6">
            Acesse sua conta
          </h2>

          {/* Erro de autenticação */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={loginAction} className="flex flex-col gap-5">
            {redirectTo && (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            )}
            <div>
              <Label htmlFor="email" required>E-mail</Label>
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="password" required>Senha</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <LoginButton />
          </form>

          <p className="text-center text-xs text-iw-muted mt-6">
            Problemas para acessar? Fale com a secretaria do CETADP.
          </p>
        </div>

        <p className="text-center text-sm mt-6">
          <Link href="/inscricao" className="text-iw-gold font-semibold hover:underline">
            Ainda não é aluno? Inscreva-se
          </Link>
        </p>

        <p className="text-center text-sm mt-2">
          <Link href="/cadastro" className="text-iw-muted font-medium hover:underline">
            Não é membro do ministério? Crie uma conta para comprar cursos avulsos
          </Link>
        </p>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
