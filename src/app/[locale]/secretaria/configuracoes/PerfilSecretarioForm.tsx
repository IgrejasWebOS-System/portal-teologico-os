"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, UserCog } from "lucide-react";
import { secretariaAtualizarPerfilAction } from "../actions";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-black text-iw-gold font-bold text-sm px-5 py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export default function PerfilSecretarioForm({
  nomeInicial,
  email,
  roleTitle,
  unidadeNome,
}: {
  nomeInicial: string;
  email: string | null;
  roleTitle: string | null;
  unidadeNome: string | null;
}) {
  const [nome, setNome] = useState(nomeInicial);

  return (
    <form action={secretariaAtualizarPerfilAction} className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <UserCog className="w-4 h-4 text-iw-gold" />
        <h2 className="text-sm font-black text-black">Meus dados</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-iw-muted mb-1">Nome completo</label>
          <input
            name="full_name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm text-black"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-iw-muted mb-1">E-mail de login</label>
          <input
            value={email ?? "—"}
            disabled
            className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm text-black/60 bg-iw-bg cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-iw-muted mb-1">Cargo</label>
          <input
            value={roleTitle ?? "Secretário"}
            disabled
            className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm text-black/60 bg-iw-bg cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-iw-muted mb-1">Unidade</label>
          <input
            value={unidadeNome ?? "—"}
            disabled
            className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm text-black/60 bg-iw-bg cursor-not-allowed"
          />
        </div>
      </div>

      <p className="text-[11px] text-black/60">Cargo e unidade são definidos pelo administrador — fale com a secretaria geral pra alterar.</p>

      <BotaoSalvar />
    </form>
  );
}
