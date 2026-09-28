import { redirect } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsProfessor } from "@/utils/professor";

// ============================================================
// Gate de acesso do módulo Professor (27/09/2026, Fase 1 do Painel do
// Professor — pedido do Joaquim: menu lateral com Dashboard/Alunos/
// Turmas/Financeiro/Configurações em vez da página única antiga).
//
// Mesmo padrão de src/app/[locale]/(igreja)/layout.tsx (gate central pro
// grupo de rotas inteiro, em vez de checar em cada page.tsx), só trocando
// checkIsStaff por checkIsProfessor — são papéis distintos (um professor
// não é necessariamente staff, e vice-versa).
// ============================================================

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);

  if (!professor) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center px-8">
        <AcessoRestrito mensagem="Esta área é exclusiva de professores cadastrados no CETADP. Seu usuário não está vinculado a um cadastro de professor — fale com a secretaria se você acredita que deveria ter acesso." />
      </div>
    );
  }

  return (
    <>
      <AutoLogout />
      <SidebarShell
        isProfessor
        professorResumo={{ nome: professor.nome_completo, fotoUrl: professor.foto_url }}
      >
        {children}
      </SidebarShell>
    </>
  );
}
