"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, User, ShieldCheck, Pencil, Check, X, Loader2, AlertTriangle, Link2 } from "lucide-react";
import {
  atualizarPerfilUsuarioAction,
  atualizarVinculoUsuarioAction,
} from "../../actions";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  system_role: string | null;
  church_id: string | null;
};

type UnitOption = { id: string; type: string; name: string; parent_id: string | null };
type AdminRole = { user_id: string; level: number; unit_id: string | null };

const ROLE_COLOR: Record<string, string> = {
  GLOBAL_ADMIN: "bg-iw-error-bg text-iw-error border-iw-error/30",
  SECTOR_ADMIN: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  LOCAL_ADMIN:  "bg-iw-blue/10 text-iw-blue border-iw-blue/20",
  MEMBER:       "bg-iw-bg text-iw-muted border-iw-border",
};

// Espelha NIVEL_LABEL do InviteStaffForm — mesmo vocabulário em toda a
// Matriz de Usuários (convite e edição de quem já existe).
const NIVEL_LABEL: Record<string, string> = {
  "0": "0 — Super-Master (sem unidade)",
  "1": "1 — Master de Campo",
  "2": "2 — Admin de Sede",
  "3": "3 — Admin de Setor",
  "4": "4 — Usuário Local",
};

interface Props {
  users: Profile[];
  currentUserId?: string;
  souGlobalAdmin: boolean;
  units: UnitOption[];
  adminRoles: AdminRole[];
}

export default function UsersList({ users, currentUserId, souGlobalAdmin, units, adminRoles }: Props) {
  const [busca, setBusca] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Edição de vínculo (nível + unidade) — separada da edição de
  // nome/e-mail, um formulário de cada vez por linha.
  const [editingVinculoId, setEditingVinculoId] = useState<string | null>(null);
  const [vinculoLevel, setVinculoLevel] = useState("MEMBER");
  const [vinculoUnitId, setVinculoUnitId] = useState("");
  const [vinculoResult, setVinculoResult] = useState<{ success: boolean; message?: string } | null>(null);

  const roleAtualPorUsuario = useMemo(() => {
    const map = new Map<string, AdminRole>();
    for (const r of adminRoles) map.set(r.user_id, r);
    return map;
  }, [adminRoles]);

  const startEdit = (u: Profile) => {
    setEditingId(u.id);
    setEditNome(u.full_name ?? "");
    setEditEmail(u.email ?? "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const handleSaveEdit = (userId: string) => {
    if (!editEmail.trim()) { setError("Informe o e-mail."); return; }
    setError("");
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("full_name", editNome);
    fd.set("email", editEmail);
    startTransition(async () => {
      const res = await atualizarPerfilUsuarioAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      setEditingId(null);
    });
  };

  const startEditVinculo = (u: Profile) => {
    setEditingVinculoId(u.id);
    setVinculoResult(null);
    const atual = roleAtualPorUsuario.get(u.id);
    setVinculoLevel(atual ? String(atual.level) : "MEMBER");
    setVinculoUnitId(atual?.unit_id ?? "");
  };

  const cancelEditVinculo = () => {
    setEditingVinculoId(null);
    setVinculoResult(null);
  };

  const handleSaveVinculo = (userId: string) => {
    if (vinculoLevel !== "MEMBER" && vinculoLevel !== "0" && !vinculoUnitId) {
      setVinculoResult({ success: false, message: "Selecione a unidade para esse nível." });
      return;
    }
    setVinculoResult(null);
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("level", vinculoLevel);
    fd.set("unit_id", vinculoLevel === "0" || vinculoLevel === "MEMBER" ? "" : vinculoUnitId);
    startTransition(async () => {
      const res = await atualizarVinculoUsuarioAction(fd);
      setVinculoResult(res);
      if (res.success) setEditingVinculoId(null);
    });
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(termo) ||
        (u.email ?? "").toLowerCase().includes(termo)
    );
  }, [busca, users]);

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-iw-bg border-b border-iw-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-iw-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full bg-white border border-iw-border rounded-xl pl-8 pr-3 py-2 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] px-5 py-2.5 bg-iw-bg/60 border-b border-iw-border gap-4">
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome / E-mail</span>
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nível</span>
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Unidade</span>
        <span></span>
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border-b border-iw-error/20 px-5 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-h-[480px] overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <User className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">
              {busca ? "Nenhum operador encontrado pra essa busca." : "Nenhum operador encontrado na base."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {filtrados.map((u) => {
              const role = u.system_role ?? "MEMBER";
              const vinculo = roleAtualPorUsuario.get(u.id);
              const unidadeAtual = vinculo?.unit_id ? units.find((un) => un.id === vinculo.unit_id) : null;
              const podeEditar = souGlobalAdmin && u.id !== currentUserId;
              const isEditing = editingId === u.id;
              const isEditingVinculo = editingVinculoId === u.id;

              if (isEditing) {
                return (
                  <li key={u.id} className="px-5 py-4 bg-iw-blue/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        autoFocus
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value.toUpperCase())}
                        placeholder="Nome completo"
                        className="bg-white border border-iw-blue rounded-lg px-2.5 py-1.5 text-sm text-iw-navy uppercase focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
                      />
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="E-mail"
                        type="email"
                        className="bg-white border border-iw-blue rounded-lg px-2.5 py-1.5 text-sm text-iw-navy focus:outline-none focus:ring-2 focus:ring-iw-blue/20"
                      />
                    </div>
                    <p className="text-[11px] text-iw-muted mb-2">
                      Alterar o e-mail troca também o login desse operador.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(u.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-iw-blue hover:bg-iw-navy disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-iw-muted hover:text-iw-navy px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </li>
                );
              }

              if (isEditingVinculo) {
                return (
                  <li key={u.id} className="px-5 py-4 bg-iw-gold/5">
                    <p className="text-sm font-semibold text-iw-navy mb-2">{u.full_name ?? u.email}</p>

                    {vinculoResult && !vinculoResult.success && (
                      <div className="flex items-center gap-2 text-iw-error text-xs bg-iw-error-bg border border-iw-error/20 rounded-lg px-3 py-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{vinculoResult.message}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <select
                        value={vinculoLevel}
                        onChange={(e) => { setVinculoLevel(e.target.value); if (e.target.value === "0") setVinculoUnitId(""); }}
                        className="bg-white border border-iw-gold rounded-lg px-2.5 py-1.5 text-sm text-iw-navy focus:outline-none focus:ring-2 focus:ring-iw-gold/20 cursor-pointer"
                      >
                        <option value="MEMBER">Revogar — voltar a MEMBER</option>
                        {Object.entries(NIVEL_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>

                      <select
                        value={vinculoUnitId}
                        onChange={(e) => setVinculoUnitId(e.target.value)}
                        disabled={vinculoLevel === "0" || vinculoLevel === "MEMBER"}
                        className="bg-white border border-iw-gold rounded-lg px-2.5 py-1.5 text-sm text-iw-navy focus:outline-none focus:ring-2 focus:ring-iw-gold/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">— Selecione a unidade —</option>
                        {units.map((un) => (
                          <option key={un.id} value={un.id}>{un.type} · {un.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveVinculo(u.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-iw-navy hover:bg-iw-navy/90 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditVinculo}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-iw-muted hover:text-iw-navy px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={u.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-4 hover:bg-iw-bg/50 transition-colors gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-iw-navy truncate">
                      {u.full_name ?? "Usuário sem nome"}
                    </p>
                    <p className="text-xs text-iw-muted truncate">{u.email ?? "—"}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${ROLE_COLOR[role] ?? ROLE_COLOR.MEMBER}`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {role}
                    {vinculo ? ` · N${vinculo.level}` : ""}
                  </span>
                  <span className="text-xs text-iw-muted truncate max-w-[160px]">
                    {unidadeAtual ? `${unidadeAtual.type} · ${unidadeAtual.name}` : vinculo?.level === 0 ? "todas" : "—"}
                  </span>
                  {podeEditar ? (
                    <button
                      type="button"
                      onClick={() => startEdit(u)}
                      className="p-1.5 text-iw-muted hover:text-iw-blue transition-colors rounded-lg hover:bg-iw-blue/8"
                      title="Editar nome/e-mail"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : (
                    <span></span>
                  )}
                  {podeEditar ? (
                    <button
                      type="button"
                      onClick={() => startEditVinculo(u)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8"
                      title="Editar nível e unidade"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Acesso
                    </button>
                  ) : (
                    <span className="text-xs text-iw-muted/50 text-right">
                      {u.id === currentUserId ? "você" : "—"}
                    </span>
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
