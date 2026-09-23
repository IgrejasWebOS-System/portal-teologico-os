"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { UserCog, Trash2, Plus, Loader2, X } from "lucide-react";
import BuscaMembroSetor from "./BuscaMembroSetor";
import { addSetorFunctionAction, removeSetorFunctionFormAction } from "./lideranca-setor-actions";
import type { MembroEncontrado } from "../../actions";

type Item = { id: string; name: string };
type FuncaoSetor = {
  id: string;
  member_name: string;
  department_name: string;
  function_role_name: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      Adicionar
    </button>
  );
}

export default function LiderancaSetorCard({
  sectorId,
  sectorName,
  sectors,
  funcoes,
  departamentos,
  papeis,
}: {
  sectorId: string;
  sectorName: string;
  sectors: Item[];
  funcoes: FuncaoSetor[];
  departamentos: Item[];
  papeis: Item[];
}) {
  const router = useRouter();
  const [membro, setMembro] = useState<MembroEncontrado | null>(null);
  const selectCls =
    "bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer";

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-iw-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-black border border-[#E88D0C] flex items-center justify-center shrink-0">
            <UserCog className="w-3.5 h-3.5 text-[#E88D0C]" />
          </div>
          <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider truncate">
            Liderança do Setor — {sectorName}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sectorId}
            onChange={(e) => router.push(`/dashboard/configuracoes/acessos/lideres-setor?setor=${e.target.value}#lideranca-setor`)}
            className="bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:outline-none focus:border-iw-gold cursor-pointer max-w-[160px]"
            title="Trocar setor"
          >
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => router.push("/dashboard/configuracoes/acessos/lideres-setor")}
            className="flex items-center gap-1 text-xs font-semibold text-iw-muted hover:text-iw-error transition-colors px-2 py-1.5 rounded-lg hover:bg-iw-error-bg"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      </div>

      <p className="text-xs text-iw-muted -mt-2">
        Pessoas que representam o setor inteiro num departamento/papel (ex.: líder de Jovens do setor) —
        diferente da liderança de cada igreja individual, que fica na ficha do próprio membro.
      </p>

      {funcoes.length === 0 ? (
        <p className="text-xs text-iw-muted">Nenhuma liderança de setor cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {funcoes.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 bg-iw-bg/60 border border-iw-border rounded-xl px-3.5 py-2.5"
            >
              <div className="min-w-0 text-xs">
                <span className="font-bold text-iw-navy">{f.function_role_name}</span>
                <span className="text-iw-muted"> · {f.department_name} · </span>
                <span className="font-semibold text-iw-sky">{f.member_name}</span>
              </div>
              <form action={removeSetorFunctionFormAction.bind(null, f.id, sectorId)} className="shrink-0">
                <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addSetorFunctionAction} className="space-y-3 pt-1 border-t border-iw-border">
        <input type="hidden" name="sector_id" value={sectorId} />
        <input type="hidden" name="member_id" value={membro?.id ?? ""} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
              Membro
            </label>
            <BuscaMembroSetor selecionado={membro} onSelecionar={setMembro} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
              Cargo (referência)
            </label>
            <div className="flex items-center px-3 py-2.5 text-sm text-iw-muted bg-iw-bg border border-iw-border rounded-xl truncate min-h-[42px]">
              {membro?.cargo ?? "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select name="department_id" required defaultValue="" className={selectCls}>
            <option value="" disabled>Departamento / Área</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select name="function_role_id" required defaultValue="" className={selectCls}>
            <option value="" disabled>Papel (função)</option>
            {papeis.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
