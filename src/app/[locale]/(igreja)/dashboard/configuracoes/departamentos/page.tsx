import { LayoutGrid } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addDepartamentoAction, deleteDepartamentoAction } from "../actions";

export default async function DepartamentosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const items = (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={LayoutGrid}
        title="Departamentos"
        description="CIBEPI, EBD, Jovens, Mocidade e demais ministérios"
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
      />
      <p className="text-xs text-iw-muted bg-iw-warning-bg border border-iw-warning/20 rounded-xl px-4 py-2.5">
        Cadastro reservado: nenhuma tela do sistema hoje vincula um registro (membro, conta financeira etc.) a um Departamento. Serve como lista de referência até que essa ligação seja implementada.
      </p>
      <SimpleSettingsCRUD
        items={items}
        placeholder="Ex: CIBEPI, JOVENS, EBD..."
        onAdd={addDepartamentoAction}
        onDelete={deleteDepartamentoAction}
      />
    </div>
  );
}
