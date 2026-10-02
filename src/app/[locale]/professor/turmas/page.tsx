import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import TurmasDoProfessor, { type TurmaVinculo } from "../TurmasDoProfessor";
import PedidosMaterialProfessor, { type TurmaPedidoMaterial } from "./PedidosMaterialProfessor";
import {
  professorCriarPedidoMaterialAction,
  professorAtualizarCalendarioAulaAction,
  professorRecalcularCalendarioTurmaAction,
} from "../actions";

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

  // 29/09/2026, pedido do Joaquim (redesenho do material didático — migration
  // 122): material é por AULA e o pedido pra gráfica é feito perto do fim da
  // aula atual (10 dias corridos antes). Monta, por turma, o calendário de
  // aulas + contagem de alunos em andamento + pedidos já feitos, pra
  // PedidosMaterialProfessor decidir sozinho quais turmas precisam de alerta.
  const courseEditionIds = turmasDoProfessor.map((t) => t.course_edition_id);
  let turmasPedidoMaterial: TurmaPedidoMaterial[] = [];

  if (courseEditionIds.length > 0) {
    const [{ data: scheduleRaw }, { data: matriculasRaw }, { data: pedidosRaw }] = await Promise.all([
      admin
        .from("course_edition_lesson_schedule")
        .select("course_edition_id, lesson_id, ordem, data_inicio, data_fim, lessons(title)")
        .in("course_edition_id", courseEditionIds)
        .order("ordem"),
      admin
        .from("ead_matriculas")
        .select("course_edition_id")
        .in("course_edition_id", courseEditionIds)
        .eq("status", "EM_ANDAMENTO"),
      admin
        .from("pedidos_material")
        .select("course_edition_id, lesson_id, status, quantidade_solicitada, created_at")
        .in("course_edition_id", courseEditionIds)
        .order("created_at", { ascending: false }),
    ]);

    const alunosPorTurma = new Map<string, number>();
    for (const m of matriculasRaw ?? []) {
      alunosPorTurma.set(m.course_edition_id, (alunosPorTurma.get(m.course_edition_id) ?? 0) + 1);
    }

    // pedidosRaw vem ordenado do mais recente pro mais antigo — só guarda o
    // primeiro que aparecer por (turma, aula), que é sempre o pedido mais
    // recente daquela aula.
    const pedidosPorTurmaAula = new Map<string, { status: string; quantidade_solicitada: number; created_at: string }>();
    for (const p of pedidosRaw ?? []) {
      const chave = `${p.course_edition_id}:${p.lesson_id}`;
      if (!pedidosPorTurmaAula.has(chave)) {
        pedidosPorTurmaAula.set(chave, {
          status: p.status,
          quantidade_solicitada: p.quantidade_solicitada,
          created_at: p.created_at,
        });
      }
    }

    const licoesPorTurma = new Map<string, Map<string, string>>();
    for (const s of scheduleRaw ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const titulo = ((Array.isArray(s.lessons) ? s.lessons[0] : s.lessons) as any)?.title ?? `Aula ${s.ordem}`;
      const mapa = licoesPorTurma.get(s.course_edition_id) ?? new Map<string, string>();
      mapa.set(s.lesson_id, titulo);
      licoesPorTurma.set(s.course_edition_id, mapa);
    }

    turmasPedidoMaterial = turmasDoProfessor.map((t) => {
      const aulas = (scheduleRaw ?? [])
        .filter((s) => s.course_edition_id === t.course_edition_id)
        .map((s) => ({
          lesson_id: s.lesson_id,
          ordem: s.ordem,
          data_inicio: s.data_inicio,
          data_fim: s.data_fim,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          titulo: ((Array.isArray(s.lessons) ? s.lessons[0] : s.lessons) as any)?.title ?? `Aula ${s.ordem}`,
          // Um pedido CANCELADO não conta como "já pedido" — libera o form
          // de novo pra essa aula.
          pedido: (() => {
            const p = pedidosPorTurmaAula.get(`${t.course_edition_id}:${s.lesson_id}`);
            return p && p.status !== "CANCELADO" ? p : null;
          })(),
        }))
        .sort((a, b) => a.ordem - b.ordem);

      const historico = (pedidosRaw ?? [])
        .filter((p) => p.course_edition_id === t.course_edition_id)
        .map((p) => ({
          lesson_id: p.lesson_id,
          titulo: licoesPorTurma.get(t.course_edition_id)?.get(p.lesson_id) ?? "—",
          status: p.status,
          quantidade_solicitada: p.quantidade_solicitada,
          created_at: p.created_at,
        }));

      return {
        course_edition_id: t.course_edition_id,
        label:
          `${t.course_edition?.courses?.title ?? "Curso"} — ${t.course_edition?.nome ?? ""}` +
          (t.course_edition?.classe ? ` (Classe ${t.course_edition.classe})` : ""),
        aulas,
        alunosEmAndamento: alunosPorTurma.get(t.course_edition_id) ?? 0,
        historico,
      };
    });
  }

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

      {turmasPedidoMaterial.length > 0 && (
        <PedidosMaterialProfessor
          turmas={turmasPedidoMaterial}
          criarPedidoAction={professorCriarPedidoMaterialAction}
          atualizarCalendarioAction={professorAtualizarCalendarioAulaAction}
          recalcularCalendarioAction={professorRecalcularCalendarioTurmaAction}
        />
      )}
    </div>
  );
}
