import { Globe2, Link2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SimpleSettingsCRUD from "../SimpleSettingsCRUD";
import RegioesTabs from "./RegioesTabs";
import CoberturaNacional from "./CoberturaNacional";
import type { CoberturaPorUf } from "./BrasilCartograma";
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

type UnitRow = {
  id: string;
  type: string;
  parent_id: string | null;
  legacy_church_id: string | null;
};

const SETOR_TIPO = "SETOR";
const IGREJA_TIPOS = ["IGREJA", "SUB_CONGREGACAO", "PONTO_PREGACAO", "CELULA"];

function computarCoberturaNacional(units: UnitRow[], estadoPorChurchId: Map<string, string>): CoberturaPorUf {
  const filhosPorPai = new Map<string, UnitRow[]>();
  for (const u of units) {
    if (!u.parent_id) continue;
    const lista = filhosPorPai.get(u.parent_id) ?? [];
    lista.push(u);
    filhosPorPai.set(u.parent_id, lista);
  }

  const cobertura: CoberturaPorUf = {};

  const campos = units.filter((u) => u.type === "CAMPO");
  for (const campo of campos) {
    const sede = (filhosPorPai.get(campo.id) ?? []).find((u) => u.type === "SEDE");
    if (!sede) continue;
    const uf = sede.legacy_church_id ? estadoPorChurchId.get(sede.legacy_church_id) : undefined;
    if (!uf) continue;

    let setoresCount = 0;
    let igrejasCount = 0;
    const fila = [...(filhosPorPai.get(sede.id) ?? [])];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      if (atual.type === SETOR_TIPO) setoresCount++;
      if (IGREJA_TIPOS.includes(atual.type)) igrejasCount++;
      const filhos = filhosPorPai.get(atual.id);
      if (filhos) fila.push(...filhos);
    }

    const atual = cobertura[uf] ?? { campos: 0, setores: 0, igrejas: 0 };
    cobertura[uf] = {
      campos: atual.campos + 1,
      setores: atual.setores + setoresCount,
      igrejas: atual.igrejas + igrejasCount,
    };
  }

  return cobertura;
}

export default async function RegioesPage() {
  const supabase = await createClient();

  const [regioesRes, setoresRes, unitsRes, churchesRes] = await Promise.all([
    supabase.from("regioes").select("id, name").order("name"),
    supabase.from("sectors").select("id, name, regiao_id").order("name"),
    supabase.from("units").select("id, type, parent_id, legacy_church_id"),
    supabase.from("churches").select("id, state"),
  ]);

  const regioes = (regioesRes.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
  const setores = (setoresRes.data ?? []) as unknown as SectorRow[];
  const semRegiao = setores.filter((s) => !s.regiao_id);

  const estadoPorChurchId = new Map<string, string>();
  for (const c of churchesRes.data ?? []) {
    if (c.state) estadoPorChurchId.set(c.id as string, (c.state as string).toUpperCase());
  }
  const cobertura = computarCoberturaNacional((unitsRes.data ?? []) as UnitRow[], estadoPorChurchId);

  const regioesInternas = (
    <div className="space-y-6">
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
              <label className="block text-[11px] font-bold text-black uppercase tracking-wider mb-1.5">Setor</label>
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
              <label className="block text-[11px] font-bold text-black uppercase tracking-wider mb-1.5">Região</label>
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
            <p className="text-xs text-black">
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
              <span className="text-sm font-bold text-black">{regiao.name}</span>
              <span className="text-xs text-black">{membrosRegiao.length} setor(es)</span>
            </div>
            {membrosRegiao.length === 0 ? (
              <p className="px-5 py-4 text-xs text-black">Nenhum setor vinculado ainda.</p>
            ) : (
              <ul className="divide-y divide-iw-border">
                {membrosRegiao.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm text-black">{s.name}</span>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Globe2}
        title="Região"
        description="Agrupamento geográfico de setores — cada setor pertence a 1 região"
        iconColor="text-iw-blue"
        iconBg="bg-iw-blue/10"
      />

      <RegioesTabs
        internas={regioesInternas}
        nacional={<CoberturaNacional cobertura={cobertura} />}
      />
    </div>
  );
}
