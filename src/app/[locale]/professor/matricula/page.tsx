import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { professorCriarMatriculaAction } from "../actions";
import ProfessorNovaMatriculaForm from "../ProfessorNovaMatriculaForm";

export const metadata = { title: "Nova Matrícula — Área do Professor" };

// ============================================================
// /professor/matricula (27/09/2026, pedido do Joaquim) — item próprio na
// sidebar, logo abaixo de Dashboard. Antes "Nova Matrícula" era um botão
// dentro de /professor/alunos que abria um modal; o botão saiu de lá (ver
// alunos/page.tsx) e o mesmo formulário (ProfessorNovaMatriculaForm.tsx,
// agora com a caixa de Pagamento + modal de confirmação de parcelas,
// espelhando admin/matriculas/nova/NovaMatriculaForm.tsx) abre direto
// nesta rota, sempre aberto (autoAbrir), sem o botão de gatilho.
// ============================================================

export default async function MatriculaDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const [{ data: turmasRaw }, { data: profissoesRaw }] = await Promise.all([
    admin
      .from("professor_turmas")
      .select("course_edition_id, course_editions(nome, classe, course_id, courses(title))")
      .eq("professor_id", professor.id),
    admin.from("settings_professions").select("id, name").order("name"),
  ]);

  const turmasFiltroOptions = (turmasRaw ?? [])
    .filter((t) => t.course_edition_id)
    .map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce = (Array.isArray(t.course_editions) ? t.course_editions[0] : t.course_editions) as any;
      // course_editions.courses vem ora como objeto, ora como array de 1 —
      // mesma defesa usada em professor/actions.ts (professorCriarMatriculaAction).
      const cursoRaw = ce?.courses;
      const curso = Array.isArray(cursoRaw) ? cursoRaw[0] : cursoRaw;
      return {
        id: t.course_edition_id as string,
        courseId: (ce?.course_id as string) ?? "",
        label: `${curso?.title ?? "Curso"} — ${ce?.nome ?? ""}${ce?.classe ? ` (Classe ${ce.classe})` : ""}`,
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
      <div>
        <h1 className="text-2xl font-black text-black mb-6">Nova Matrícula</h1>
        <div className="flex flex-col items-center gap-2 bg-amber-50 border border-amber-200 text-black px-4 py-3.5 rounded-xl text-sm text-center max-w-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="uppercase font-bold">
            Você ainda não tem nenhuma turma vinculada — vincule uma em &ldquo;Turmas&rdquo; antes de
            matricular alunos.
          </span>
          <Link href="/professor/turmas" className="underline text-iw-navy font-semibold">
            Ir para Turmas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProfessorNovaMatriculaForm
      action={professorCriarMatriculaAction}
      turmasDoProfessor={turmasFiltroOptions}
      profissoes={profissoesRaw ?? []}
      precos={precosRaw ?? []}
      errorMsg={error}
      autoAbrir
      voltarHref="/professor/alunos"
    />
  );
}
