import { MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovaIgrejaForm from "../../igrejas/nova/NovaIgrejaForm";
import PageHeader from "@/components/layout/PageHeader";

export default async function NovoPontoPregacaoPage() {
  const supabase = await createClient();

  const [setoresRes, igrejasRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name").eq("church_type", "CHURCH").order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={MapPin}
        title="Novo Ponto de Pregação"
        description="Vinculado a uma igreja-mãe e a um setor."
        backHref="/dashboard/configuracoes/pontos-pregacao"
        backLabel="Voltar para Pontos de Pregação"
      />

      <NovaIgrejaForm
        setores={setoresRes.data ?? []}
        igrejasMae={igrejasRes.data ?? []}
        lockedType="PONTO"
        backHref="/dashboard/configuracoes/pontos-pregacao"
        submitLabel="Cadastrar Ponto de Pregação"
      />
    </div>
  );
}
