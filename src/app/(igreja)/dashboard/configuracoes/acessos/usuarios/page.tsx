import Link from "next/link";
import { ArrowLeft, KeySquare, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { atualizarNivelUsuarioFormAction } from "../../actions";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  system_role: string | null;
  church_id: string | null;
};

// Níveis reais em uso (ver src/utils/staff.ts) — a lista anterior aqui
// (SUPER_ADMIN/ADMIN/MASTER) não correspondia a nenhum valor real da coluna
// profiles.system_role, então nenhum usuário batia com a cor certa.
const ROLE_COLOR: Record<string, string> = {
  GLOBAL_ADMIN: "bg-iw-error-bg text-iw-error border-iw-error/30",
  SECTOR_ADMIN: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  LOCAL_ADMIN:  "bg-iw-blue/10 text-iw-blue border-iw-blue/20",
  MEMBER:       "bg-iw-bg text-iw-muted border-iw-border",
};

const ROLE_OPTIONS = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN", "MEMBER"];

export default async function UsuariosPage() {
  const supabase = await createClient();

  const [{ data }, { data: { user: currentUser } }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, system_role, church_id")
      .order("full_name"),
    supabase.auth.getUser(),
  ]);

  const users = (data ?? []) as Profile[];
  const souGlobalAdmin = users.find((u) => u.id === currentUser?.id)?.system_role === "GLOBAL_ADMIN";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard/configuracoes/acessos"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Administração de Acessos
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <KeySquare className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Matriz de Usuários</h1>
            <p className="text-iw-muted text-xs mt-0.5">Controle de operadores e permissões (RBAC)</p>
          </div>
        </div>
      </div>

      {!souGlobalAdmin && (
        <p className="text-xs text-iw-warning bg-iw-warning-bg border border-iw-warning/20 rounded-xl px-4 py-2.5">
          Apenas contas GLOBAL_ADMIN podem alterar o nível de outros usuários — você está vendo a lista em modo leitura.
        </p>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome / E-mail</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nível</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <User className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">Nenhum operador encontrado na base.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {users.map((u) => {
              const role = u.system_role ?? "MEMBER";
              const podeEditar = souGlobalAdmin && u.id !== currentUser?.id;
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
                      {u.id === currentUser?.id ? "você" : "—"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-iw-muted text-center">
        Para criar novos operadores, utilize o convite por e-mail via Supabase Auth.
      </p>
    </div>
  );
}
