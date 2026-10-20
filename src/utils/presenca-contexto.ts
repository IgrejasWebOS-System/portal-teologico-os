// ============================================================
// Controle de presença — quem está operando e quais turmas ele enxerga.
// Uma tela só (components/presenca/PresencaPainel) serve três portas:
//   professor  -> /professor/presenca  (só as turmas vinculadas a ele)
//   secretaria -> /secretaria/presenca (turmas dos núcleos do seu escopo, pela RLS)
//   admin      -> /admin/presenca      (secretaria geral: todas as turmas; só ela muda as regras)
// Server-only. `supabase`/`admin` tipados `any` (mesmo motivo de utils/staff.ts).
// ============================================================

import { checkIsProfessor } from "@/utils/professor";
import { checkIsSecretario } from "@/utils/secretaria";

export type ModoPresenca = "professor" | "secretaria" | "admin";

export interface ContextoPresenca {
  modo: ModoPresenca;
  userId: string;
  papel: "PROFESSOR" | "SECRETARIA"; // papel gravado na chamada
  papelAuditoria: "PROFESSOR" | "SECRETARIA" | "ADMIN_GLOBAL";
  professorId: string | null;
  global: boolean; // só a secretaria geral muda as regras
}

export interface TurmaPresenca {
  id: string; // course_edition_id
  titulo: string;
  tipo: "SEDE" | "SETOR" | "REGIONAL" | "OUTRO"; // para o filtro da tela
  grupo: string; // nome do Setor/Regional (ou da Sede)
  nucleo: string; // nome da igreja/núcleo
  cursoId: string; // courses.id (as aulas pertencem ao curso)
  curso: string; // título do curso
}

// Sede = unidade SEDE; Setor/Regional = pai do núcleo, pelo nome ("REGIONAL 003", "SETOR 001").
function classificar(nomeGrupo: string, tipoUnidade: string | null): TurmaPresenca["tipo"] {
  if (tipoUnidade === "SEDE") return "SEDE";
  const n = nomeGrupo.trim().toUpperCase();
  if (n.startsWith("REGIONAL")) return "REGIONAL";
  if (n.startsWith("SETOR")) return "SETOR";
  return "OUTRO";
}

export function ehModo(v: unknown): v is ModoPresenca {
  return v === "professor" || v === "secretaria" || v === "admin";
}

export async function resolverContexto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  modo: ModoPresenca
): Promise<ContextoPresenca | null> {
  if (modo === "professor") {
    const p = await checkIsProfessor(supabase, userId);
    if (!p) return null;
    return { modo, userId, papel: "PROFESSOR", papelAuditoria: "PROFESSOR", professorId: p.id, global: false };
  }
  if (modo === "secretaria") {
    const s = await checkIsSecretario(supabase, userId);
    if (!s) return null;
    return { modo, userId, papel: "SECRETARIA", papelAuditoria: "SECRETARIA", professorId: null, global: false };
  }
  const { data: profile } = await supabase.from("profiles").select("system_role").eq("id", userId).maybeSingle();
  if (profile?.system_role !== "GLOBAL_ADMIN") return null;
  return { modo, userId, papel: "SECRETARIA", papelAuditoria: "ADMIN_GLOBAL", professorId: null, global: true };
}

// Turmas novas (sem "(LEG-") que o operador enxerga.
export async function turmasDoEscopo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  ctx: ContextoPresenca
): Promise<TurmaPresenca[]> {
  const sel = "course_edition_id, course_editions(id, nome, classe, unit_id, course_id, courses(title))";
  let linhas: unknown[] = [];
  if (ctx.modo === "professor") {
    const { data } = await admin.from("professor_turmas").select(sel).eq("professor_id", ctx.professorId);
    linhas = data ?? [];
  } else if (ctx.modo === "secretaria") {
    // client normal: a RLS limita ao escopo do secretário
    const { data } = await supabase.from("professor_turmas").select(sel);
    linhas = data ?? [];
  } else {
    const { data } = await admin.from("professor_turmas").select(sel);
    linhas = data ?? [];
  }
  type Ed = { id: string; nome: string; classe: string | null; unit_id: string | null; course_id: string; courses: { title: string } | { title: string }[] | null };
  const eds: Ed[] = [];
  for (const l of linhas as { course_editions: unknown }[]) {
    const ed = (Array.isArray(l.course_editions) ? l.course_editions[0] : l.course_editions) as Ed | null;
    if (ed && !ed.nome.includes("(LEG-")) eds.push(ed);
  }

  // Núcleo (unidade da turma) e o pai dele (Setor/Regional). Só nomes: leitura com admin.
  const unitIds = [...new Set(eds.map((e) => e.unit_id).filter(Boolean))] as string[];
  const { data: unidades } = unitIds.length
    ? await admin.from("units").select("id, name, type, parent_id").in("id", unitIds)
    : { data: [] };
  const uMap = new Map<string, { name: string; type: string; parent_id: string | null }>(
    (unidades ?? []).map((u: { id: string; name: string; type: string; parent_id: string | null }) => [u.id, u])
  );
  const paiIds = [...new Set([...uMap.values()].map((u) => u.parent_id).filter(Boolean))] as string[];
  const { data: pais } = paiIds.length
    ? await admin.from("units").select("id, name, type").in("id", paiIds)
    : { data: [] };
  const pMap = new Map<string, { name: string; type: string }>(
    (pais ?? []).map((p: { id: string; name: string; type: string }) => [p.id, p])
  );

  const mapa = new Map<string, TurmaPresenca>();
  for (const ed of eds) {
    const c = Array.isArray(ed.courses) ? ed.courses[0] : ed.courses;
    const u = ed.unit_id ? uMap.get(ed.unit_id) : undefined;
    const pai = u?.parent_id ? pMap.get(u.parent_id) : undefined;
    const grupo = u?.type === "SEDE" ? (u.name ?? "Sede") : (pai?.name ?? u?.name ?? "Sem setor");
    mapa.set(ed.id, {
      id: ed.id,
      titulo: `${c?.title ?? "Curso"} — ${ed.nome}${ed.classe ? ` (Classe ${ed.classe})` : ""}`,
      tipo: classificar(grupo, u?.type ?? null),
      grupo,
      nucleo: u?.name ?? "—",
      cursoId: ed.course_id,
      curso: c?.title ?? "Curso",
    });
  }
  return [...mapa.values()].sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR", { numeric: true }) || a.titulo.localeCompare(b.titulo, "pt-BR"));
}
