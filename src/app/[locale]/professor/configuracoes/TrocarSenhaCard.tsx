"use client";

// ============================================================
// Trocar senha (28/09/2026, pedido do Joaquim): professor não tinha como
// trocar a própria senha em nenhuma tela — só existia /trocar-senha, mas
// essa é a tela de troca OBRIGATÓRIA (redirect do middleware quando
// must_change_password=true), não dá pra acessar por vontade própria
// depois de já ter senha definida. Aqui é opcional, a qualquer momento,
// mesmo padrão de validação de src/utils/senha.ts + supabase.auth.updateUser
// (client-side, com a sessão já autenticada do próprio professor).
// ============================================================

import { useState, useTransition } from "react";
import { KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { validarSenha, REGRA_SENHA_TEXTO } from "@/utils/senha";

const boxCls =
  "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-black uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-black placeholder-black/50 focus:outline-none focus:ring-0";

export default function TrocarSenhaCard() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [isPending, startTransition] = useTransition();
  // 28/09/2026, pedido do Joaquim: olhinho de mostrar/ocultar em cada
  // campo, independente um do outro (a pessoa pode conferir só um por vez).
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    const { valido, mensagem } = validarSenha(senha);
    if (!valido) {
      setErro(mensagem);
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
      setSenha("");
      setConfirmar("");
      setSucesso(true);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 max-w-2xl space-y-4 mt-6"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-iw-gold" />
        <h2 className="text-sm font-black text-black">Trocar senha</h2>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className={`${boxCls} col-span-12 md:col-span-6 flex items-end gap-2`}>
          <div className="flex-1 min-w-0">
            <label className={boxLabelCls}>Nova senha</label>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
              className={bareCls}
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="shrink-0 text-black/50 hover:text-black transition-colors"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className={`${boxCls} col-span-12 md:col-span-6 flex items-end gap-2`}>
          <div className="flex-1 min-w-0">
            <label className={boxLabelCls}>Confirmar nova senha</label>
            <input
              type={mostrarConfirmar ? "text" : "password"}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={8}
              className={bareCls}
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarConfirmar((v) => !v)}
            className="shrink-0 text-black/50 hover:text-black transition-colors"
            aria-label={mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-black/60">{REGRA_SENHA_TEXTO}</p>

      {erro && <p className="text-xs text-iw-error">{erro}</p>}
      {sucesso && (
        <p className="flex items-center gap-1.5 text-xs text-iw-success font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Senha alterada com sucesso.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
      >
        <KeyRound className="w-4 h-4" /> {isPending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
