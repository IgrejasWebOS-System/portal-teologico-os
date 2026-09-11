import { Building } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CampoForm from "../CampoForm";
import PageHeader from "@/components/layout/PageHeader";

export default async function NovoCampoPage() {
  const supabase = await createClient();
  const [{ data: ministerios }, { data: igrejasDisponiveis }] = await Promise.all([
    supabase.from("ministerios").select("id, name").order("name"),
    supabase.from("churches").select("id, name, city, state").is("unit_id", null).order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building}
        title="Novo Campo"
        description="Cria o Campo, a Sede e a igreja da Sede juntos."
        backHref="/dashboard/configuracoes/acessos/campos"
        backLabel="Voltar para Campos"
      />

      <CampoForm submitLabel="Cadastrar Campo" ministerios={ministerios ?? []} igrejasDisponiveis={igrejasDisponiveis ?? []} />
    </div>
  );
}
