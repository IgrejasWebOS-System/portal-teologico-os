import { Landmark } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction, updateSettingItemAction } from "../actions";

export default async function MinisteriosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ministerios")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Landmark}
        title="Ministérios"
        description="Agrupamento de Campos por Ministério."
        backHref="/dashboard/configuracoes/ministerio-setores-igrejas"
        backLabel="Voltar para Ministério · Setores · Igrejas"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: MINISTÉRIO MADUREIRA"
        onAdd={addSettingItemAction.bind(null, "ministerios")}
        onDelete={deleteSettingItemAction.bind(null, "ministerios")}
        onUpdate={updateSettingItemAction.bind(null, "ministerios")}
      />
    </div>
  );
}
