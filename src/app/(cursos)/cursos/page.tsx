import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Play, Clock, User, ChevronRight, Award } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Course } from "@/types";
import { checkIsStaff } from "@/utils/staff";

export const metadata = { title: "Cursos & Preparatórios" };

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

const LEVEL_COLOR: Record<string, string> = {
  iniciante:     "bg-iw-success/10 text-iw-success",
  intermediario: "bg-iw-gold/10 text-iw-gold",
  avancado:      "bg-red-50 text-red-600",
};

export default async function CursosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (await checkIsStaff(supabase, user.id)) redirect("/admin/conteudo?modulo=cursos");

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("module", "cursos")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: true });

  const trilhas = (courses ?? []) as Course[];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress_percent, status")
    .eq("user_id", user.id)
    .in("course_id", trilhas.map((t) => t.id));

  const enrollMap = new Map(
    (enrollments ?? []).map((e) => [e.course_id, e])
  );

  const { data: lessonCounts } = await supabase
    .from("lessons")
    .select("course_id, video_type")
    .in("course_id", trilhas.map((t) => t.id));

  const countMap = new Map<string, { total: number; video: number }>();
  for (const l of lessonCounts ?? []) {
    if (!countMap.has(l.course_id)) countMap.set(l.course_id, { total: 0, video: 0 });
    const c = countMap.get(l.course_id)!;
    c.total++;
    if (l.video_type !== "none") c.video++;
  }

  const featured = trilhas.find((t) => t.featured) ?? trilhas[0];

  const byLevel: Record<string, Course[]> = {};
  for (const t of trilhas) {
    const lvl = t.level ?? "iniciante";
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(t);
  }

  if (trilhas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <BookOpen className="w-14 h-14 text-iw-muted/30" />
        <p className="text-iw-navy font-bold text-lg">Nenhum curso publicado ainda.</p>
        <p className="text-iw-muted text-sm">
          Crie cursos no{" "}
          <Link href="/admin/conteudo/trilhas" className="text-iw-gold hover:underline">painel admin</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">

      {/* ── Hero banner ── */}
      {featured && (
        <div className="relative rounded-3xl overflow-hidden min-h-[280px] flex items-end shadow-xl"
          style={{ background: "linear-gradient(135deg, #c7a855 0%, #1a2a5e 100%)" }}>
          {featured.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.thumbnail_url} alt={featured.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10 p-8 space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Cursos & Preparatórios</span>
              {featured.featured && (
                <span className="text-xs font-semibold bg-iw-gold text-white px-2 py-0.5 rounded-full">Destaque</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white leading-tight max-w-lg">{featured.title}</h1>
            {featured.description && (
              <p className="text-white/70 text-sm max-w-md line-clamp-2">{featured.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-white/60 text-xs">
              {featured.instructor_name && (
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{featured.instructor_name}</span>
              )}
              {featured.duration_hours && (
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{featured.duration_hours}h</span>
              )}
              {countMap.get(featured.id)?.total != null && (
                <span>{countMap.get(featured.id)!.total} aulas</span>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link href={`/cursos/${featured.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-iw-gold text-white font-bold text-sm hover:bg-amber-500 transition-colors shadow">
                <Play className="w-4 h-4 fill-white" /> Ver curso
              </Link>
              {enrollMap.has(featured.id) && (
                <div className="flex items-center gap-2">
                  <div className="w-28 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${enrollMap.get(featured.id)!.progress_percent}%` }} />
                  </div>
                  <span className="text-white/60 text-xs">{enrollMap.get(featured.id)!.progress_percent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Continue watching ── */}
      {(() => {
        const inProgress = trilhas.filter((t) => {
          const e = enrollMap.get(t.id);
          return e && e.status === "ENROLLED" && e.progress_percent > 0 && e.progress_percent < 100;
        });
        if (inProgress.length === 0) return null;
        return (
          <Section title="Continue de onde parou">
            {inProgress.map((t) => (
              <CourseCard key={t.id} course={t} enrollment={enrollMap.get(t.id)} counts={countMap.get(t.id)} />
            ))}
          </Section>
        );
      })()}

      {/* ── By level ── */}
      {["iniciante", "intermediario", "avancado"].map((lvl) => {
        const items = byLevel[lvl];
        if (!items || items.length === 0) return null;
        return (
          <Section key={lvl} title={`Nível ${LEVEL_LABEL[lvl]}`}>
            {items.map((t) => (
              <CourseCard key={t.id} course={t} enrollment={enrollMap.get(t.id)} counts={countMap.get(t.id)} />
            ))}
          </Section>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-iw-navy flex items-center gap-2">
        {title}
        <ChevronRight className="w-4 h-4 text-iw-muted/40" />
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide snap-x">
        {children}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  enrollment,
  counts,
}: {
  course: Course;
  enrollment?: { progress_percent: number; status: string } | null;
  counts?: { total: number; video: number };
}) {
  const lvl = course.level ?? "iniciante";
  const hasVid = (counts?.video ?? 0) > 0;
  const isCompleted = enrollment?.status === "COMPLETED";

  return (
    <Link
      href={`/cursos/${course.id}`}
      className="group shrink-0 w-56 snap-start bg-iw-surface rounded-2xl border border-iw-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-32 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #c7a855 0%, #1a2a5e 80%)" }}>
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title}
            className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
            <Play className="w-5 h-5 text-iw-navy fill-iw-navy ml-0.5" />
          </div>
        </div>
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLOR[lvl]}`}>
          {LEVEL_LABEL[lvl]}
        </span>
        {isCompleted && (
          <span className="absolute top-2 right-2 bg-iw-success text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Award className="w-2.5 h-2.5" /> Concluído
          </span>
        )}
        {enrollment && !isCompleted && enrollment.progress_percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-iw-gold transition-all"
              style={{ width: `${enrollment.progress_percent}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-sm font-bold text-iw-navy leading-tight line-clamp-2 group-hover:text-iw-gold transition-colors">
          {course.title}
        </p>
        {course.instructor_name && (
          <p className="text-[11px] text-iw-muted flex items-center gap-1">
            <User className="w-3 h-3" /> {course.instructor_name}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 text-[10px] text-iw-muted">
          <span>{counts?.total ?? 0} aulas</span>
          {course.duration_hours && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{course.duration_hours}h</span>}
        </div>
      </div>
    </Link>
  );
}
