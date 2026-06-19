import Link from "next/link";
import { ArrowLeft, KeySquare, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  church_id: string | null;
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-iw-error-bg text-iw-error border-iw-error/30",
  ADMIN:       "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  MASTER:      "bg-iw-blue/10 text-iw-blue border-iw-blue/20",
  MEMBER:      "bg-iw-bg text-iw-muted border-iw-border",
};

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, role, church_id")
    .order("full_name");

  const users = (data ?? []) as Profile[];

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
              const role = u.role ?? "MEMBER";
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
                  <button
                    className="text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8"
                    title="Editar nível de acesso"
                  >
                    Editar
                  </button>
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
