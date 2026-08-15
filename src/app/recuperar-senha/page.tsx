import Link from "next/link";
import Logo from "@/components/Logo";
import { Label, TextInput } from "@/components/ui";
import RecuperarSenhaButton from "./RecuperarSenhaButton";
import { recuperarSenhaAction } from "./actions";

export const metadata = {
  title: "Recuperar senha",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RecuperarSenhaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-iw-muted hover:text-iw-navy text-xs font-medium transition-colors"
          >
            ← Voltar para o login
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-iw-muted text-sm mt-1">
            Informe o e-mail da sua conta. Enviaremos um link para você
            definir uma nova senha.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={recuperarSenhaAction} className="flex flex-col gap-5">
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

            <RecuperarSenhaButton />
          </form>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
