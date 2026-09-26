import { redirect } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

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

  return (
    <>
      <AutoLogout />
      <SidebarShell isStaff={isStaff}>{children}</SidebarShell>
    </>
  );
}
