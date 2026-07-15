import Link from "next/link";
import Logo from "@/components/Logo";
import { Label, TextInput, PasswordInput } from "@/components/ui";
import CadastroButton from "./CadastroButton";
import { cadastroAction } from "./actions";

interface CadastroPageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Criar Conta",
};

// ============================================================
// /cadastro — cadastro público autosserviço, para quem não é
// membro de uma igreja do ministério e quer comprar cursos
// avulsos ou material da biblioteca. Sem aprovação da secretaria
// (diferente de /inscricao) — a conta já nasce ativa; o acesso ao
// conteúdo pago é liberado depois, quando o pagamento é confirmado.
// ============================================================
export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  const { error } = await searchParams;

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

        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="lg" variant="dark" shape="circle" />
          </div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Criar conta
          </h1>
          <p className="text-iw-muted text-sm mt-1">
            Para comprar cursos avulsos e material da biblioteca do CETADP.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-[var(--shadow-lg)] p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={cadastroAction} className="flex flex-col gap-5">
            <div>
              <Label htmlFor="nome" required>Nome completo</Label>
              <TextInput
                id="nome"
                name="nome"
                type="text"
                required
                autoComplete="name"
                placeholder="Seu nome completo"
              />
            </div>

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
              <Label htmlFor="senha" required>Senha</Label>
              <PasswordInput
                id="senha"
                name="senha"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <Label htmlFor="confirmar" required>Confirmar senha</Label>
              <PasswordInput
                id="confirmar"
                name="confirmar"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Repita a senha"
              />
            </div>

            <CadastroButton />
          </form>

          <p className="text-center text-xs text-iw-muted mt-6">
            É membro de uma igreja do ministério e quer o curso teológico
            oficial? <Link href="/inscricao" className="text-iw-gold font-semibold hover:underline">Faça sua inscrição aqui</Link>.
          </p>
        </div>

        <p className="text-center text-sm mt-6">
          <Link href="/login" className="text-iw-gold font-semibold hover:underline">
            Já tenho conta — fazer login
          </Link>
        </p>

        <p className="text-center text-iw-muted text-xs mt-6">
          CETADP · Portal EAD de Teologia · IgrejasWebOS
        </p>
      </div>
    </div>
  );
}
