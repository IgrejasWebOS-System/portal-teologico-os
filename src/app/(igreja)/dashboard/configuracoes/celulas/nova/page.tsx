import { GitBranch } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovaIgrejaForm from "../../igrejas/nova/NovaIgrejaForm";
import PageHeader from "@/components/layout/PageHeader";

export default async function NovaCelulaPage() {
  const supabase = await createClient();

  const [setoresRes, igrejasRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase
      .from("churches")
      .select("id, name")
      .in("church_type", ["CHURCH", "SUB"])
      .order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={GitBranch}
        title="Nova Célula"
        description="Vinculada a uma igreja/sub-congregação e a um setor."
        backHref="/dashboard/configuracoes/celulas"
        backLabel="Voltar para Células"
      />

      <NovaIgrejaForm
        setores={setoresRes.data ?? []}
        igrejasMae={igrejasRes.data ?? []}
        lockedType="CELL"
        backHref="/dashboard/configuracoes/celulas"
        submitLabel="Cadastrar Célula"
      />
    </div>
  );
}
