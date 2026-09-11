import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MembrosView from "./MembrosView";
import { expandirUnidades, type UnitLite } from "./unitScope";
import type { SectorOption, ChurchOption } from "./SeletorHierarquico";

export const metadata = { title: "Membros — Igreja" };

const CAMPOS_MEMBRO =
  "id, full_name, email, phone, cpf, registration_number, photo_url, status, financial_status, ecclesiastical_status, ecclesiastical_roles(name)";

export default async function MembrosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sectorsRaw }, { data: unitsRaw }, { data: churchesRaw }] =
    await Promise.all([
      supabase.from("profiles").select("system_role").eq("id", user.id).single(),
      supabase.from("sectors").select("id, name, categoria, unit_id"),
      supabase.from("units").select("id, type, name, parent_id"),
      supabase.from("churches").select("id, name, unit_id"),
    ]);

  const sectors = (sectorsRaw ?? []) as SectorOption[];
  const units = (unitsRaw ?? []) as UnitLite[];
  const churches = (churchesRaw ?? []) as ChurchOption[];

  const isGlobalAdmin = profile?.system_role === "GLOBAL_ADMIN";

  // GLOBAL_ADMIN: vê tudo, mas a tela começa vazia até escolher um
  // Setor/Regional no seletor — evita trazer todo o cadastro de uma vez.
  if (isGlobalAdmin) {
    return (
      <MembrosView
        initialMembers={[]}
        sectors={sectors}
        units={units}
        churches={churches}
        accessibleUnitIds={null}
        escopoFixo={null}
      />
    );
  }

  // Demais perfis (SECTOR_ADMIN, LOCAL_ADMIN, etc.): escopo restrito ao
  // que get_accessible_unit_ids() devolve pro usuário logado — a função
  // já retorna a subárvore expandida (unidade atribuída + descendentes).
  const { data: acessiveis } = await supabase.rpc("get_accessible_unit_ids");
  const idsAcessiveis = ((acessiveis ?? []) as { unit_id: string }[]).map((r) => r.unit_id);
  const escopo = expandirUnidades(idsAcessiveis, units);

  const igrejasNoEscopo = churches.filter((c) => c.unit_id && escopo.has(c.unit_id));

  // Login cujo escopo colapsa pra uma única igreja (ex.: secretário local):
  // não faz sentido mostrar o seletor, já carrega direto os membros dela.
  if (igrejasNoEscopo.length === 1) {
    const igreja = igrejasNoEscopo[0];
    const { data: members } = await supabase
      .from("members")
      .select(CAMPOS_MEMBRO)
      .eq("status", "ACTIVE")
      .eq("church_id", igreja.id)
      .order("full_name");

    return (
      <MembrosView
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialMembers={(members ?? []) as any}
        sectors={sectors}
        units={units}
        churches={churches}
        accessibleUnitIds={idsAcessiveis}
        escopoFixo={{ churchId: igreja.id, nome: igreja.name }}
      />
    );
  }

  // Escopo com mais de uma igreja (setor/regional inteiro, por exemplo):
  // mostra o seletor, mas restrito às unidades acessíveis, e começa vazio.
  return (
    <MembrosView
      initialMembers={[]}
      sectors={sectors}
      units={units}
      churches={churches}
      accessibleUnitIds={idsAcessiveis}
      escopoFixo={null}
    />
  );
}
