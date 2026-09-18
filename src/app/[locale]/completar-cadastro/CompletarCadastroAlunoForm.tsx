"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Phone } from "lucide-react";
import { completarCadastroAlunoAction } from "./actions";

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

function maskPhone(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else v = v.length ? `(${v}` : v;
  return v;
}

export default function CompletarCadastroAlunoForm() {
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!telefone.trim()) return setError("Informe seu telefone.");

    fd.set("telefone", telefone);

    startTransition(async () => {
      const res = await completarCadastroAlunoAction(fd);
      if (res && !res.success) {
        setError(res.message ?? "Erro ao salvar. Tente novamente.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone *</span></label>
        <input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} required />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Concluir cadastro e acessar o portal
      </button>
    </form>
  );
}
