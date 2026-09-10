"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertTriangle, ChevronDown, ChevronRight, Star, Phone, Users, MapPinned } from "lucide-react";
import {
  addSetorAction,
  deleteSetorAction,
  updateSetorRegiaoAction,
  renameSetorAction,
  definirLiderSetorAction,
  removerLiderSetorAction,
} from "../actions";
import { ancestryChain, type UnitNode } from "../unitsChain";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";

type Regiao = { id: string; name: string };
type Setor = {
  id: string;
  name: string;
  regiao_id: string | null;
  unit_id: string | null;
  categoria?: string | null;
  mother_church_id?: string | null;
};
type IgrejaRoster = {
  id: string;
  name: string;
  sector_id: string | null;
  pastor_name: string | null;
  pastor_phone: string | null;
  church_phone: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

interface Props {
  setores: Setor[];
  regioes: Regiao[];
  units: UnitNode[];
  igrejasPorSetor?: Record<string, IgrejaRoster[] | undefined>;
  membrosPorIgreja?: Record<string, number | undefined>;
}

function enderecoCompleto(i: IgrejaRoster): string {
  const partes = [
    [i.address, i.address_number].filter(Boolean).join(", "),
    i.neighborhood,
    i.city,
    i.state,
    i.zip_code,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : "—";
}

const selectCls =
  "w-full bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";

export default function SetoresManager({ setores, regioes, units, igrejasPorSetor = {}, membrosPorIgreja = {} }: Props) {
  const [list, setList] = useState<Setor[]>(setores);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [campoFiltro, setCampoFiltro] = useState("");
  const [campoNovoSetor, setCampoNovoSetor] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [liderPendingId, setLiderPendingId] = useState<string | null>(null);
  const [igrejasState] = useState(igrejasPorSetor);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Reaproveita o mesmo campo que já existe em "Líderes de Setor"
  // (sectors.mother_church_id) — a estrela aqui é só um atalho mais
  // rápido pra fazer a mesma coisa sem trocar de tela.
  const handleToggleLider = (igreja: IgrejaRoster, sectorId: string) => {
    const setor = list.find((s) => s.id === sectorId);
    const marcandoLider = setor?.mother_church_id !== igreja.id;
    setLiderPendingId(igreja.id);
    setList((prev) => prev.map((s) => (s.id === sectorId ? { ...s, mother_church_id: marcandoLider ? igreja.id : null } : s)));
    startTransition(async () => {
      let res;
      if (marcandoLider) {
        const fd = new FormData();
        fd.set("setor_id", sectorId);
        fd.set("church_id", igreja.id);
        res = await definirLiderSetorAction(fd);
      } else {
        res = await removerLiderSetorAction(sectorId);
      }
      if (!res.success) setError(res.message ?? "Erro ao salvar.");
      setLiderPendingId(null);
    });
  };

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
        <input name="name" type="text" placeholder="Ex: SETOR 16 - NOVO BAIRRO..." onChange={aplicarMaiusculaNoEvento} className={`${inputCls} uppercase`} />
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
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span></span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor / Regional</span>
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
              const expandido = expandidoId === s.id;
              const igrejas = [...(igrejasState[s.id] ?? [])].sort((a, b) => {
                const aLider = a.id === s.mother_church_id;
                const bLider = b.id === s.mother_church_id;
                return aLider === bLider ? 0 : aLider ? -1 : 1;
              });
              const label = s.categoria === "REGIONAL" ? "Regional" : "Setor";
              return (
                <li key={s.id}>
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center px-5 py-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setExpandidoId(expandido ? null : s.id)}
                    className="text-iw-muted hover:text-iw-blue transition-colors"
                    title="Ver igrejas"
                  >
                    {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(s); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="bg-white border border-iw-blue rounded-lg px-2.5 py-1 text-sm font-semibold text-iw-navy uppercase focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
                    />
                  ) : (
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider shrink-0">{label}</span>
                      <span className="text-sm font-semibold text-iw-navy truncate">{s.name}</span>
                    </span>
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
                </div>

                {expandido && (
                  <div className="px-5 pb-4 pl-14">
                    {igrejas.length === 0 ? (
                      <p className="text-xs text-iw-muted italic py-2">Nenhuma igreja vinculada a este {label.toLowerCase()} ainda.</p>
                    ) : (
                      <div className="border border-iw-border rounded-xl overflow-hidden">
                        <div className="grid grid-cols-[1.4fr_1.2fr_1fr_0.6fr_1.8fr] gap-3 px-3 py-2 bg-iw-bg border-b border-iw-border">
                          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">Igreja</span>
                          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">Dirigente</span>
                          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3" /> Celular</span>
                          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Membros</span>
                          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider flex items-center gap-1"><MapPinned className="w-3 h-3" /> Endereço</span>
                        </div>
                        <ul className="divide-y divide-iw-border">
                          {igrejas.map((i) => {
                            const ehLider = i.id === s.mother_church_id;
                            return (
                            <li key={i.id} className="grid grid-cols-[1.4fr_1.2fr_1fr_0.6fr_1.8fr] gap-3 px-3 py-2.5 items-center">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLider(i, s.id)}
                                  disabled={liderPendingId === i.id}
                                  title={ehLider ? `Remover líder ${label.toLowerCase()}` : `Definir como líder ${label.toLowerCase()}`}
                                  className="shrink-0"
                                >
                                  <Star className={`w-3.5 h-3.5 ${ehLider ? "fill-iw-gold text-iw-gold" : "text-iw-border"}`} />
                                </button>
                                <span className="text-xs font-semibold text-iw-navy truncate">{i.name}</span>
                                {ehLider && (
                                  <span className="text-[9px] font-bold text-iw-gold bg-iw-gold/10 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                                    Líder {label}
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-iw-navy truncate">{i.pastor_name ?? "—"}</span>
                              <span className="text-xs text-iw-muted truncate">{i.pastor_phone || i.church_phone || "—"}</span>
                              <span className="text-xs text-iw-muted">{membrosPorIgreja[i.id] ?? 0}</span>
                              <span className="text-xs text-iw-muted truncate" title={enderecoCompleto(i)}>{enderecoCompleto(i)}</span>
                            </li>
                          );})}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
