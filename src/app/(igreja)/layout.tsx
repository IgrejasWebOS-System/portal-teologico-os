import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import AutoLogout from "@/components/security/AutoLogout";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

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

  return (
    <div className="flex min-h-screen bg-iw-bg">
      <AutoLogout />
      <Sidebar isStaff={isStaff} />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
