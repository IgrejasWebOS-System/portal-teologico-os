import { Map } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSetorAction, deleteSetorAction } from "../actions";

export default async function SetoresPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sectors")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Map}
        title="Setores"
        description="Organização geográfica e pastoral dos campos"
        iconColor="text-iw-navy"
        iconBg="bg-iw-sky/20"
      />
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: SETOR 01 - SEDE, SETOR 02 - NORTE..."
        onAdd={addSetorAction}
        onDelete={deleteSetorAction}
      />
    </div>
  );
}
