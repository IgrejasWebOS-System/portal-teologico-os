import { MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addRegiaoDFAction, deleteRegiaoDFAction } from "../actions";

export default async function RegioesDFPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings_custom_regions")
    .select("id, name")
    .eq("state_uf", "DF")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={MapPin}
        title="Regiões DF"
        description="Mapeamento de regiões administrativas do Distrito Federal"
        iconColor="text-iw-warning"
        iconBg="bg-iw-warning-bg"
      />
      <p className="text-xs text-iw-muted bg-iw-warning-bg border border-iw-warning/20 rounded-xl px-4 py-2.5">
        Estas regiões substituem a lista de cidades quando o membro é do Distrito Federal.
      </p>
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: TAGUATINGA SUL"
        onAdd={addRegiaoDFAction}
        onDelete={deleteRegiaoDFAction}
      />
    </div>
  );
}
