"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clearMustChangePasswordAction } from "./actions";

// M9b — tela de troca obrigatória de senha, destino do redirect feito
// pelo middleware quando profiles.must_change_password = true (usuário
// recém-convidado via inviteStaffAction). Sem senha padrão compartilhada
// entre contas: cada pessoa define a própria senha aqui, uma vez.
export default function TrocarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        setErro(error.message);
        return;
      }
      await clearMustChangePasswordAction();
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-iw-bg px-4">
      <div className="w-full max-w-sm bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-base font-black text-iw-navy tracking-tight">Defina sua senha</h1>
            <p className="text-xs text-iw-muted mt-0.5">
              Antes de continuar, troque a senha temporária do convite.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
            />
          </div>

          {erro && <p className="text-xs text-iw-error">{erro}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-iw-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-iw-navy/90 transition-colors disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
