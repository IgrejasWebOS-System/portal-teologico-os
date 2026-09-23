import Logo from "@/components/Logo";
import { Label, PasswordInput } from "@/components/ui";
import DefinirSenhaButton from "./DefinirSenhaButton";
import { definirSenhaAction } from "./actions";
import { REGRA_SENHA_TEXTO } from "@/utils/senha";
import { createClient } from "@/utils/supabase/server";
import { checkIsProfessor } from "@/utils/professor";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Definir senha",
};

export default async function DefinirSenhaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  // 21/09/2026, achado em teste (imagem 11): esta tela dizia sempre
  // "Portal do Aluno", mesmo quando quem clicou no convite era um
  // professor (cadastro público em /cadastro-professor) -- confunde quem
  // não é aluno. O link de convite já deixa a pessoa numa sessão
  // temporária, então dá pra checar se é professor e trocar o texto.
  let ehProfessor = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) ehProfessor = !!(await checkIsProfessor(supabase, user.id));
  } catch {
    // sessão ainda não propagada / erro de rede -- cai no texto padrão
    // (aluno), que é o caminho mais comum
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Bem-vindo ao CETADP
          </h1>
          <p className="text-[#0D0D0D] text-sm mt-1">
            {ehProfessor
              ? "Seu cadastro foi aprovado. Defina sua senha para acessar sua Área do Professor."
              : "Sua inscrição foi aprovada. Defina sua senha para acessar o Portal do Aluno."}
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
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-[11px] text-iw-muted mt-1">{REGRA_SENHA_TEXTO}</p>
            </div>

            <div>
              <Label htmlFor="confirm" required>Confirmar senha</Label>
              <PasswordInput
                id="confirm"
                name="confirm"
                required
                minLength={8}
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
