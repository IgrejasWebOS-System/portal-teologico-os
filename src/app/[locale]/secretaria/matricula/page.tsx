import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import { secretariaCriarMatriculaAction } from "../actions";
import ProfessorNovaMatriculaForm from "../../professor/ProfessorNovaMatriculaForm";
import NucleoSelector from "../NucleoSelector";

export const metadata = { title: "Nova Matrícula — Área da Secretaria" };

// ============================================================
// /secretaria/matricula — Etapa 3 (04/10/2026). Reaproveita o mesmo
// formulário do Professor (ProfessorNovaMatriculaForm já é genérico:
// só recebe uma lista de { id, label, courseId }, sem assumir um
// professor fixo) — a única diferença real é que a lista de turmas
// aqui cobre TODOS os professores dentro do escopo do secretário, não
// só um, e o label de cada turma inclui o nome do professor/núcleo
// pra desambiguar. A action (secretariaCriarMatriculaAction) resolve o
// professor_id a partir da turma escolhida, com a mesma validação de
// escopo que as outras páginas já usam.
// ============================================================

export default async function MatriculaSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; nucleo?: string }>;
}) {
  const { error, nucleo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  let professoresQuery = supabase.from("professores").select("id, nome_completo, church_id, churches(name)");
  if (nucleo) professoresQuery = professoresQuery.eq("church_id", nucleo);
  const { data: professoresRaw } = await professoresQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const professores = (professoresRaw ?? []) as any[];
  const professorInfo = new Map(professores.map((p) => [p.id, p]));
  const professorIds = professores.map((p) => p.id);

  const admin = createAdminClient();

  const [{ data: turmasRaw }, { data: profissoesRaw }] = await Promise.all([
    professorIds.length
      ? admin
          .from("professor_turmas")
          .select("professor_id, course_edition_id, course_editions(nome, classe, course_id, courses(title))")
          .in("professor_id", professorIds)
      : Promise.resolve({ data: [] as { professor_id: string; course_edition_id: string }[] }),
    admin.from("settings_professions").select("id, name").order("name"),
  ]);

  const turmasFiltroOptions = (turmasRaw ?? [])
    .filter((t) => t.course_edition_id)
    .map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce = (Array.isArray((t as any).course_editions) ? (t as any).course_editions[0] : (t as any).course_editions) as any;
      const cursoRaw = ce?.courses;
      const curso = Array.isArray(cursoRaw) ? cursoRaw[0] : cursoRaw;
      const professor = professorInfo.get(t.professor_id);
      const nucleoNome = professor?.churches?.name ?? "—";
      return {
        id: t.course_edition_id as string,
        courseId: (ce?.course_id as string) ?? "",
        label: `${curso?.title ?? "Curso"} — ${ce?.nome ?? ""}${ce?.classe ? ` (Classe ${ce.classe})` : ""} · ${professor?.nome_completo ?? "—"} (${nucleoNome})`,
      };
    })
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const courseIds = Array.from(new Set(turmasFiltroOptions.map((t) => t.courseId).filter(Boolean)));
  const { data: precosRaw } = courseIds.length
    ? await admin
        .from("course_pricing")
        .select("course_id, valor_matricula_centavos, valor_parcela_centavos, numero_parcelas")
        .in("course_id", courseIds)
    : { data: [] };

  if (turmasFiltroOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-black text-black">Nova Matrícula</h1>
          <NucleoSelector nucleos={nucleos} />
        </div>
        <div className="flex flex-col items-center gap-2 bg-amber-50 border border-amber-200 text-black px-4 py-3.5 rounded-xl text-sm text-center max-w-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="uppercase font-bold">
            Nenhuma turma encontrada nos seus núcleos — os professores precisam vincular uma turma antes de você
            poder matricular alunos nela.
          </span>
          <Link href="/secretaria/turmas" className="underline text-iw-navy font-semibold">
            Ir para Turmas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <NucleoSelector nucleos={nucleos} />
      </div>
      <ProfessorNovaMatriculaForm
        action={secretariaCriarMatriculaAction}
        turmasDoProfessor={turmasFiltroOptions}
        profissoes={profissoesRaw ?? []}
        precos={precosRaw ?? []}
        errorMsg={error}
        autoAbrir
        voltarHref="/secretaria/alunos"
      />
    </div>
  );
}
