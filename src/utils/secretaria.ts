// ============================================================
// checkIsSecretario — "Secretário de Setor" (04/10/2026, pedido do
// Joaquim). Papel distinto de checkIsStaff (que só olha
// profiles.system_role, sem noção de unidade) e de checkIsProfessor
// (escopado a UM núcleo via professores.unit_id). Aqui o escopo é o de
// admin_roles: level 1 (Master/Campo), 2 (Admin-Sede) ou 3 (Admin-Setor)
// — todos "secretaria com escopo", diferente de level 0 (Super-Master,
// sem unidade, vê tudo — não precisa desta tela) e level 4 (Acesso ao
// núcleo de ensino — já atendido por /professor).
//
// `supabase` tipado `any` de propósito — mesmo motivo do comentário em
// utils/staff.ts ("Type instantiation is excessively deep").
// ============================================================

export interface SecretarioLogado {
  level: number; // 1, 2 ou 3
  unitId: string; // admin_roles.unit_id do nível mais abrangente do usuário
  roleTitle: string | null;
}

export async function checkIsSecretario(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<SecretarioLogado | null> {
  const { data } = await supabase
    .from("admin_roles")
    .select("level, unit_id, role_title")
    .eq("user_id", userId)
    .gte("level", 1)
    .lte("level", 3)
    // Migration 130: só quem tem acesso à CETADP entra na Área da
    // Secretaria. Secretário só da igreja (dominio = 'IGREJA') não.
    .in("dominio", ["CETADP", "AMBOS"])
    .not("unit_id", "is", null)
    .order("level", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data || !data.unit_id) return null;

  return { level: data.level, unitId: data.unit_id, roleTitle: data.role_title ?? null };
}

// true = o usuário só tem acesso à CETADP (nenhum vínculo IGREJA/AMBOS e
// nenhum nível 0). Usado pelo middleware pra mandar esse secretário de
// volta pra /secretaria quando ele tenta abrir a área de membros da igreja
// (migration 130 — secretário CETADP não vê a igreja).
export async function checkSecretarioSoCetadp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from("admin_roles").select("level, dominio").eq("user_id", userId);
  const roles = (data ?? []) as { level: number; dominio: string }[];
  if (roles.length === 0) return false;
  if (roles.some((r) => r.level === 0 || r.dominio === "IGREJA" || r.dominio === "AMBOS")) return false;
  return roles.some((r) => r.level >= 1 && r.level <= 3 && r.dominio === "CETADP");
}

export interface NucleoOption {
  unitId: string;
  churchId: string;
  nome: string;
}

// Lista de núcleos (igrejas) dentro do escopo do usuário logado.
//
// 04/10/2026, achado em teste (Joaquim): a policy de SELECT em
// `churches` é aberta pra qualquer autenticado (churches_select_
// authenticated, qual = true — staff/professor precisa listar igrejas
// em formulários de matrícula etc.), diferente de professores/
// ead_alunos/ead_matriculas/fin_contas_receber. Só a escrita em
// `churches` é escopada (churches_write_scoped). Por isso esta função
// NÃO pode confiar na RLS sozinha como as outras — precisa filtrar
// explicitamente por get_accessible_unit_ids() aqui.
export async function getNucleosDoEscopo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<NucleoOption[]> {
  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIds = (unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id);
  if (unitIds.length === 0) return [];

  const { data } = await supabase
    .from("churches")
    .select("id, name, unit_id")
    .in("unit_id", unitIds)
    .order("name");

  return (data ?? []).map((c: { id: string; name: string; unit_id: string }) => ({
    unitId: c.unit_id,
    churchId: c.id,
    nome: c.name,
  }));
}
