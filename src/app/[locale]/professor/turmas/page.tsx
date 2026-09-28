import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import TurmasDoProfessor, { type TurmaVinculo } from "../TurmasDoProfessor";

export const metadata = { title: "Minhas Turmas — Área do Professor" };

// ============================================================
// /professor/turmas — extraído de page.tsx em 27/09/2026 (Fase 1 do
// Painel do Professor). Mesma query de turmas que já existia na página
// única antiga; só "Minhas Turmas" (TurmasDoProfessor), sem o
// headerRight de busca/Nova Matrícula (isso agora mora em /professor/
// alunos, que é sobre alunos, não sobre turmas).
// ============================================================

export default async function TurmasDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const [{ data: cursosRaw }, { data: unitsRaw }, { data: turmasRaw }] = await Promise.all([
    admin.from("courses").select("id, title").eq("visivel_busca", true).order("title"),
    admin.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
    admin
      .from("professor_turmas")
      .select("id, turno, dia_semana, link_token, link_ativo, course_edition_id, course_editions(nome, classe, courses(title), units(name))")
      .eq("professor_id", professor.id)
      .order("created_at", { ascending: false }),
  ]);

  const turmasDoProfessor: TurmaVinculo[] = (turmasRaw ?? []).map((t) => ({
    id: t.id,
    turno: t.turno,
    dia_semana: t.dia_semana,
    link_token: t.link_token,
    link_ativo: t.link_ativo,
    course_edition_id: t.course_edition_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    course_edition: (Array.isArray(t.course_editions) ? t.course_editions[0] : t.course_editions) as any,
  }));

  return (
    <div>
      <h1 className="text-2xl font-black text-iw-navy mb-6">Minhas turmas</h1>

      {msg && (
        <div className="mb-6 flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {professor.cadastro_publico && turmasDoProfessor.length === 0 && (
        <div className="mb-6 flex flex-col items-center gap-2 bg-amber-50 border border-amber-200 text-black px-4 py-3.5 rounded-xl text-sm text-center">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="uppercase font-bold">
            Você ainda não cadastrou nenhuma turma. Sem ao menos uma turma, o sistema não tem como gerar o
            link de matrícula para seus alunos — vincule a primeira abaixo.
          </span>
        </div>
      )}

      <TurmasDoProfessor
        cursos={cursosRaw ?? []}
        units={(unitsRaw ?? []) as { id: string; type: string; name: string; parent_id: string | null }[]}
        turmas={turmasDoProfessor}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
      />
    </div>
  );
}
