import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MembrosView from "./MembrosView";
import { expandirUnidades, type UnitLite } from "./unitScope";
import type { SectorOption, ChurchOption } from "./SeletorHierarquico";

export const metadata = { title: "Membros — Igreja" };

const CAMPOS_MEMBRO =
  "id, full_name, email, phone, cpf, registration_number, photo_url, status, financial_status, ecclesiastical_status, ecclesiastical_roles(name)";

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ igreja?: string; arquivo?: string }>;
}) {
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
      supabase.from("churches").select("id, name, unit_id, sector_id"),
    ]);

  const sectors = (sectorsRaw ?? []) as SectorOption[];
  const units = (unitsRaw ?? []) as UnitLite[];
  const churches = (churchesRaw ?? []) as ChurchOption[];

  // Deep-link vindo do botão "Membros > Ir para Cadastro" em
  // /dashboard/configuracoes/igrejas (?igreja=<id>) -- pré-seleciona
  // Setor + Igreja no seletor, sem precisar de mais nenhum clique.
  // Pedido do Joaquim em 2026-09-18.
  const { igreja: igrejaQuery, arquivo: arquivoQuery } = await searchParams;
  const igrejaDeepLink = igrejaQuery
    ? (churchesRaw ?? []).find((c) => c.id === igrejaQuery)
    : null;
  const setorInicialId = igrejaDeepLink?.sector_id ?? null;
  const igrejaInicialId = igrejaDeepLink?.id ?? null;

  // Deep-link vindo do botão "Arquivo Morto" em Igrejas/Pontos de
  // Pregação/Células/Sub-congregações (?arquivo=1) -- abre a tela já no
  // modo Arquivo Morto, sem precisar clicar de novo aqui dentro (pedido
  // do Joaquim em 2026-09-18).
  const arquivoInicial = arquivoQuery === "1";

  // Igreja "SEDE" (topo da árvore, unit type='SEDE') -- selecioná-la no
  // seletor já traz direto os membros dela, sem precisar expandir a
  // subárvore (que incluiria TODOS os Setores/Regionais, já que a unidade
  // SEDE também é pai deles). Ver SeletorHierarquico/MembrosView.
  const sedeUnitId = units.find((u) => u.type === "SEDE")?.id ?? null;
  const sedeChurchId = sedeUnitId ? churches.find((c) => c.unit_id === sedeUnitId)?.id ?? null : null;

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
        sedeChurchId={sedeChurchId}
        setorInicialId={setorInicialId}
        igrejaInicialId={igrejaInicialId}
        arquivoInicial={arquivoInicial}
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
      .eq("status", arquivoInicial ? "ARCHIVED" : "ACTIVE")
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
        sedeChurchId={sedeChurchId}
        arquivoInicial={arquivoInicial}
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
      sedeChurchId={sedeChurchId}
      setorInicialId={setorInicialId}
      igrejaInicialId={igrejaInicialId}
      arquivoInicial={arquivoInicial}
    />
  );
}
