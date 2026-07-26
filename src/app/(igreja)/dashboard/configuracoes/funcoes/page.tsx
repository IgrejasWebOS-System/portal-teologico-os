import { UserCog } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function FuncoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("function_roles")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={UserCog}
        title="Função"
        description="Papéis operacionais (Líder, Secretário, Tesoureiro...) atribuídos a membros por departamento e escopo"
        iconColor="text-iw-sky"
        iconBg="bg-iw-sky/20"
      />
      <p className="text-xs text-iw-muted bg-iw-warning-bg border border-iw-warning/20 rounded-xl px-4 py-2.5">
        Aqui você cadastra só os papéis (Líder, Secretário, Tesoureiro...). A atribuição de cada
        função a um membro específico — em qual departamento e se é da Igreja ou do Setor — é
        feita na ficha de edição do próprio membro.
      </p>
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: LÍDER, SECRETÁRIO, TESOUREIRO..."
        onAdd={addSettingItemAction.bind(null, "function_roles")}
        onDelete={deleteSettingItemAction.bind(null, "function_roles")}
      />
    </div>
  );
}
