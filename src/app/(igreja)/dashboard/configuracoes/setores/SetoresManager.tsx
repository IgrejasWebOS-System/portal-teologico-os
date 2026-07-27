"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { addSetorAction, deleteSetorAction, updateSetorRegiaoAction, renameSetorAction } from "../actions";
import { ancestryChain, type UnitNode } from "../unitsChain";

type Regiao = { id: string; name: string };
type Setor = { id: string; name: string; regiao_id: string | null; unit_id: string | null };

interface Props {
  setores: Setor[];
  regioes: Regiao[];
  units: UnitNode[];
}

const selectCls =
  "w-full bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";

export default function SetoresManager({ setores, regioes, units }: Props) {
  const [list, setList] = useState<Setor[]>(setores);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [campoFiltro, setCampoFiltro] = useState("");
  const [campoNovoSetor, setCampoNovoSetor] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const campos = useMemo(() => units.filter((u) => u.type === "CAMPO"), [units]);

  const campoDoSetor = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of list) {
      if (!s.unit_id) continue;
      const chain = ancestryChain(s.unit_id, units);
      const campo = chain.find((u) => u.type === "CAMPO");
      if (campo) map.set(s.id, campo.name);
    }
    return map;
  }, [list, units]);

  const listaFiltrada = useMemo(() => {
    if (!campoFiltro) return list;
    return list.filter((s) => {
      if (!s.unit_id) return false;
      const chain = ancestryChain(s.unit_id, units);
      return chain.some((u) => u.type === "CAMPO" && u.id === campoFiltro);
    });
  }, [list, units, campoFiltro]);

  const handleAdd = (fd: FormData) => {
    const name = (fd.get("name") as string)?.trim();
    if (!name) { setError("Digite o nome do setor."); return; }
    if (!campoNovoSetor) { setError("Selecione o Campo."); return; }
    setError("");
    fd.set("campo_id", campoNovoSetor);

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

  const startEdit = (s: Setor) => {
    setEditingId(s.id);
    setEditValue(s.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = (s: Setor) => {
    const trimmed = editValue.trim();
    if (!trimmed) { setError("Digite o nome do setor."); return; }
    setError("");
    const fd = new FormData();
    fd.set("setor_id", s.id);
    fd.set("name", trimmed);
    fd.set("unit_id", s.unit_id ?? "");
    startTransition(async () => {
      const res = await renameSetorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao renomear."); return; }
      setList((prev) => prev.map((i) => (i.id === s.id ? { ...i, name: trimmed.toUpperCase() } : i)));
      setEditingId(null);
      setEditValue("");
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

      {/* Filtro por Campo */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-iw-muted uppercase tracking-wider shrink-0">Ver Campo</label>
        <select value={campoFiltro} onChange={(e) => setCampoFiltro(e.target.value)} className={`${selectCls} max-w-[280px]`}>
          <option value="">Todos os campos</option>
          {campos.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Novo setor */}
      <form ref={formRef} action={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <select
          value={campoNovoSetor}
          onChange={(e) => setCampoNovoSetor(e.target.value)}
          className={`${inputCls} sm:max-w-[220px]`}
        >
          <option value="">Campo...</option>
          {campos.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
        <div className="grid grid-cols-[1fr_1fr_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Campo</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Região</span>
          <span></span>
        </div>

        {listaFiltrada.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-iw-muted text-sm font-medium">Nenhum setor cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {listaFiltrada.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <li key={s.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center px-5 py-3 gap-4">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(s); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="bg-white border border-iw-blue rounded-lg px-2.5 py-1 text-sm font-semibold text-iw-navy uppercase focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-iw-navy truncate">{s.name}</span>
                  )}

                  <span className="text-xs text-iw-muted truncate">
                    {campoDoSetor.get(s.id) ?? "— sem campo —"}
                  </span>

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

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(s)}
                          disabled={isPending}
                          className="text-iw-blue hover:text-iw-navy transition-colors disabled:opacity-50"
                          title="Salvar"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="text-iw-muted hover:text-iw-navy transition-colors disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          className="text-iw-muted hover:text-iw-blue transition-colors"
                          title="Renomear"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
