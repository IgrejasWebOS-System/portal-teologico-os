import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario } from "@/utils/secretaria";
import PerfilSecretarioForm from "./PerfilSecretarioForm";
import TrocarSenhaCard from "../../professor/configuracoes/TrocarSenhaCard";

export const metadata = { title: "Configurações — Área da Secretaria" };

// ============================================================
// /secretaria/configuracoes — Etapa 7 (04/10/2026), 8º item do menu
// pedido pelo Joaquim ("1º Dashboard ... 8º Configurações"). O
// secretário não tem ficha em `professores`/`ead_alunos` — a
// identidade dele é `profiles` (nome/e-mail) + `admin_roles` (nível/
// unidade, cosméticos aqui, só leitura). TrocarSenhaCard é
// reaproveitado direto de /professor/configuracoes — é 100% genérico
// (supabase.auth.updateUser client-side), não tem nada específico de
// professor.
// ============================================================

export default async function ConfiguracoesSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();

  const { data: unidade } = await supabase.from("units").select("name").eq("id", secretario.unitId).maybeSingle();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-iw-gold" />
        </div>
        <h1 className="text-2xl font-black text-black">Configurações</h1>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <PerfilSecretarioForm
        nomeInicial={profile?.full_name ?? ""}
        email={profile?.email ?? user.email ?? null}
        roleTitle={secretario.roleTitle}
        unidadeNome={unidade?.name ?? null}
      />

      <TrocarSenhaCard />
    </div>
  );
}
