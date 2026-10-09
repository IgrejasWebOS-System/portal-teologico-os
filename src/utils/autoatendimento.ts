// ============================================================
// Bloqueio de AUTOATENDIMENTO — 09/10/2026, pedido do Joaquim ("persona":
// uma pessoa que é secretária E professora E aluna, ex.: Ana do Amaral
// Gustinelli, setor 015).
//
// Regra de segurança (segregação de funções): quem atua como professor(a)
// ou secretário(a) NUNCA pode, nessa função, criar, editar, cancelar ou
// dar baixa/cancelar/reativar parcelas da PRÓPRIA matrícula de aluno(a).
// Alguém da secretaria/núcleo que não seja ela precisa fazer isso.
//
// Como identificamos "a própria pessoa":
//   1. ead_alunos.user_id = o login da pessoa; ou
//   2. o CPF do aluno é o mesmo CPF do cadastro de professor(a) dela
//      (cobre o caso do aluno cadastrado sem vínculo de login).
//
// Todas as funções recebem um client com leitura em ead_alunos/professores
// (nas Server Actions, o client service_role depois de checar o papel).
// O parâmetro `db` é `any` de propósito (mesmo motivo de utils/staff.ts:
// tipar o SupabaseClient estoura "Type instantiation is excessively deep").
// ============================================================

export const MSG_AUTOATENDIMENTO =
  "Por segurança, você não pode fazer esta operação no seu próprio cadastro de aluno(a). Peça a outra pessoa da secretaria ou do núcleo.";

export interface Identidade {
  userId?: string | null;
  professorId?: string | null;
}

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

async function resolverIdentidade(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  ident: Identidade
): Promise<{ userIds: Set<string>; cpfs: Set<string> }> {
  const userIds = new Set<string>();
  const cpfs = new Set<string>();
  if (ident.userId) userIds.add(ident.userId);

  const registros: { user_id: string | null; cpf: string | null }[] = [];
  if (ident.professorId) {
    const { data } = await db
      .from("professores")
      .select("user_id, cpf")
      .eq("id", ident.professorId)
      .maybeSingle();
    if (data) registros.push(data);
  }
  if (ident.userId) {
    const { data } = await db.from("professores").select("user_id, cpf").eq("user_id", ident.userId).maybeSingle();
    if (data) registros.push(data);
  }
  for (const r of registros) {
    if (r.user_id) userIds.add(r.user_id);
    const c = digitos(r.cpf);
    if (c.length === 11) cpfs.add(c);
  }
  return { userIds, cpfs };
}

// O aluno (ead_alunos.id) é a própria pessoa logada?
export async function alunoEhOProprio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  ident: Identidade,
  alunoId: string | null | undefined
): Promise<boolean> {
  if (!alunoId) return false;
  const { data: aluno } = await db.from("ead_alunos").select("user_id, cpf").eq("id", alunoId).maybeSingle();
  if (!aluno) return false;
  const { userIds, cpfs } = await resolverIdentidade(db, ident);
  if (aluno.user_id && userIds.has(aluno.user_id)) return true;
  const c = digitos(aluno.cpf);
  return c.length === 11 && cpfs.has(c);
}

// O CPF informado numa matrícula nova é o da própria pessoa logada?
export async function cpfEhOProprio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  ident: Identidade,
  cpf: string | null | undefined
): Promise<boolean> {
  const c = digitos(cpf);
  if (c.length !== 11) return false;
  const { cpfs } = await resolverIdentidade(db, ident);
  if (cpfs.has(c)) return true;

  // Também vale se já existir um aluno com esse CPF ligado ao login dela.
  const { userIds } = await resolverIdentidade(db, ident);
  if (userIds.size === 0) return false;
  const mascarado = `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
  const { data } = await db.from("ead_alunos").select("user_id").in("cpf", [c, mascarado]).limit(5);
  return (data ?? []).some((a: { user_id: string | null }) => a.user_id && userIds.has(a.user_id));
}

// A matrícula (ead_matriculas.id) é de um aluno que é a própria pessoa?
export async function matriculaEhDoProprio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  ident: Identidade,
  matriculaId: string | null | undefined
): Promise<boolean> {
  if (!matriculaId) return false;
  const { data } = await db.from("ead_matriculas").select("aluno_id").eq("id", matriculaId).maybeSingle();
  return alunoEhOProprio(db, ident, data?.aluno_id);
}
