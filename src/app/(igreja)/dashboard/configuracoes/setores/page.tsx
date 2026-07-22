import { Map } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SetoresManager from "./SetoresManager";

export default async function SetoresPage() {
  const supabase = await createClient();
  const [setoresRes, regioesRes] = await Promise.all([
    supabase.from("sectors").select("id, name, regiao_id").order("name"),
    supabase.from("regioes").select("id, name").order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Map}
        title="Setores"
        description="Organização geográfica e pastoral dos campos — cada setor pertence a 1 região"
        iconColor="text-iw-navy"
        iconBg="bg-iw-sky/20"
      />
      <SetoresManager
        setores={setoresRes.data ?? []}
        regioes={regioesRes.data ?? []}
      />
    </div>
  );
}
