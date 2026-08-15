"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Loader2 } from "lucide-react";
import { addMemberFunctionAction } from "./funcoes-actions";

type Item = { id: string; name: string };

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

export default function AddMemberFunctionForm({
  memberId,
  churchId,
  churchName,
  setorPadraoId,
  setorPadraoName,
  departamentos,
  papeis,
  setores,
}: {
  memberId: string;
  churchId: string;
  churchName: string;
  setorPadraoId: string | null;
  setorPadraoName: string | null;
  departamentos: Item[];
  papeis: Item[];
  setores: Item[];
}) {
  const [escopo, setEscopo] = useState<"IGREJA" | "SETOR">("IGREJA");
  const [sectorId, setSectorId] = useState(setorPadraoId ?? "");

  const selectCls =
    "bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer";

  return (
    <form action={addMemberFunctionAction} className="space-y-3 pt-1">
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="church_id" value={churchId} />
      <input type="hidden" name="escopo" value={escopo} />
      {escopo === "SETOR" && <input type="hidden" name="sector_id" value={sectorId} />}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select name="department_id" required defaultValue="" className={selectCls}>
          <option value="" disabled>
            Departamento / Área
          </option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select name="function_role_id" required defaultValue="" className={selectCls}>
          <option value="" disabled>
            Papel
          </option>
          {papeis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={escopo}
          onChange={(e) => setEscopo(e.target.value as "IGREJA" | "SETOR")}
          className={selectCls}
        >
          <option value="IGREJA">Escopo: {churchName} (igreja)</option>
          <option value="SETOR">Escopo: Setor</option>
        </select>

        {escopo === "SETOR" ? (
          <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={selectCls}>
            <option value="" disabled>
              Selecione o setor
            </option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center px-3 py-2.5 text-xs text-iw-muted bg-iw-bg border border-iw-border rounded-xl truncate">
            Igreja do próprio membro
          </div>
        )}
      </div>

      {escopo === "SETOR" && setorPadraoName && (
        <p className="text-[11px] text-iw-muted">
          Setor padrão da igreja do membro: <strong>{setorPadraoName}</strong> — pode trocar acima se for outro.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
