"use client";

import { useState, useTransition, useRef } from "react";
import { Trash2, Plus, Loader2, AlertTriangle } from "lucide-react";
import { addSetorAction, deleteSetorAction, updateSetorRegiaoAction } from "../actions";

type Regiao = { id: string; name: string };
type Setor = { id: string; name: string; regiao_id: string | null };

interface Props {
  setores: Setor[];
  regioes: Regiao[];
}

const selectCls =
  "w-full bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";

export default function SetoresManager({ setores, regioes }: Props) {
  const [list, setList] = useState<Setor[]>(setores);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAdd = (fd: FormData) => {
    const name = (fd.get("name") as string)?.trim();
    if (!name) { setError("Digite o nome do setor."); return; }
    setError("");

    startTransition(async () => {
      const res = await addSetorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao adicionar."); return; }
      formRef.current?.reset();
      // A revalidatePath do server action já atualiza a lista na próxima navegação/refresh.
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteSetorAction(id);
      if (!res.success) { setError(res.message ?? "Erro ao remover."); setDeletingId(null); return; }
      setList((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
    });
  };

  const handleChangeRegiao = (setorId: string, regiaoId: string) => {
    setList((prev) => prev.map((s) => (s.id === setorId ? { ...s, regiao_id: regiaoId || null } : s)));
    const fd = new FormData();
    fd.set("setor_id", setorId);
    fd.set("regiao_id", regiaoId);
    startTransition(async () => {
      const res = await updateSetorRegiaoAction(fd);
      if (!res.success) setError(res.message ?? "Erro ao vincular região.");
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Novo setor */}
      <form ref={formRef} action={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <input name="name" type="text" placeholder="Ex: SETOR 16 - NOVO BAIRRO..." className={inputCls} />
        <select name="regiao_id" className={`${inputCls} sm:max-w-[220px]`}>
          <option value="">Sem região</option>
          {regioes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      {/* Lista */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Região</span>
          <span></span>
        </div>

        {list.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-iw-muted text-sm font-medium">Nenhum setor cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {list.map((s) => (
              <li key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-3 gap-4">
                <span className="text-sm font-semibold text-iw-navy truncate">{s.name}</span>
                <select
                  value={s.regiao_id ?? ""}
                  onChange={(e) => handleChangeRegiao(s.id, e.target.value)}
                  className={selectCls}
                >
                  <option value="">Sem região</option>
                  {regioes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={isPending && deletingId === s.id}
                  className="text-iw-muted hover:text-iw-error transition-colors disabled:opacity-50"
                  title="Remover"
                >
                  {isPending && deletingId === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
