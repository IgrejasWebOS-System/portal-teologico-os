import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, BookOpen, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import type { EbdQuarter, EbdLesson } from "@/types";

interface Props {
  params: Promise<{ quarterId: string }>;
}

const quarterLabel = (q: number) =>
  ["1°", "2°", "3°", "4°"][q - 1] + " Trimestre";

const AUDIENCE_COLOR: Record<string, { text: string; bg: string; badge: string }> = {
  ADULTOS: { text: "text-iw-blue",  bg: "bg-iw-blue/10",  badge: "bg-iw-blue/10 text-iw-blue"  },
  JOVENS:  { text: "text-iw-gold",  bg: "bg-iw-gold/10",  badge: "bg-iw-gold/10 text-iw-gold"  },
};

export async function generateMetadata({ params }: Props) {
  const { quarterId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ebd_quarters")
    .select("year, quarter, audience")
    .eq("id", quarterId)
    .single();
  if (!data) return { title: "EBD" };
  return {
    title: `EBD ${data.audience} — ${quarterLabel(data.quarter)} ${data.year}`,
  };
}

export default async function EbdQuarterPage({ params }: Props) {
  const { quarterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Trimestre
  const { data: quarter } = await supabase
    .from("ebd_quarters")
    .select("*")
    .eq("id", quarterId)
    .single();

  if (!quarter) notFound();
  const q = quarter as EbdQuarter;

  // Lições do trimestre, ordenadas
  const { data: lessonsData } = await supabase
    .from("ebd_lessons")
    .select("id, lesson_number, title, aureo_reference, practical_truth")
    .eq("quarter_id", quarterId)
    .order("lesson_number");

  const lessons = (lessonsData ?? []) as Pick<
    EbdLesson,
    "id" | "lesson_number" | "title" | "aureo_reference" | "practical_truth"
  >[];

  // Lições lidas pelo usuário neste trimestre
  const { data: progressData } = await supabase
    .from("ebd_lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .in("lesson_id", lessons.map((l) => l.id));

  const readSet = new Set((progressData ?? []).map((p) => p.lesson_id));

  const colors = AUDIENCE_COLOR[q.audience] ?? AUDIENCE_COLOR["ADULTOS"];
  const totalRead = readSet.size;
  const pct = lessons.length > 0 ? Math.round((totalRead / lessons.length) * 100) : 0;

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumb */}
      <Link
        href="/ebd"
        className="inline-flex items-center gap-1.5 text-sm text-iw-muted hover:text-iw-navy transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Escola Bíblica Dominical
      </Link>

      {/* Header do trimestre */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
            <BookOpen className={`w-6 h-6 ${colors.text}`} />
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
            {q.audience} · {q.publisher}
          </span>
        </div>

        <h1 className="text-xl font-black text-iw-navy">
          {quarterLabel(q.quarter)} de {q.year}
        </h1>
        {q.theme && (
          <p className="text-sm text-iw-muted mt-1 leading-relaxed">
            {q.theme}
          </p>
        )}

        {/* Progresso */}
        <div className="mt-5 pt-5 border-t border-iw-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-iw-muted">Seu progresso</span>
            <span className="text-xs font-bold text-iw-navy">
              {totalRead}/{lessons.length} lições · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-iw-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                q.audience === "JOVENS" ? "bg-iw-gold" : "bg-iw-blue"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de lições */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-iw-border">
          <h2 className="font-bold text-iw-navy">Lições</h2>
          <p className="text-xs text-iw-muted mt-0.5">
            {lessons.length} lições neste trimestre
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="px-6 py-12 text-center text-iw-muted text-sm">
            Nenhuma lição importada ainda.
          </div>
        ) : (
          <div className="divide-y divide-iw-border">
            {lessons.map((lesson) => {
              const isRead = readSet.has(lesson.id);
              return (
                <Link
                  key={lesson.id}
                  href={`/ebd/${quarterId}/${lesson.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-iw-bg/50 transition-colors group"
                >
                  {/* Status */}
                  <div className="shrink-0 w-5">
                    {isRead ? (
                      <CheckCircle2 className="w-5 h-5 text-iw-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-iw-border group-hover:text-iw-muted/50 transition-colors" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${isRead ? "text-iw-muted line-through" : "text-iw-navy"} group-hover:${colors.text} transition-colors`}>
                      <span className="text-iw-muted/50 font-normal mr-2">
                        Lição {String(lesson.lesson_number).padStart(2, "0")}
                      </span>
                      {lesson.title}
                    </p>
                    {lesson.aureo_reference && (
                      <p className="text-xs text-iw-muted/60 mt-0.5 truncate">
                        {lesson.aureo_reference}
                      </p>
                    )}
                  </div>

                  <ChevronLeft className="w-4 h-4 text-iw-muted/30 group-hover:text-iw-muted rotate-180 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
