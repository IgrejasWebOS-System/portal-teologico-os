import { LayoutGrid } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import { addSettingItemAction, deleteSettingItemAction } from "../actions";

export default async function DepartamentosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings_departments")
    .select("id, name")
    .order("name");

  // Tabela pode não existir ainda — renderiza vazio e instrui o usuário
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

      {error && (
        <div className="bg-iw-warning-bg border border-iw-warning/20 rounded-xl px-4 py-3 text-sm text-iw-warning">
          <strong>Atenção:</strong> A tabela <code>settings_departments</code> ainda não existe no banco. Execute o SQL de migração abaixo no Supabase antes de usar esta tela.
          <pre className="mt-2 text-xs bg-white/60 rounded-lg p-3 overflow-x-auto">{`CREATE TABLE IF NOT EXISTS settings_departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  uuid REFERENCES churches(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE settings_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church members can manage departments"
  ON settings_departments FOR ALL
  USING (church_id = (SELECT church_id FROM user_profiles WHERE id = auth.uid()));`}</pre>
        </div>
      )}

      {!error && (
        <SimpleSettingsCRUD
          items={items}
          placeholder="Ex: CIBEPI, JOVENS, EBD..."
          onAdd={(fd) => addSettingItemAction("settings_departments", fd)}
          onDelete={(id) => deleteSettingItemAction("settings_departments", id)}
        />
      )}
    </div>
  );
}
