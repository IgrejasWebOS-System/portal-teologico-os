"use client";

import { useState, useTransition } from "react";
import { UserPlus, CheckCircle2, AlertTriangle } from "lucide-react";
import { inviteStaffAction } from "../../actions";

type UnitOption = { id: string; type: string; name: string };

const NIVEL_LABEL: Record<string, string> = {
  "0": "0 — Super-Master (sem unidade)",
  "1": "1 — Master de Campo",
  "2": "2 — Admin de Sede",
  "3": "3 — Admin de Setor",
  "4": "4 — Usuário Local",
};

export default function InviteStaffForm({ units }: { units: UnitOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const handleSubmit = (formData: FormData) => {
    setResult(null);
    startTransition(async () => {
      const res = await inviteStaffAction(formData);
      setResult(res);
    });
  };

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-border p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-iw-gold" />
        </div>
        <div>
          <h2 className="text-sm font-black text-iw-navy">Convidar novo operador</h2>
          <p className="text-[11px] text-iw-muted">
            Envia um convite por e-mail (Supabase Auth) — a pessoa define a própria
            senha no primeiro acesso. Se o e-mail já tiver conta (ex: já é aluno),
            só adiciona o nível de acesso, sem reenviar convite.
          </p>
        </div>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2 text-sm font-bold px-3.5 py-3 rounded-xl border-2 mb-4 ${
            result.success
              ? "bg-iw-blue/10 text-iw-blue border-iw-blue/40"
              : "bg-iw-error-bg text-iw-error border-iw-error/50"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{result.message ?? (result.success ? "Feito." : "Não foi possível concluir.")}</span>
        </div>
      )}

      <form action={handleSubmit} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
            placeholder="pessoa@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            Nome completo
          </label>
          <input
            type="text"
            name="full_name"
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            Nível de acesso
          </label>
          <select
            name="level"
            defaultValue="4"
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
          >
            {Object.entries(NIVEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            Unidade (Campo/Sede/Setor/Igreja)
          </label>
          <select
            name="unit_id"
            defaultValue=""
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
          >
            <option value="">— Nenhuma (só p/ nível 0) —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.type} · {u.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            Rótulo do papel (opcional)
          </label>
          <input
            type="text"
            name="role_title"
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
            placeholder="Ex: secretário, tesoureiro — só informativo, não afeta o acesso"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-iw-navy text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-iw-navy/90 transition-colors disabled:opacity-60"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isPending ? "Enviando..." : "Enviar convite"}
          </button>
        </div>
      </form>
    </div>
  );
}
