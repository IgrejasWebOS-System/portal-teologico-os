import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, Video, FileText } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import type { EbdQuarter, EbdLesson } from "@/types";
import { deleteLicaoFormAction, deleteTrimestreFormAction } from "../actions";

export const metadata = { title: "Trimestre — Admin EBD" };

const AUDIENCE_LABEL: Record<string, string> = {
  ADULTOS: "Adultos",
  JOVENS: "Jovens",
  ADOLESCENTES: "Adolescentes",
  JUNIORES: "Juniores",
  PRIMARIOS: "Primários",
};

interface PageProps {
  params: Promise<{ quarterId: string }>;
}

export default async function AdminEbdTrimestrePage({ params }: PageProps) {
  const { quarterId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: quarterData } = await supabase.from("ebd_quarters").select("*").eq("id", quarterId).single();
  if (!quarterData) notFound();
  const quarter = quarterData as EbdQuarter;

  const { data: lessonsRaw } = await supabase
    .from("ebd_lessons")
    .select("id, lesson_number, title, video_type, topics, review_questions")
    .eq("quarter_id", quarterId)
    .order("lesson_number");

  const lessons = (lessonsRaw ?? []) as Pick<EbdLesson, "id" | "lesson_number" | "title" | "video_type" | "topics" | "review_questions">[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/ebd"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para EBD
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              {["1°", "2°", "3°", "4°"][quarter.quarter - 1]} Trimestre {quarter.year} — {AUDIENCE_LABEL[quarter.audience] ?? quarter.audience}
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">
              {quarter.theme ?? "Sem tema definido"} · {quarter.publisher} · {lessons.length}/{quarter.lesson_count} lições
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/admin/ebd/${quarterId}/nova`}
              className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Nova lição
            </Link>
            <form action={deleteTrimestreFormAction.bind(null, quarterId)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 border border-iw-error/30 text-iw-error hover:bg-iw-error/8 font-bold text-xs px-3 py-2.5 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir trimestre
              </button>
            </form>
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhuma lição cadastrada neste trimestre ainda.</p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="divide-y divide-iw-border">
            {lessons.map((l) => {
              const topicCount = ((l.topics as unknown[]) ?? []).length;
              const questionCount = ((l.review_questions as unknown[]) ?? []).length;
              return (
                <div key={l.id} className="grid grid-cols-[40px_1fr_auto_auto_auto] gap-4 px-6 py-3.5 items-center hover:bg-iw-bg/40 transition-colors">
                  <span className="text-xs text-iw-muted font-mono text-right">
                    {String(l.lesson_number).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-iw-navy truncate">{l.title}</span>
                  <span className="text-xs text-iw-muted whitespace-nowrap">
                    {topicCount} tópicos · {questionCount} perguntas
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${
                      l.video_type && l.video_type !== "none" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {l.video_type && l.video_type !== "none" ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {l.video_type && l.video_type !== "none" ? "Com vídeo" : "Sem vídeo"}
                  </span>
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/admin/ebd/${quarterId}/nova?edit=${l.id}`}
                      className="flex items-center gap-1 text-xs text-iw-blue font-semibold hover:text-iw-navy transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </Link>
                    <form action={deleteLicaoFormAction.bind(null, l.id, quarterId)}>
                      <button
                        type="submit"
                        className="flex items-center gap-1 text-xs text-iw-error font-semibold hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
