import { Map as MapIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "../PageHeader";
import SetoresManager from "./SetoresManager";

type IgrejaRoster = {
  id: string;
  name: string;
  sector_id: string | null;
  pastor_name: string | null;
  pastor_phone: string | null;
  church_phone: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

export default async function SetoresPage() {
  const supabase = await createClient();
  const [setoresRes, regioesRes, unitsRes, churchesRes, membersRes] = await Promise.all([
    supabase.from("sectors").select("id, name, regiao_id, unit_id, categoria, mother_church_id").order("name"),
    supabase.from("regioes").select("id, name").order("name"),
    supabase.from("units").select("id, type, name, parent_id").order("name"),
    supabase
      .from("churches")
      .select("id, name, sector_id, pastor_name, pastor_phone, church_phone, address, address_number, neighborhood, city, state, zip_code")
      .not("sector_id", "is", null)
      .order("name"),
    supabase.from("members").select("church_id"),
  ]);

  // Contagem de membros por igreja — uma query só, reduzida em memória
  // (mais barato que 1 count() por igreja).
  const membrosPorIgreja = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    if (!m.church_id) continue;
    membrosPorIgreja.set(m.church_id, (membrosPorIgreja.get(m.church_id) ?? 0) + 1);
  }

  const igrejasPorSetor = new Map<string, IgrejaRoster[]>();
  for (const c of (churchesRes.data ?? []) as IgrejaRoster[]) {
    if (!c.sector_id) continue;
    const lista = igrejasPorSetor.get(c.sector_id) ?? [];
    lista.push(c);
    igrejasPorSetor.set(c.sector_id, lista);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={MapIcon}
        title="Setores / Regionais"
        description="Organização geográfica e pastoral dos campos — cada setor/regional pertence a 1 região"
        iconColor="text-iw-navy"
        iconBg="bg-iw-sky/20"
      />
      <SetoresManager
        setores={setoresRes.data ?? []}
        regioes={regioesRes.data ?? []}
        units={unitsRes.data ?? []}
        igrejasPorSetor={Object.fromEntries(igrejasPorSetor)}
        membrosPorIgreja={Object.fromEntries(membrosPorIgreja)}
      />
    </div>
  );
}
