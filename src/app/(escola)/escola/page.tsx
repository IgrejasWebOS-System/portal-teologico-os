import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { GraduationCap, Play, Clock, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Course } from "@/types";

export const metadata = { title: "Escola Teológica" };

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

export default async function EscolaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Aluno com matrícula oficial (ead_alunos/ead_matriculas) vê só os
  // próprios cursos matriculados — não o catálogo completo. Staff e
  // membros sem ficha de aluno continuam vendo o catálogo normal.
  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (aluno) {
    const { data: matriculas } = await supabase
      .from("ead_matriculas")
      .select("id, course_id, curso_nome_snapshot, status, data_matricula")
      .eq("aluno_id", aluno.id)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .not("course_id", "is", null);

    const courseIds = (matriculas ?? []).map((m) => m.course_id).filter((id): id is string => !!id);

    if (courseIds.length > 0) {
      const { data: meusCourses } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);

      const { data: minhasEnrollments } = await supabase
        .from("enrollments")
        .select("course_id, progress_percent, status")
        .eq("user_id", user.id)
        .in("course_id", courseIds);

      const { data: minhasLessons } = await supabase
        .from("lessons")
        .select("course_id, video_type")
        .in("course_id", courseIds);

      const enrollMapAluno = new Map((minhasEnrollments ?? []).map((e) => [e.course_id, e]));
      const countMapAluno = new Map<string, { total: number; video: number }>();
      for (const l of minhasLessons ?? []) {
        if (!countMapAluno.has(l.course_id)) countMapAluno.set(l.course_id, { total: 0, video: 0 });
        const c = countMapAluno.get(l.course_id)!;
        c.total++;
        if (l.video_type !== "none") c.video++;
      }

      const meusCoursesList = (meusCourses ?? []) as Course[];

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
          <div>
            <h1 className="text-2xl font-black text-iw-navy tracking-tight">Meus Cursos</h1>
            <p className="text-iw-muted text-sm mt-1">Disciplinas em que você está matriculado no CETADP.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {meusCoursesList.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                enrollment={enrollMapAluno.get(c.id)}
                counts={countMapAluno.get(c.id)}
              />
            ))}
          </div>
        </div>
      );
    }
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("module", "escola")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: true });

  const disciplinas = (courses ?? []) as Course[];

  // Enrollment status for each course
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress_percent, status")
    .eq("user_id", user.id)
    .in("course_id", disciplinas.map((d) => d.id));

  const enrollMap = new Map(
    (enrollments ?? []).map((e) => [e.course_id, e])
  );

  // Count lessons with video per course
  const { data: lessonCounts } = await supabase
    .from("lessons")
    .select("course_id, video_type")
    .in("course_id", disciplinas.map((d) => d.id));

  const countMap = new Map<string, { total: number; video: number }>();
  for (const l of lessonCounts ?? []) {
    if (!countMap.has(l.course_id)) countMap.set(l.course_id, { total: 0, video: 0 });
    const c = countMap.get(l.course_id)!;
    c.total++;
    if (l.video_type !== "none") c.video++;
  }

  // Featured = first course with featured flag or fallback to first
  const featured = disciplinas.find((d) => d.featured) ?? disciplinas[0];

  // Group by level
  const byLevel: Record<string, Course[]> = {};
  for (const d of disciplinas) {
    const lvl = d.level ?? "iniciante";
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(d);
  }

  if (disciplinas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <GraduationCap className="w-14 h-14 text-iw-muted/30" />
        <p className="text-iw-navy font-bold text-lg">Nenhuma disciplina publicada ainda.</p>
        <p className="text-iw-muted text-sm">
          Crie trilhas no{" "}
          <Link href="/admin/conteudo/trilhas" className="text-iw-blue hover:underline">painel admin</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">

      {/* ── Hero banner ── */}
      {featured && (
        <div className="relative rounded-3xl overflow-hidden min-h-[280px] flex items-end bg-iw-navy shadow-xl">
          {featured.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.thumbnail_url}
              alt={featured.title}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-iw-navy via-iw-blue/80 to-iw-sky/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-iw-navy via-iw-navy/60 to-transparent" />
          <div className="relative z-10 p-8 space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-iw-sky uppercase tracking-widest">Escola Teológica</span>
              {featured.featured && (
                <span className="text-xs font-semibold bg-iw-gold text-white px-2 py-0.5 rounded-full">Destaque</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white leading-tight max-w-lg">{featured.title}</h1>
            {featured.description && (
              <p className="text-white/70 text-sm leading-relaxed max-w-md line-clamp-2">{featured.description}</p>
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
              <Link
                href={`/escola/${featured.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-iw-navy font-bold text-sm hover:bg-white/90 transition-colors shadow"
              >
                <Play className="w-4 h-4 fill-iw-navy" /> Assistir
              </Link>
              {enrollMap.has(featured.id) && (
                <div className="flex items-center gap-2">
                  <div className="w-28 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-iw-gold rounded-full transition-all"
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
        const inProgress = disciplinas.filter((d) => {
          const e = enrollMap.get(d.id);
          return e && e.status === "ENROLLED" && e.progress_percent > 0 && e.progress_percent < 100;
        });
        if (inProgress.length === 0) return null;
        return (
          <Section title="Continue assistindo">
            {inProgress.map((d) => (
              <CourseCard key={d.id} course={d} enrollment={enrollMap.get(d.id)} counts={countMap.get(d.id)} />
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
            {items.map((d) => (
              <CourseCard key={d.id} course={d} enrollment={enrollMap.get(d.id)} counts={countMap.get(d.id)} />
            ))}
          </Section>
        );
      })}

      {/* ── All courses fallback if no levels ── */}
      {Object.keys(byLevel).length === 0 && (
        <Section title="Todas as disciplinas">
          {disciplinas.map((d) => (
            <CourseCard key={d.id} course={d} enrollment={enrollMap.get(d.id)} counts={countMap.get(d.id)} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Section carousel ────────────────────────────────────────────────────────
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

// ── Course card ─────────────────────────────────────────────────────────────
function CourseCard({
  course,
  enrollment,
  counts,
}: {
  course: Course;
  enrollment?: { progress_percent: number; status: string } | null;
  counts?: { total: number; video: number };
}) {
  const lvl   = course.level ?? "iniciante";
  const hasVid = (counts?.video ?? 0) > 0;

  return (
    <Link
      href={`/escola/${course.id}`}
      className="group shrink-0 w-56 snap-start bg-iw-surface rounded-2xl border border-iw-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gradient-to-br from-iw-navy/80 to-iw-blue/60 overflow-hidden">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
            <Play className="w-5 h-5 text-iw-navy fill-iw-navy ml-0.5" />
          </div>
        </div>
        {/* Level badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLOR[lvl]}`}>
          {LEVEL_LABEL[lvl]}
        </span>
        {/* Video indicator */}
        {hasVid && (
          <span className="absolute top-2 right-2 bg-black/50 text-white/80 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-white" /> Vídeo
          </span>
        )}
        {/* Progress bar */}
        {enrollment && enrollment.progress_percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-iw-gold transition-all"
              style={{ width: `${enrollment.progress_percent}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-sm font-bold text-iw-navy leading-tight line-clamp-2 group-hover:text-iw-blue transition-colors">
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
