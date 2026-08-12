import { Church } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovaIgrejaForm from "./NovaIgrejaForm";
import PageHeader from "@/components/layout/PageHeader";

export default async function NovaIgrejaPage() {
  const supabase = await createClient();

  const [setoresRes, igrejasRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name").eq("church_type", "CHURCH").order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Church}
        title="Nova Igreja"
        description="Cadastre uma congregação, sub-congregação ou célula."
        backHref="/dashboard/configuracoes/igrejas"
        backLabel="Voltar para Igrejas"
      />

      <NovaIgrejaForm
        setores={setoresRes.data ?? []}
        igrejasMae={igrejasRes.data ?? []}
      />
    </div>
  );
}
