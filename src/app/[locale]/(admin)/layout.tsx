import { redirect } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff, checkMenuRestrito } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";

// ============================================================
// Gate de acesso do módulo (admin) — achado em teste (24/09/2026,
// pedido do Joaquim: professor só pode acessar /professor, aluno só
// /portal): este layout calculava isStaff só pra decidir o que mostrar
// no menu, mas nunca bloqueava quem não é staff — um professor ou aluno
// digitando /admin/matriculas direto na URL conseguia ver a página
// inteira. Mesmo padrão já usado no layout de (igreja) (ver comentário
// lá, 15/07/2026): sem usuário logado manda pro /login, logado mas sem
// cargo de staff mostra AcessoRestrito em vez do conteúdo.
// ============================================================

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  // 04/10/2026, "Secretário de Setor" — staff com admin_roles.level 1-3
  // (escopo de uma unidade) não deve ver o MENU genérico de /admin
  // (pensado pro GLOBAL_ADMIN, nível 0, sem unidade — tem opções como
  // Matriz de Usuários/Sedes Regionais que não fazem sentido pro nível
  // dele). Mas isso é só sobre o MENU: não bloqueia o grupo de rotas
  // inteiro, porque várias sub-rotas daqui (ex.: /admin/matriculas/[id])
  // são reaproveitadas de propósito pelas telas de Secretaria (Alunos/
  // Financeiro, "editar"/"dar baixa") e já são escopadas na própria
  // action (assertAlunoNoEscopo) — bloquear o grupo inteiro quebraria
  // esse reaproveitamento. O /admin (Dashboard) em si, que mostra
  // Sede/Setor/Regional do sistema inteiro e não faz sentido pra um
  // escopo de Setor, já redireciona sozinho em admin/page.tsx.
  const secretario = await checkIsSecretario(supabase, user.id);

  const isAdminRestrito = await checkMenuRestrito(supabase, user.id);

  return (
    <>
      <AutoLogout />
      {secretario ? (
        <SidebarShell isSecretario secretarioResumo={{ nome: "Secretaria", roleTitle: secretario.roleTitle }}>
          <div className="iw-scope-preto">{children}</div>
        </SidebarShell>
      ) : (
        <SidebarShell isStaff={isStaff} isAdminRestrito={isAdminRestrito}>
          {/* 30/09/2026, pedido do Joaquim: Dashboard e demais telas de
              /admin estavam com texto cinza claro (nunca tinham o
              tratamento iw-scope-preto que /dashboard/configuracoes já
              usa) — ver globals.css. */}
          <div className="iw-scope-preto">{children}</div>
        </SidebarShell>
      )}
    </>
  );
}
