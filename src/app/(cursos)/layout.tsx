import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AutoLogout from "@/components/security/AutoLogout";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { carregarAlunoPainelData } from "@/utils/aluno/painel";

export default async function CursosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isStaff = user ? await checkIsStaff(supabase, user.id) : false;
  const alunoPainel = user && !isStaff ? await carregarAlunoPainelData(supabase, user.id) : null;
  const isAlunoOficial = !!alunoPainel;

  return (
    <div className="flex min-h-screen bg-iw-bg">
      <AutoLogout />
      <Suspense fallback={null}>
        <Sidebar isStaff={isStaff} isAlunoOficial={isAlunoOficial} alunoPainel={alunoPainel} />
      </Suspense>
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
