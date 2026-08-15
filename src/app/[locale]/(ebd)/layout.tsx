import { Suspense } from "react";
import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { carregarAlunoPainelData } from "@/utils/aluno/painel";

export default async function EbdLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isStaff = user ? await checkIsStaff(supabase, user.id) : false;
  const alunoPainel = user && !isStaff ? await carregarAlunoPainelData(supabase, user.id) : null;
  const isAlunoOficial = !!alunoPainel;

  return (
    <>
      <AutoLogout />
      <Suspense fallback={null}>
        <SidebarShell isStaff={isStaff} isAlunoOficial={isAlunoOficial} alunoPainel={alunoPainel}>
          {children}
        </SidebarShell>
      </Suspense>
    </>
  );
}
