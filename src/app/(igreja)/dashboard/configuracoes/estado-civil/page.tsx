import { Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function EstadoCivilPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings_civil_status")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Heart}
        title="Estado Civil"
        description="Situação conjugal dos membros"
        iconColor="text-pink-600"
        iconBg="bg-pink-50"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: CASADO(A)"
        onAdd={(fd) => addSettingItemAction("settings_civil_status", fd)}
        onDelete={(id) => deleteSettingItemAction("settings_civil_status", id)}
      />
    </div>
  );
}
