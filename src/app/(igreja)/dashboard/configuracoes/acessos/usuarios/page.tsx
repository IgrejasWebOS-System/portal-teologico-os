import Link from "next/link";
import { ArrowLeft, KeySquare } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import InviteStaffForm from "./InviteStaffForm";
import UsersList from "./UsersList";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  system_role: string | null;
  church_id: string | null;
};

type UnitOption = { id: string; type: string; name: string; parent_id: string | null };
type ChurchLink = { id: string; unit_id: string | null };

export default async function UsuariosPage() {
  const supabase = await createClient();

  const [{ data }, { data: { user: currentUser } }, unitsRes, churchesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, system_role, church_id")
      .order("full_name"),
    supabase.auth.getUser(),
    supabase
      .from("units")
      .select("id, type, name, parent_id")
      .order("type")
      .order("name"),
    supabase.from("churches").select("id, unit_id"),
  ]);

  const users = (data ?? []) as Profile[];
  const units = (unitsRes.data ?? []) as UnitOption[];
  const churches = (churchesRes.data ?? []) as ChurchLink[];
  const souGlobalAdmin = users.find((u) => u.id === currentUser?.id)?.system_role === "GLOBAL_ADMIN";

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      {souGlobalAdmin && <InviteStaffForm units={units} churches={churches} />}

      <UsersList users={users} currentUserId={currentUser?.id} souGlobalAdmin={souGlobalAdmin} />
    </div>
  );
}
