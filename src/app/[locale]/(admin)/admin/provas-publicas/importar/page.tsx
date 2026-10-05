import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert, UploadCloud } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { checkIsStaff } from "@/utils/staff";
import ImportarProvasForm from "./ImportarProvasForm";

// ============================================================
// Importação automática de provas públicas a partir de PDF (02/10/2026,
// pedido do Joaquim). Mesma área de acesso de /admin/provas-publicas
// (checkIsStaff), já que isso cria dado público-facing (os links
// /prova-publica/<slug> que vão pros alunos).
// ============================================================

export default async function ImportarProvasPublicasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await checkIsStaff(supabase, user.id))) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-iw-surface border border-iw-error/30 rounded-2xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-iw-error mx-auto mb-3" />
        <h1 className="text-lg font-bold text-iw-navy mb-1">Acesso restrito</h1>
        <p className="text-iw-muted text-sm">Esta área é exclusiva da secretaria do CETADP.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={UploadCloud}
        title="Importar provas públicas de um PDF"
        description='Envie o(s) PDF(s) de cada teste + o PDF do gabarito ("TESTES PARCIAIS"). A extração é automática, mas nada é publicado sem revisão.'
        backHref="/admin/provas-publicas"
        backLabel="Voltar"
      />
      <ImportarProvasForm />
    </div>
  );
}
