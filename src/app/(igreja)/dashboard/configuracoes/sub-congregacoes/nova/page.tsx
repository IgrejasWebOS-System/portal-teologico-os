import { Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovaIgrejaForm from "../../igrejas/nova/NovaIgrejaForm";
import PageHeader from "@/components/layout/PageHeader";

export default async function NovaSubCongregacaoPage() {
  const supabase = await createClient();

  const [setoresRes, igrejasRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name").eq("church_type", "CHURCH").order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building2}
        title="Nova Sub-congregação"
        description="Vinculada a uma igreja-mãe e a um setor."
        backHref="/dashboard/configuracoes/sub-congregacoes"
        backLabel="Voltar para Sub-congregações"
      />

      <NovaIgrejaForm
        setores={setoresRes.data ?? []}
        igrejasMae={igrejasRes.data ?? []}
        lockedType="SUB"
        backHref="/dashboard/configuracoes/sub-congregacoes"
        submitLabel="Cadastrar Sub-congregação"
      />
    </div>
  );
}
