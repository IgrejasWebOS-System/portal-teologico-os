import { User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function ProfissoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings_professions")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={User}
        title="Profissões"
        description="Cadastro de ocupações profissionais"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: ENGENHEIRO CIVIL"
        onAdd={addSettingItemAction.bind(null, "settings_professions")}
        onDelete={deleteSettingItemAction.bind(null, "settings_professions")}
      />
    </div>
  );
}
