import Logo from "@/components/Logo";
import CadastroProfessorForm from "./CadastroProfessorForm";

export const metadata = { title: "Cadastro de Professor — CETADP" };

// ============================================================
// Rota pública (sem login) — mutirão de cadastro: link enviado a todo
// professor pra ele mesmo criar seu acesso. Reduzida a 4 campos (pedido
// do Joaquim, 20/09/2026) -- Cargo e Campo/Setor/Igreja saíram daqui e
// passaram pra ficha completa de /completar-cadastro, no primeiro login.
// ============================================================

export default function CadastroProfessorPage() {
  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-4">
          <Logo size="md" variant="dark" />
        </div>
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">
            Campo AD Brás Piracicaba
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1">
            Cadastro de Professor
          </h1>
          <p className="text-[#0D0D0D] text-sm mt-2 max-w-md mx-auto">
            Preencha seus dados pra criar seu acesso ao CETADP. Você recebe um e-mail pra
            definir sua senha e, depois de entrar, completa sua ficha.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
          <CadastroProfessorForm />
        </div>
      </div>
    </div>
  );
}
