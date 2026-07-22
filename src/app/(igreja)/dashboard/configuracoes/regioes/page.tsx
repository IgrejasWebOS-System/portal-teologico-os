import { Globe2, Link2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import {
  addRegiaoAction,
  deleteRegiaoAction,
  vincularSetorRegiaoFormAction,
  desvincularSetorRegiaoFormAction,
} from "../actions";

type SectorRow = {
  id: string;
  name: string;
  regiao_id: string | null;
};

export default async function RegioesPage() {
  const supabase = await createClient();

  const [regioesRes, setoresRes] = await Promise.all([
    supabase.from("regioes").select("id, name").order("name"),
    supabase.from("sectors").select("id, name, regiao_id").order("name"),
  ]);

  const regioes = (regioesRes.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
  const setores = (setoresRes.data ?? []) as unknown as SectorRow[];
  const semRegiao = setores.filter((s) => !s.regiao_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Globe2}
        title="Região"
        description="Agrupamento geográfico de setores — cada setor pertence a 1 região"
        iconColor="text-iw-blue"
        iconBg="bg-iw-blue/10"
      />

      <SimpleSettingsCRUD
        items={regioes}
        placeholder="Ex: REGIÃO SUL, GRANDE PIRACICABA..."
        onAdd={addRegiaoAction}
        onDelete={deleteRegiaoAction}
      />

      {/* Vincular setor a uma região */}
      {regioes.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-1 pb-2 border-b border-iw-border">
            <Link2 className="w-4 h-4 text-iw-blue" />
            Vincular Setor a uma Região
          </h3>
          <form action={vincularSetorRegiaoFormAction} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Setor</label>
              <select
                name="setor_id"
                required
                className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer"
              >
                <option value="">Selecione um setor...</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.regiao_id ? " (já vinculado)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Região</label>
              <select
                name="regiao_id"
                required
                className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer"
              >
                <option value="">Selecione uma região...</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Vincular
            </button>
          </form>
          {semRegiao.length > 0 && (
            <p className="text-xs text-iw-muted">
              {semRegiao.length} setor(es) ainda sem região.
            </p>
          )}
        </div>
      )}

      {/* Setores por região */}
      {regioes.map((regiao) => {
        const membrosRegiao = setores.filter((s) => s.regiao_id === regiao.id);
        return (
          <div key={regiao.id} className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-iw-bg border-b border-iw-border flex items-center justify-between">
              <span className="text-sm font-bold text-iw-navy">{regiao.name}</span>
              <span className="text-xs text-iw-muted">{membrosRegiao.length} setor(es)</span>
            </div>
            {membrosRegiao.length === 0 ? (
              <p className="px-5 py-4 text-xs text-iw-muted">Nenhum setor vinculado ainda.</p>
            ) : (
              <ul className="divide-y divide-iw-border">
                {membrosRegiao.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm text-iw-navy">{s.name}</span>
                    <form action={desvincularSetorRegiaoFormAction.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-iw-muted hover:text-iw-error transition-colors"
                        title="Desvincular"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
