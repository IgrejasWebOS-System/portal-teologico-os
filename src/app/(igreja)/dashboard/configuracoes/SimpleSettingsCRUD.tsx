"use client";

import { useState, useTransition, useRef } from "react";
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertTriangle } from "lucide-react";

type Item = { id: string; name: string };

interface Props {
  items: Item[];
  placeholder?: string;
  onAdd: (fd: FormData) => Promise<{ success: boolean; message?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; message?: string }>;
  onUpdate?: (id: string, name: string) => Promise<{ success: boolean; message?: string }>;
}

export default function SimpleSettingsCRUD({
  items,
  placeholder = "Ex: NOVO ITEM...",
  onAdd,
  onDelete,
  onUpdate,
}: Props) {
  const [list, setList] = useState<Item[]>(items);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditValue(item.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = (id: string) => {
    if (!onUpdate) return;
    const trimmed = editValue.trim();
    if (!trimmed) { setError("Digite um nome antes de salvar."); return; }
    setError("");
    startTransition(async () => {
      const res = await onUpdate(id, trimmed);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      setList((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, name: trimmed.toUpperCase() } : i))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditValue("");
    });
  };

  const handleAdd = (fd: FormData) => {
    const name = (fd.get("name") as string)?.trim();
    if (!name) { setError("Digite um nome antes de cadastrar."); return; }
    setError("");

    startTransition(async () => {
      const res = await onAdd(fd);
      if (!res.success) {
        setError(res.message ?? "Erro ao adicionar.");
        return;
      }
      // Optimistic update — revalidatePath vai buscar o real na próxima navegação
      setList((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: name.toUpperCase() },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      formRef.current?.reset();
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.success) {
        setError(res.message ?? "Erro ao remover.");
        setDeletingId(null);
        return;
      }
      setList((prev) => prev.filter((i) => i.id !== id));
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form
        ref={formRef}
        action={handleAdd}
        className="flex gap-3"
      >
        <input
          name="name"
          type="text"
          placeholder={placeholder}
          className="flex-1 bg-white border border-iw-border rounded-xl px-4 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors font-medium uppercase"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending && !deletingId ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Cadastrar
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-2.5 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">
            Descrição do Registro
          </span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">
            Ação
          </span>
        </div>

        {list.length === 0 ? (
          <div className="px-5 py-10 text-center text-iw-muted text-sm">
            Nenhum registro cadastrado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {list.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors group"
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(item.id); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="bg-white border border-iw-blue rounded-lg px-2.5 py-1 text-sm font-semibold text-iw-navy uppercase focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-iw-navy">
                      {item.name}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={isPending}
                          className="p-1.5 text-iw-blue hover:text-iw-navy disabled:opacity-40 transition-colors rounded-lg hover:bg-iw-blue/8"
                          title="Salvar"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="p-1.5 text-iw-muted hover:text-iw-navy disabled:opacity-40 transition-colors rounded-lg hover:bg-iw-bg"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {onUpdate && (
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-iw-muted hover:text-iw-blue transition-colors rounded-lg hover:bg-iw-blue/8"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id || isPending}
                          className="p-1.5 text-iw-muted hover:text-iw-error disabled:opacity-40 transition-colors rounded-lg hover:bg-iw-error-bg"
                          title="Remover"
                        >
                          {deletingId === item.id ? (
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
