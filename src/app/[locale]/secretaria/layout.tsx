import { redirect } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario } from "@/utils/secretaria";

// ============================================================
// Gate de acesso do módulo Secretaria (04/10/2026, "Secretário de
// Setor" — pedido do Joaquim). Mesmo padrão de src/app/[locale]/
// professor/layout.tsx (gate central pro grupo de rotas inteiro), só
// trocando checkIsProfessor por checkIsSecretario — aqui o papel é
// admin_roles.level 1-3 (escopo de uma ou mais unidades), não um
// cadastro de professor.
//
// Etapa 1 (04/10/2026): só Dashboard + Alunos. Turmas/Financeiro/
// Caixa/Matrícula entram nas próximas etapas, combinado com o Joaquim.
// ============================================================

export default async function SecretariaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);

  if (!secretario) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center px-8">
        <AcessoRestrito mensagem="Esta área é exclusiva de operadores com nível de acesso de Secretaria (Admin de Setor, Sede ou Campo). Seu usuário não tem esse nível — fale com o administrador global se você acredita que deveria ter acesso." />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <AutoLogout />
      <SidebarShell
        isSecretario
        secretarioResumo={{ nome: profile?.full_name ?? "Secretaria", roleTitle: secretario.roleTitle }}
      >
        {children}
      </SidebarShell>
    </>
  );
}
