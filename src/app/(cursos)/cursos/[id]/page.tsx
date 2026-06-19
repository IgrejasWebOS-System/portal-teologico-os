import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { enrollAction, completeLessonAction } from "@/app/course-actions";
import Link from "next/link";
import {
  BookOpen,
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
} from "lucide-react";
import type { ElementType } from "react";
import type { Lesson, VideoType } from "@/types";
import CursosLessonPlayer from "./CursosLessonPlayer";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aula?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("title").eq("id", id).single();
  return { title: data?.title ?? "Curso" };
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

export default async function CursosDetailPage({ params, searchParams }: Props) {
  const { id }           = await params;
  const { aula: aulaId } = await searchParams;
  const supabase         = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("module", "cursos")
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
  const returnPath  = `/cursos/${id}`;

  const activeLesson = aulaId
    ? lessonList.find((l) => l.id === aulaId)
    : lessonList[0];

  const hasVideo = activeLesson?.video_type && activeLesson.video_type !== "none" && activeLesson.video_url;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/cursos" className="inline-flex items-center gap-1.5 text-sm text-iw-muted hover:text-iw-navy transition-colors">
        <ChevronLeft className="w-4 h-4" /> Cursos & Treinamentos
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── Left: player + info ── */}
        <div className="space-y-5">

          {activeLesson && (isEnrolled || activeLesson.is_free_preview) ? (
            <CursosLessonPlayer
              lesson={activeLesson}
              courseId={course.id}
              returnPath={returnPath}
            />
          ) : activeLesson && !isEnrolled ? (
            <div className="aspect-video rounded-2xl bg-iw-navy/5 border border-iw-border flex flex-col items-center justify-center gap-3 text-iw-muted">
              <Lock className="w-8 h-8 opacity-30" />
              <p className="text-sm font-medium">Inscreva-se para assistir</p>
            </div>
          ) : null}

          {/* Course info */}
          <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-iw-gold" />
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
                : isEnrolled ? "bg-iw-gold/10 text-iw-gold"
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
            </div>

            {isEnrolled && (
              <div className="mt-4 pt-4 border-t border-iw-border">
                {isCompleted ? (
                  <div className="flex items-center gap-3 text-iw-success">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm font-semibold">Curso concluído! Parabéns.</span>
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
                      <div className="h-full bg-iw-gold rounded-full transition-all duration-500"
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
                  className="w-full py-3 rounded-xl bg-iw-gold text-white text-sm font-semibold hover:bg-amber-500 transition-colors">
                  Inscrever-se neste curso
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Right: playlist ── */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-iw-border">
            <h2 className="font-bold text-iw-navy text-sm">Aulas do curso</h2>
          </div>
          <div className="divide-y divide-iw-border max-h-[500px] overflow-y-auto">
            {lessonList.length === 0 ? (
              <div className="px-4 py-8 text-center text-iw-muted text-sm">Nenhuma aula ainda.</div>
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
                    href={`/cursos/${id}?aula=${lesson.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive
                        ? "bg-iw-gold/8 border-l-2 border-iw-gold"
                        : "hover:bg-iw-bg/50 border-l-2 border-transparent"
                    }`}
                  >
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
                        isActive ? "text-iw-gold"
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
                      <VIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-iw-gold" : "text-iw-muted/40"}`} />
                    )}
                  </Link>
                );
              })
            )}
          </div>

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
      </div>
    </div>
  );
}
