import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { enrollAction, completeLessonAction } from "@/app/course-actions";
import { iniciarAvaliacaoAction } from "@/app/portal/avaliacoes/actions";
import Link from "next/link";
import {
  GraduationCap,
  Clock,
  User,
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  ChevronLeft,
  Play,
  Youtube,
  Video,
  Bot,
  AlertTriangle,
} from "lucide-react";
import type { ElementType } from "react";
import type { Lesson, VideoType } from "@/types";
import EscolaLessonPlayer from "./EscolaLessonPlayer";

const LIMITE_SIMULADOS = 2;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aula?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("title")
    .eq("id", id)
    .single();
  return { title: data?.title ?? "Disciplina" };
}

const VIDEO_ICON: Record<VideoType, ElementType> = {
  youtube: Youtube,
  direct:  Video,
  virtual: Bot,
  none:    Play,
};

function fmtDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function EscolaDetailPage({ params, searchParams }: Props) {
  const { id }    = await params;
  const { aula: aulaId } = await searchParams;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("module", "escola")
    .single();

  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", id)
    .order("order_index");

  const lessonList = (lessons ?? []) as Lesson[];

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", id)
    .maybeSingle();

  const completedIds = new Set<string>();
  if (enrollment && lessonList.length > 0) {
    const { data: completions } = await supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", user.id)
      .in("lesson_id", lessonList.map((l) => l.id));
    completions?.forEach((c) => completedIds.add(c.lesson_id));
  }

  const isEnrolled  = !!enrollment;
  const isCompleted = enrollment?.status === "COMPLETED";
  const returnPath  = `/escola/${id}`;

  // Simulados/prova — só existe se o aluno tiver matrícula oficial
  // (ead_matriculas) neste curso, além do enrollment genérico acima.
  const admin = createAdminClient();
  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let matricula: { id: string; status: string } | null = null;
  let simuladosDoAluno: { id: string; status: string; nota: number | null; iniciada_em: string }[] = [];
  let provaExistente: { id: string; status: string; nota: number | null } | null = null;

  if (aluno) {
    const { data: matriculaRow } = await admin
      .from("ead_matriculas")
      .select("id, status")
      .eq("aluno_id", aluno.id)
      .eq("course_id", id)
      .maybeSingle();

    if (matriculaRow) {
      matricula = matriculaRow;
      const { data: avaliacoesDoAluno } = await admin
        .from("avaliacoes")
        .select("id, tipo, status, nota, iniciada_em")
        .eq("matricula_id", matriculaRow.id)
        .order("iniciada_em", { ascending: false });

      simuladosDoAluno = (avaliacoesDoAluno ?? []).filter((a) => a.tipo === "SIMULADO");
      provaExistente = (avaliacoesDoAluno ?? []).find((a) => a.tipo === "PROVA") ?? null;
    }
  }

  const simuladosFeitos = simuladosDoAluno.length;

  const simuladosEsgotados = simuladosFeitos >= LIMITE_SIMULADOS;
  const progresso = enrollment?.progress_percent ?? 0;
  const provaLiberada = progresso === 100;
  const matriculaEmAndamento = matricula?.status === "EM_ANDAMENTO";
  // O card fica visível também depois de concluída a matrícula, se já
  // houver simulado ou prova no histórico — não some quando o aluno é
  // aprovado/reprovado, só as ações de iniciar nova tentativa é que
  // ficam restritas a matrícula em andamento.
  const podeAvaliar = !!matricula && (matriculaEmAndamento || !!provaExistente || simuladosDoAluno.length > 0);

  // Active lesson (via URL param or first lesson)
  const activeLesson = aulaId
    ? lessonList.find((l) => l.id === aulaId)
    : lessonList[0];

  const hasVideo = activeLesson?.video_type && activeLesson.video_type !== "none" && activeLesson.video_url;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] xl:grid-rows-[auto_auto] gap-6">

        {/* Video Player — linha 1, coluna 1 */}
        <div className="xl:col-start-1 xl:row-start-1">
          {activeLesson && (isEnrolled || activeLesson.is_free_preview) ? (
            <EscolaLessonPlayer
              lesson={activeLesson}
              courseId={course.id}
              returnPath={returnPath}
            />
          ) : activeLesson && !isEnrolled ? (
            <div className="aspect-video rounded-2xl bg-iw-navy/5 border border-iw-border flex flex-col items-center justify-center gap-3 text-iw-muted">
              <Lock className="w-8 h-8 opacity-30" />
              <p className="text-sm font-medium">Matricule-se para assistir</p>
            </div>
          ) : null}
        </div>

        {/* ── Aulas da disciplina — linha 1, coluna 2 ── */}
        <div className="xl:col-start-2 xl:row-start-1 bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-iw-border flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-iw-navy text-sm">Aulas da disciplina</h2>
              {!isEnrolled && (
                <p className="text-xs text-iw-muted mt-0.5">Matricule-se para acompanhar.</p>
              )}
            </div>
            <Link
              href="/escola"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-iw-navy border border-iw-border rounded-lg px-2.5 py-1.5 hover:bg-iw-bg transition-colors shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Escola Teológica
            </Link>
          </div>
          <div className="divide-y divide-iw-border max-h-[500px] overflow-y-auto">
            {lessonList.length === 0 ? (
              <div className="px-4 py-8 text-center text-iw-muted text-sm">
                Nenhuma aula cadastrada ainda.
              </div>
            ) : (
              lessonList.map((lesson) => {
                const isDone   = completedIds.has(lesson.id);
                const isActive = lesson.id === (aulaId ?? lessonList[0]?.id);
                const VIcon    = VIDEO_ICON[lesson.video_type as VideoType] ?? Play;
                const hasVid   = lesson.video_type !== "none" && lesson.video_url;
                const canPlay  = isEnrolled || lesson.is_free_preview;

                return (
                  <Link
                    key={lesson.id}
                    href={`/escola/${id}?aula=${lesson.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive
                        ? "bg-iw-blue/8 border-l-2 border-iw-blue"
                        : "hover:bg-iw-bg/50 border-l-2 border-transparent"
                    }`}
                  >
                    {/* Status icon */}
                    <div className="shrink-0 w-5">
                      {!canPlay ? (
                        <Lock className="w-3.5 h-3.5 text-iw-muted/30" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-iw-success" />
                      ) : (
                        <Circle className="w-4 h-4 text-iw-border" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isActive ? "text-iw-blue"
                        : isDone ? "line-through text-iw-muted"
                        : canPlay ? "text-iw-navy" : "text-iw-muted/60"
                      }`}>
                        <span className="text-iw-muted/50 font-normal mr-1">
                          {String(lesson.order_index).padStart(2, "0")}.
                        </span>
                        {lesson.title}
                      </p>
                      {fmtDuration(lesson.video_duration_secs) && (
                        <p className="text-[10px] text-iw-muted mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtDuration(lesson.video_duration_secs)}
                        </p>
                      )}
                    </div>

                    {hasVid && (
                      <VIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-iw-blue" : "text-iw-muted/40"}`} />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Complete lesson button (when not in player, fallback) */}
          {isEnrolled && activeLesson && !completedIds.has(activeLesson.id) && !hasVideo && (
            <div className="px-4 py-3 border-t border-iw-border">
              <form action={completeLessonAction}>
                <input type="hidden" name="lessonId"   value={activeLesson.id} />
                <input type="hidden" name="courseId"   value={course.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <button type="submit"
                  className="w-full py-2 rounded-lg bg-iw-success/10 text-iw-success text-sm font-semibold hover:bg-iw-success/20 transition-colors">
                  Marcar aula como concluída
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Course info — linha 2, coluna 1 */}
        <div className="xl:col-start-1 xl:row-start-2 bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-iw-navy/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-iw-navy" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-iw-navy">{course.title}</h1>
                  {activeLesson && (
                    <p className="text-xs text-iw-muted mt-0.5">
                      Aula {activeLesson.order_index}: {activeLesson.title}
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                isCompleted ? "bg-iw-success/10 text-iw-success"
                : isEnrolled ? "bg-iw-blue/10 text-iw-blue"
                : "bg-iw-muted/10 text-iw-muted"
              }`}>
                {isCompleted ? "Concluído" : isEnrolled ? "Em andamento" : "Disponível"}
              </span>
            </div>

            {course.description && (
              <p className="text-iw-muted text-sm leading-relaxed mb-4">{course.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-iw-muted">
              {course.instructor_name && (
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{course.instructor_name}</span>
              )}
              {course.duration_hours && (
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{course.duration_hours}h</span>
              )}
              <span>{lessonList.length} aulas</span>
              <span>{lessonList.filter((l) => l.video_type !== "none" && l.video_url).length} com vídeo</span>
            </div>

            {/* Progress */}
            {isEnrolled && (
              <div className="mt-4 pt-4 border-t border-iw-border">
                {isCompleted ? (
                  <div className="flex items-center gap-3 text-iw-success">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm font-semibold">Disciplina concluída! Parabéns.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-iw-muted">Progresso</span>
                      <span className="text-xs font-bold text-iw-navy">
                        {completedIds.size}/{lessonList.length} · {enrollment.progress_percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-iw-border overflow-hidden">
                      <div className="h-full bg-iw-blue rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress_percent}%` }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {!isEnrolled && (
              <form action={enrollAction} className="mt-4">
                <input type="hidden" name="courseId"   value={course.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-iw-navy text-white text-sm font-semibold hover:bg-iw-sky hover:text-gray-900 transition-colors">
                  Matricular-se nesta disciplina
                </button>
              </form>
            )}
          </div>

          {/* Simulados e prova — linha 2, coluna 2 */}
          {podeAvaliar && (
            <div className="xl:col-start-2 xl:row-start-2 bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5 flex flex-col justify-center gap-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Simulado */}
                {simuladosEsgotados ? (
                  <Link
                    href={`/portal/avaliacoes?voltar=${encodeURIComponent(returnPath)}`}
                    className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2 text-center hover:bg-iw-blue/5 hover:border-iw-blue/30 transition-colors"
                  >
                    <div>
                      <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Simulado</p>
                      <p className="text-[9.5px] font-bold text-iw-muted mt-0.5">{simuladosFeitos}/{LIMITE_SIMULADOS}</p>
                    </div>
                    <p className="text-[10.5px] text-iw-muted italic">Você já usou os {LIMITE_SIMULADOS} simulados.</p>
                  </Link>
                ) : (
                  <div className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2 text-center">
                    <div>
                      <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Simulado</p>
                      <p className="text-[9.5px] font-bold text-iw-muted mt-0.5">{simuladosFeitos}/{LIMITE_SIMULADOS}</p>
                    </div>
                    {matriculaEmAndamento && (
                      <form action={iniciarAvaliacaoAction}>
                        <input type="hidden" name="matricula_id" value={matricula!.id} />
                        <input type="hidden" name="tipo" value="SIMULADO" />
                        <input type="hidden" name="num_questoes" value="10" />
                        <button type="submit" className="w-full bg-iw-blue hover:opacity-90 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-opacity">
                          Fazer simulado
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Prova */}
                {provaExistente ? (
                  <Link
                    href={`/portal/avaliacoes/${provaExistente.id}?voltar=${encodeURIComponent(returnPath)}`}
                    className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2 text-center hover:bg-iw-blue/5 hover:border-iw-blue/30 transition-colors"
                  >
                    <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Prova</p>
                    <p className="text-[11px] font-bold text-iw-navy">
                      Ver resultado ({provaExistente.status === "FINALIZADA" ? `nota ${Number(provaExistente.nota).toFixed(1)}` : "em andamento"})
                    </p>
                  </Link>
                ) : (
                  <div className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2 text-center">
                    <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Prova</p>
                    {!matriculaEmAndamento ? (
                      <p className="text-[10.5px] text-iw-muted italic">Matrícula não está mais em andamento.</p>
                    ) : !provaLiberada ? (
                      <p className="text-[10.5px] text-iw-muted italic flex items-start justify-center gap-1">
                        <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                        Libera com 100% das aulas.
                      </p>
                    ) : (
                      <form action={iniciarAvaliacaoAction} className="space-y-1.5 text-left">
                        <input type="hidden" name="matricula_id" value={matricula!.id} />
                        <input type="hidden" name="tipo" value="PROVA" />
                        <label className="flex items-start gap-1.5 text-[10px] text-iw-muted leading-snug">
                          <input type="checkbox" name="confirmo_prova" className="mt-0.5" required />
                          <span className="inline-flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-iw-warning shrink-0 mt-0.5" />
                            Só terei esta tentativa.
                          </span>
                        </label>
                        <button type="submit" className="w-full bg-iw-gold hover:opacity-90 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-opacity">
                          Iniciar prova
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              <Link href={`/portal/avaliacoes?voltar=${encodeURIComponent(returnPath)}`} className="block text-center text-xs text-iw-navy font-bold uppercase hover:underline">
                Ver histórico completo
              </Link>
            </div>
          )}
      </div>
    </div>
  );
}
