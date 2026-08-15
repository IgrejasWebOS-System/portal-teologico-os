import Logo from "@/components/Logo";
import { Label, PasswordInput } from "@/components/ui";
import DefinirSenhaButton from "./DefinirSenhaButton";
import { definirSenhaAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Definir senha",
};

export default async function DefinirSenhaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Bem-vindo ao CETADP
          </h1>
          <p className="text-iw-muted text-sm mt-1">
            Sua inscrição foi aprovada. Defina sua senha para acessar o
            Portal do Aluno.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={definirSenhaAction} className="flex flex-col gap-5">
            <div>
              <Label htmlFor="password" required>Nova senha</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <Label htmlFor="confirm" required>Confirmar senha</Label>
              <PasswordInput
                id="confirm"
                name="confirm"
                required
                minLength={6}
                placeholder="Repita a senha"
              />
            </div>

            <DefinirSenhaButton />
          </form>
        </div>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
