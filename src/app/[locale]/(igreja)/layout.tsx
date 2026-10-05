import { redirect } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff, checkMenuRestrito } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";

// ============================================================
// Gate de acesso do módulo Igreja (/dashboard e todas as
// subrotas: membros, igrejas, ocorrências, configurações...).
//
// Achado ao montar o roteiro de teste pré-migração (15/07/2026):
// nenhuma página deste módulo checava system_role — só exigia
// login (via middleware). Como o /cadastro público agora cria
// contas MEMBER de verdade (alunos externos comprando na Loja),
// qualquer uma delas conseguia acessar a base de membros da
// igreja digitando a URL direto. Centralizando o check aqui, no
// layout do grupo de rotas, cobre o módulo inteiro de uma vez —
// sem precisar duplicar em cada page.tsx (mesmo padrão que já
// existe em /admin/*, só que lá o check é por página).
// ============================================================

export default async function IgrejaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const isAdminRestrito = await checkMenuRestrito(supabase, user.id);

  // 04/10/2026, "Secretário de Setor" — um secretário escopado (level
  // 1-3) pode cair em telas deste grupo por link direto (ex.: editar
  // professor, a partir de /secretaria/professores) sem navegar pelo
  // menu completo de staff. A RLS já protege os dados (só vê/edita o
  // que está no próprio escopo); aqui é só pra mostrar o menu CERTO
  // (o dele, igual o resto da área da secretaria) em vez do menu cheio
  // de Administração, que mostraria opções (Matriz de Usuários, Sedes
  // Regionais etc.) que não fazem sentido pro nível dele.
  const secretario = await checkIsSecretario(supabase, user.id);

  return (
    <>
      <AutoLogout />
      {secretario ? (
        <SidebarShell isSecretario secretarioResumo={{ nome: "Secretaria", roleTitle: secretario.roleTitle }}>
          {children}
        </SidebarShell>
      ) : (
        <SidebarShell isStaff={isStaff} isAdminRestrito={isAdminRestrito}>
          {children}
        </SidebarShell>
      )}
    </>
  );
}
