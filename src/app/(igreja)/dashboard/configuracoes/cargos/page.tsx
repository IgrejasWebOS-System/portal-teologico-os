import { Briefcase } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function CargosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ecclesiastical_roles")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Briefcase}
        title="Cargos"
        description="Funções eclesiásticas e administrativas"
        iconColor="text-iw-gold"
        iconBg="bg-iw-gold/10"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: PASTOR PRESIDENTE"
        onAdd={addSettingItemAction.bind(null, "ecclesiastical_roles")}
        onDelete={deleteSettingItemAction.bind(null, "ecclesiastical_roles")}
      />
    </div>
  );
}
