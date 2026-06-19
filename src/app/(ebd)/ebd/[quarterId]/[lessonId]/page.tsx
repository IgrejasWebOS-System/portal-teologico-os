import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, BookOpen, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { markLessonReadAction } from "@/app/ebd-actions";
import type { EbdQuarter, EbdLesson, EbdTopic, EbdDailyReading, EbdReviewQuestion, VideoType } from "@/types";
import EbdVideoPlayer from "./EbdVideoPlayer";

interface Props {
  params: Promise<{ quarterId: string; lessonId: string }>;
}

const DAY_ABBREV: Record<string, string> = {
  Segunda: "Seg",
  Terça:   "Ter",
  Quarta:  "Qua",
  Quinta:  "Qui",
  Sexta:   "Sex",
  Sábado:  "Sáb",
};

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ebd_lessons")
    .select("lesson_number, title")
    .eq("id", lessonId)
    .single();
  if (!data) return { title: "EBD" };
  return { title: `Lição ${data.lesson_number}: ${data.title}` };
}

export default async function EbdLessonPage({ params }: Props) {
  const { quarterId, lessonId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Trimestre (para breadcrumb e cores)
  const { data: quarterData } = await supabase
    .from("ebd_quarters")
    .select("*")
    .eq("id", quarterId)
    .single();

  if (!quarterData) notFound();
  const quarter = quarterData as EbdQuarter;

  // Lição completa
  const { data: lessonData } = await supabase
    .from("ebd_lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("quarter_id", quarterId)
    .single();

  if (!lessonData) notFound();
  const lesson = lessonData as EbdLesson;

  // Progresso do usuário nesta lição
  const { data: progress } = await supabase
    .from("ebd_lesson_progress")
    .select("id, read_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const isRead = !!progress;
  const isAdultos = quarter.audience === "ADULTOS";
  const accentColor = isAdultos ? "text-iw-blue" : "text-iw-gold";
  const accentBg    = isAdultos ? "bg-iw-blue/10" : "bg-iw-gold/10";
  const accentBorder = isAdultos ? "border-iw-blue/20" : "border-iw-gold/20";
  const progressBar  = isAdultos ? "bg-iw-blue" : "bg-iw-gold";

  const topics          = (lesson.topics          ?? []) as EbdTopic[];
  const dailyReadings   = (lesson.daily_readings  ?? []) as EbdDailyReading[];
  const reviewQuestions = (lesson.review_questions ?? []) as EbdReviewQuestion[];

  const returnPath = `/ebd/${quarterId}/${lessonId}`;

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breadcrumb */}
      <Link
        href={`/ebd/${quarterId}`}
        className="inline-flex items-center gap-1.5 text-sm text-iw-muted hover:text-iw-navy transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {quarter.audience === "ADULTOS" ? "Adultos" : "Jovens"} ·{" "}
        {["1°","2°","3°","4°"][quarter.quarter - 1]} Trimestre {quarter.year}
      </Link>

      {/* ── VÍDEO DA LIÇÃO (se houver) ── */}
      {lesson.video_url && lesson.video_type && lesson.video_type !== "none" && (
        <EbdVideoPlayer
          videoType={lesson.video_type as VideoType}
          videoUrl={lesson.video_url}
        />
      )}

      {/* ── CABEÇALHO DA LIÇÃO ── */}
      <div className={`bg-iw-surface rounded-2xl border ${accentBorder} shadow-sm p-6`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${accentBg} flex items-center justify-center shrink-0`}>
            <BookOpen className={`w-6 h-6 ${accentColor}`} />
          </div>
          <div className="flex items-center gap-2">
            {isRead && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-iw-success/10 text-iw-success">
                <CheckCircle2 className="w-3 h-3" />
                Lida
              </span>
            )}
            {lesson.source_url && (
              <a
                href={lesson.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-iw-muted hover:text-iw-navy transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Original
              </a>
            )}
          </div>
        </div>

        <p className={`text-xs font-bold uppercase tracking-widest ${accentColor} mb-1`}>
          Lição {String(lesson.lesson_number).padStart(2, "0")}
        </p>
        <h1 className="text-2xl font-black text-iw-navy leading-tight">{lesson.title}</h1>

        {/* Marcar como lida */}
        {!isRead && (
          <form action={markLessonReadAction} className="mt-4">
            <input type="hidden" name="lessonId"   value={lessonId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
                isAdultos
                  ? "bg-iw-blue hover:bg-iw-navy"
                  : "bg-iw-gold hover:bg-iw-gold-alt"
              }`}
            >
              Marcar como lida
            </button>
          </form>
        )}
      </div>

      {/* ── TEXTO ÁUREO ── */}
      {lesson.aureo_text && (
        <div className={`rounded-2xl border ${accentBorder} ${accentBg} p-5`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${accentColor} mb-2`}>
            Texto Áureo
          </p>
          <blockquote className="text-iw-navy text-sm font-medium leading-relaxed italic">
            &ldquo;{lesson.aureo_text}&rdquo;
          </blockquote>
          {lesson.aureo_reference && (
            <p className={`text-xs font-semibold mt-2 ${accentColor}`}>
              {lesson.aureo_reference}
            </p>
          )}
        </div>
      )}

      {/* ── VERDADE PRÁTICA ── */}
      {lesson.practical_truth && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-iw-muted mb-2">
            Verdade Prática
          </p>
          <p className="text-sm text-iw-navy leading-relaxed">{lesson.practical_truth}</p>
        </div>
      )}

      {/* ── LEITURA DIÁRIA ── */}
      {dailyReadings.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-iw-border">
            <p className="text-xs font-bold uppercase tracking-widest text-iw-muted">
              Leitura Diária
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-iw-border">
            {dailyReadings.map((reading) => (
              <div key={reading.day} className="p-4">
                <p className={`text-xs font-bold mb-1 ${accentColor}`}>
                  {DAY_ABBREV[reading.day] ?? reading.day}
                </p>
                <p className="text-xs font-semibold text-iw-navy">{reading.reference}</p>
                <p className="text-xs text-iw-muted mt-0.5 leading-tight">
                  {reading.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LEITURA BÍBLICA EM CLASSE ── */}
      {lesson.class_reading_text && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-iw-muted mb-1">
            Leitura Bíblica em Classe
          </p>
          {lesson.class_reading_ref && (
            <p className={`text-xs font-semibold ${accentColor} mb-3`}>
              {lesson.class_reading_ref}
            </p>
          )}
          <p className="text-sm text-iw-navy leading-relaxed whitespace-pre-wrap">
            {lesson.class_reading_text}
          </p>
        </div>
      )}

      {/* ── INTRODUÇÃO ── */}
      {lesson.introduction && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-iw-muted mb-3">
            Introdução
          </p>
          <p className="text-sm text-iw-navy leading-relaxed">{lesson.introduction}</p>
        </div>
      )}

      {/* ── TÓPICOS (I, II, III) ── */}
      {topics.map((topic) => (
        <div
          key={topic.number}
          className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden"
        >
          {/* Título do tópico */}
          <div className={`px-6 py-4 border-b border-iw-border ${accentBg}`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${accentColor} mb-0.5`}>
              {["I","II","III","IV","V"][topic.number - 1]}
            </p>
            <h2 className="font-black text-iw-navy text-base leading-tight">
              {topic.title}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Subtópicos */}
            {topic.subtopics?.map((sub) => (
              <div key={sub.number}>
                <p className="text-sm font-bold text-iw-navy mb-1">
                  {sub.number}. {sub.title}
                </p>
                <p className="text-sm text-iw-muted leading-relaxed">{sub.content}</p>
              </div>
            ))}

            {/* Sinopse */}
            {topic.synopsis && (
              <div className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 mt-4`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${accentColor} mb-1`}>
                  Sinopse
                </p>
                <p className="text-sm text-iw-navy font-medium">{topic.synopsis}</p>
              </div>
            )}

            {/* Auxílio Bibliológico */}
            {topic.bibliological_aid && (
              <div className="rounded-xl bg-iw-bg border border-iw-border px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-iw-muted mb-1">
                  Auxílio Bibliológico
                </p>
                <p className="text-xs text-iw-muted leading-relaxed">{topic.bibliological_aid}</p>
              </div>
            )}

            {/* Ampliando o Conhecimento */}
            {topic.knowledge_expansion && (
              <div className="rounded-xl bg-iw-bg border border-iw-border px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-iw-muted mb-1">
                  Ampliando o Conhecimento
                </p>
                <p className="text-xs text-iw-muted leading-relaxed">{topic.knowledge_expansion}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── CONCLUSÃO ── */}
      {lesson.conclusion && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5">
          <p className={`text-xs font-bold uppercase tracking-widest ${accentColor} mb-3`}>
            Conclusão
          </p>
          <p className="text-sm text-iw-navy leading-relaxed">{lesson.conclusion}</p>
        </div>
      )}

      {/* ── REVISANDO O CONTEÚDO ── */}
      {reviewQuestions.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-iw-border">
            <p className="text-xs font-bold uppercase tracking-widest text-iw-muted">
              Revisando o Conteúdo
            </p>
          </div>
          <div className="divide-y divide-iw-border">
            {reviewQuestions.map((q) => (
              <div key={q.number} className="px-6 py-4">
                <p className="text-sm font-semibold text-iw-navy mb-1">
                  {q.number}. {q.question}
                </p>
                <p className="text-sm text-iw-muted leading-relaxed">{q.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MARCAR COMO LIDA (rodapé) ── */}
      {!isRead && (
        <div className="pb-4">
          <form action={markLessonReadAction}>
            <input type="hidden" name="lessonId"   value={lessonId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors ${
                isAdultos
                  ? "bg-iw-blue hover:bg-iw-navy"
                  : "bg-iw-gold hover:bg-iw-gold-alt"
              }`}
            >
              Concluí a leitura desta lição
            </button>
          </form>
        </div>
      )}

      {isRead && (
        <div className="pb-4 flex items-center justify-center gap-2 text-iw-success text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Lição lida em {new Date(progress!.read_at).toLocaleDateString("pt-BR")}
        </div>
      )}
    </div>
  );
}
