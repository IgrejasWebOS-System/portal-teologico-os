import { GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function EscolaridadesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings_schooling")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={GraduationCap}
        title="Escolaridades"
        description="Níveis de formação acadêmica"
        iconColor="text-iw-success"
        iconBg="bg-iw-success/10"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: ENSINO SUPERIOR"
        onAdd={addSettingItemAction.bind(null, "settings_schooling")}
        onDelete={deleteSettingItemAction.bind(null, "settings_schooling")}
      />
    </div>
  );
}
