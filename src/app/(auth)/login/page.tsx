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
            className="inline-flex items-center gap-1.5 text-black hover:text-iw-navy text-sm font-medium transition-colors"
          >
            ← Voltar para o início
          </Link>
        </div>

        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            CETADP
          </h1>
          <p className="text-black text-base mt-1">
            Portal do Aluno · Centro Educacional Teológico
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-black mb-6">
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
              <Label htmlFor="email" required className="text-sm text-black">E-mail</Label>
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
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" required className="text-sm text-black">Senha</Label>
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-bold text-iw-blue hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
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

          <p className="text-center text-sm text-black mt-6">
            Problemas para acessar? Fale com a secretaria do CETADP.
          </p>
        </div>

        <p className="text-center text-base mt-6">
          <Link href="/inscricao" className="text-black font-semibold hover:underline">
            Ainda não é aluno? Inscreva-se
          </Link>
        </p>

        <p className="text-center text-base mt-2">
          <Link href="/cadastro" className="text-black font-medium hover:underline">
            Não é membro do ministério? Crie uma conta para comprar cursos avulsos
          </Link>
        </p>

        <p className="text-center text-black text-sm mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
