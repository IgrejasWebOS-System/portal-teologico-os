"use client";

import { useMemo, useState } from "react";
import { Search, User, ShieldCheck } from "lucide-react";
import { atualizarNivelUsuarioFormAction } from "../../actions";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  system_role: string | null;
  church_id: string | null;
};

const ROLE_COLOR: Record<string, string> = {
  GLOBAL_ADMIN: "bg-iw-error-bg text-iw-error border-iw-error/30",
  SECTOR_ADMIN: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  LOCAL_ADMIN:  "bg-iw-blue/10 text-iw-blue border-iw-blue/20",
  MEMBER:       "bg-iw-bg text-iw-muted border-iw-border",
};

const ROLE_OPTIONS = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN", "MEMBER"];

interface Props {
  users: Profile[];
  currentUserId?: string;
  souGlobalAdmin: boolean;
}

export default function UsersList({ users, currentUserId, souGlobalAdmin }: Props) {
  const [busca, setBusca] = useState("");

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

      <div className="grid grid-cols-[1fr_auto_auto] px-5 py-2.5 bg-iw-bg/60 border-b border-iw-border gap-4">
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome / E-mail</span>
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nível</span>
        <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
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
              const podeEditar = souGlobalAdmin && u.id !== currentUserId;
              return (
                <li
                  key={u.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 hover:bg-iw-bg/50 transition-colors gap-4"
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
                  </span>
                  {podeEditar ? (
                    <form action={atualizarNivelUsuarioFormAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="system_role"
                        defaultValue={role}
                        className="bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8"
                      >
                        Salvar
                      </button>
                    </form>
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
