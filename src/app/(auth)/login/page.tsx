import { loginAction } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-navy px-4">
      {/* Logo / Branding */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-iw-blue/20 border-2 border-iw-sky mb-4">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              className="w-10 h-10"
              aria-hidden="true"
            >
              <path
                d="M20 4 L20 16 M14 10 L26 10"
                stroke="#86BBD8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="10"
                y="16"
                width="20"
                height="16"
                rx="1"
                fill="#4A90C2"
                opacity="0.8"
              />
              <rect
                x="15"
                y="22"
                width="10"
                height="10"
                rx="0.5"
                fill="#1A435B"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Portal Teológico
          </h1>
          <p className="text-iw-sky text-sm mt-1">
            Igrejas · Escola · Cursos
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-iw-navy mb-6">
            Acesse sua conta
          </h2>

          {/* Erro de autenticação */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={loginAction} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-iw-navy mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-iw-border text-iw-navy bg-iw-bg placeholder:text-iw-muted focus:outline-none focus:ring-2 focus:ring-iw-blue focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-iw-navy mb-1.5"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-iw-border text-iw-navy bg-iw-bg placeholder:text-iw-muted focus:outline-none focus:ring-2 focus:ring-iw-blue focus:border-transparent transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-iw-blue hover:bg-iw-navy text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-iw-blue focus:ring-offset-2 mt-2"
            >
              Entrar
            </button>
          </form>

          <p className="text-center text-xs text-iw-muted mt-6">
            Problemas para acessar? Fale com o administrador do sistema.
          </p>
        </div>

        <p className="text-center text-iw-sky/60 text-xs mt-6">
          IgrejasWebOS · Portal Teológico v1.0
        </p>
      </div>
    </div>
  );
}
