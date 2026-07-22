import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Video, Youtube, Bot, FileText, Pencil } from "lucide-react";
import type { Course, Lesson, VideoType } from "@/types";
import { toggleCourseStatusAction } from "./actions";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Admin — Conteúdo" };

const MODULO_LABEL: Record<string, string> = {
  escola: "Escola de Teologia",
  cursos: "Cursos & Preparatórios",
};

const VIDEO_BADGE: Record<VideoType, { label: string; cls: string; Icon: React.ElementType }> = {
  none:     { label: "Sem vídeo",     cls: "bg-gray-100 text-gray-500",   Icon: FileText  },
  youtube:  { label: "YouTube",       cls: "bg-red-50 text-red-600",      Icon: Youtube   },
  direct:   { label: "Vídeo real",    cls: "bg-green-50 text-green-700",  Icon: Video     },
  virtual:  { label: "Prof. Virtual", cls: "bg-purple-50 text-purple-700",Icon: Bot       },
};

function fmtDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface PageProps {
  searchParams: Promise<{ modulo?: string }>;
}

export default async function AdminConteudoPage({ searchParams }: PageProps) {
  const { modulo } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  let query = supabase.from("courses").select("*").order("module").order("created_at");
  if (modulo === "escola" || modulo === "cursos") {
    query = query.eq("module", modulo);
  }
  const { data: courses } = await query;

  const courseList = (courses ?? []) as Course[];
  const moduloLabel = modulo ? MODULO_LABEL[modulo] : null;

  const { data: lessonsRaw } = await supabase
    .from("lessons")
    .select("id, course_id, title, video_type, video_duration_secs, order_index")
    .order("course_id")
    .order("order_index");

  const lessonsAll = (lessonsRaw ?? []) as Pick<Lesson, "id" | "course_id" | "title" | "video_type" | "video_duration_secs" | "order_index">[];

  // Agrupar aulas por course_id
  const lessonsByCourse = new Map<string, typeof lessonsAll>();
  for (const l of lessonsAll) {
    if (!lessonsByCourse.has(l.course_id)) lessonsByCourse.set(l.course_id, []);
    lessonsByCourse.get(l.course_id)!.push(l);
  }

  // Estatísticas do cabeçalho já respeitam o filtro de módulo, se houver.
  const courseIds = new Set(courseList.map((c) => c.id));
  const lessons = lessonsAll.filter((l) => courseIds.has(l.course_id));
  const totalWithVideo = lessons.filter((l) => l.video_type !== "none").length;

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            {moduloLabel ? `Gestão — ${moduloLabel}` : "Gestão de Conteúdo"}
          </h1>
          <p className="text-iw-muted text-sm">
            {lessons.length} aulas · {totalWithVideo} com vídeo · {courseList.length} trilhas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={modulo ? `/admin/conteudo/trilhas?modulo=${modulo}` : "/admin/conteudo/trilhas"}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-iw-border text-iw-muted hover:text-iw-navy hover:border-iw-navy/30 transition-colors"
          >
            Gerenciar trilhas
          </Link>
          <Link
            href={modulo ? `/admin/conteudo/nova?modulo=${modulo}` : "/admin/conteudo/nova"}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-iw-blue text-white hover:bg-iw-navy transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Inserir aula
          </Link>
        </div>
      </div>

      {/* Por curso */}
      {courseList.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-border p-12 text-center text-iw-muted text-sm">
          Nenhum curso cadastrado ainda.{" "}
          <Link href="/admin/conteudo/trilhas" className="text-iw-blue font-semibold hover:underline">
            Criar trilha
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {courseList.map((course) => {
            const courseLessons = lessonsByCourse.get(course.id) ?? [];
            const withVideo = courseLessons.filter((l) => l.video_type !== "none").length;

            return (
              <div key={course.id} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">

                {/* Course header */}
                <div className="px-6 py-4 border-b border-iw-border flex items-center justify-between gap-4 bg-iw-bg/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                      course.module === "escola"
                        ? "bg-iw-blue/10 text-iw-blue"
                        : "bg-iw-gold/10 text-iw-gold"
                    }`}>
                      {course.module === "escola" ? "Escola" : "Cursos"}
                    </span>
                    <h2 className="font-bold text-iw-navy truncate">{course.title}</h2>
                    {course.instructor_name && (
                      <span className="text-xs text-iw-muted truncate">{course.instructor_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-iw-muted">
                      {courseLessons.length} aulas · {withVideo} com vídeo
                    </span>
                    <form action={toggleCourseStatusAction}>
                      <input type="hidden" name="id" value={course.id} />
                      <input type="hidden" name="status"
                        value={course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                      <button
                        type="submit"
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          course.status === "PUBLISHED"
                            ? "bg-iw-success/10 text-iw-success hover:bg-iw-success/20"
                            : "bg-iw-warning/10 text-iw-warning hover:bg-iw-warning/20"
                        }`}
                      >
                        {course.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Lessons list */}
                {courseLessons.length === 0 ? (
                  <div className="px-6 py-6 text-center text-iw-muted text-sm">
                    Nenhuma aula nesta trilha.{" "}
                    <Link
                      href={`/admin/conteudo/nova?course_id=${course.id}`}
                      className="text-iw-blue font-semibold hover:underline"
                    >
                      Inserir primeira aula
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-iw-border">
                    {courseLessons.map((lesson) => {
                      const badge = VIDEO_BADGE[lesson.video_type as VideoType] ?? VIDEO_BADGE.none;
                      const BadgeIcon = badge.Icon;
                      return (
                        <div key={lesson.id} className="grid grid-cols-[32px_1fr_130px_80px_80px] gap-4 px-6 py-3 items-center hover:bg-iw-bg/40 transition-colors">
                          <span className="text-xs text-iw-muted font-mono text-right">
                            {String(lesson.order_index).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-medium text-iw-navy truncate">
                            {lesson.title}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${badge.cls}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                          <span className="text-xs text-iw-muted font-mono">
                            {fmtDuration(lesson.video_duration_secs)}
                          </span>
                          <Link
                            href={`/admin/conteudo/nova?edit=${lesson.id}`}
                            className="flex items-center gap-1 text-xs text-iw-blue font-semibold hover:text-iw-navy transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Editar
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add lesson CTA */}
                <div className="px-6 py-3 border-t border-iw-border bg-iw-bg/20">
                  <Link
                    href={`/admin/conteudo/nova?course_id=${course.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar aula nesta trilha
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
