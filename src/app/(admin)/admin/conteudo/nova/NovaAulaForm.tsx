"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Video, Youtube, Bot, Loader2, Save, AlertTriangle, Play } from "lucide-react";
import { createLessonAction, updateLessonVideoAction } from "@/app/(admin)/admin/conteudo/actions";
import type { Course, Lesson, VideoType } from "@/types";

type Props = {
  courses: Pick<Course, "id" | "title" | "module">[];
  defaultCourseId?: string;
  existingLesson?: Partial<Lesson> | null;
};

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-iw-blue text-white text-sm font-semibold hover:bg-iw-navy disabled:opacity-50 transition-colors shadow-sm"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Salvando..." : label}
    </button>
  );
}

const FORMAT_OPTIONS: { type: VideoType; label: string; desc: string; Icon: React.ElementType; accent: string }[] = [
  { type: "youtube", label: "YouTube",        desc: "Cole a URL de um vídeo ou playlist", Icon: Youtube, accent: "border-red-400 bg-red-50" },
  { type: "direct",  label: "Vídeo real",     desc: "URL do arquivo no CDN (Cloudflare Stream, Bunny.net…)", Icon: Video, accent: "border-green-500 bg-green-50" },
  { type: "virtual", label: "Prof. Virtual",  desc: "Vídeo gerado por IA (futuro)", Icon: Bot, accent: "border-purple-400 bg-purple-50" },
  { type: "none",    label: "Só texto",       desc: "Conteúdo escrito, sem vídeo", Icon: Play, accent: "border-iw-border bg-iw-bg" },
];

const inputCls = "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none transition-colors";
const labelCls = "block text-xs font-semibold text-iw-muted uppercase tracking-wider mb-1.5";

// Extract YouTube video ID for preview
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export default function NovaAulaForm({ courses, defaultCourseId, existingLesson }: Props) {
  const isEdit = !!existingLesson;

  const [videoType, setVideoType] = useState<VideoType>(
    (existingLesson?.video_type as VideoType) ?? "none"
  );
  const [videoUrl, setVideoUrl] = useState(existingLesson?.video_url ?? "");
  const [serverError, setServerError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    if (videoType === "youtube") {
      setPreviewId(getYouTubeId(url));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      <div>
        <Link
          href="/admin/conteudo"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Biblioteca
        </Link>
        <h1 className="text-2xl font-black text-iw-navy tracking-tight">
          {isEdit ? "Editar aula" : "Inserir nova aula"}
        </h1>
        <p className="text-iw-muted text-sm mt-0.5">
          {isEdit ? `Editando: ${existingLesson?.title}` : "Preencha os dados e escolha o formato do vídeo."}
        </p>
      </div>

      {serverError && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{serverError}</span>
        </div>
      )}

      <form
        action={async (fd) => {
          setServerError("");
          fd.set("video_type", videoType);
          fd.set("video_url", videoUrl);
          const result = isEdit
            ? await updateLessonVideoAction(fd)
            : await createLessonAction(fd);
          if (result && result.success === false) {
            setServerError(result.message ?? "Erro desconhecido.");
          }
        }}
        className="space-y-6"
      >
        {isEdit && <input type="hidden" name="id" value={existingLesson?.id} />}

        {/* CARD 1 — Dados básicos */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">Dados da aula</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Título *</label>
              <input
                name="title"
                type="text"
                required
                defaultValue={existingLesson?.title}
                placeholder="Ex: Hermenêutica — Aula 1: Introdução"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Trilha / Curso *</label>
              <select
                name="course_id"
                required
                defaultValue={existingLesson?.course_id ?? defaultCourseId}
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.module === "escola" ? "Escola" : "Cursos"}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Ordem na trilha</label>
              <input
                name="order_index"
                type="number"
                min={1}
                defaultValue={existingLesson?.order_index ?? 1}
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Descrição</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={existingLesson?.description ?? ""}
                placeholder="Resumo do conteúdo desta aula..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className={labelCls}>Thumbnail URL</label>
              <input
                name="thumbnail_url"
                type="text"
                defaultValue={existingLesson?.thumbnail_url ?? ""}
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                name="is_free_preview"
                id="free_preview"
                value="true"
                defaultChecked={existingLesson?.is_free_preview}
                className="w-4 h-4 accent-iw-blue"
              />
              <label htmlFor="free_preview" className="text-sm text-iw-navy font-medium cursor-pointer">
                Preview gratuito (visível sem matrícula)
              </label>
            </div>
          </div>
        </div>

        {/* CARD 2 — Formato do vídeo */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">Formato do conteúdo</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FORMAT_OPTIONS.map(({ type, label, desc, Icon, accent }) => (
              <button
                key={type}
                type="button"
                onClick={() => { setVideoType(type); if (type !== "youtube") setPreviewId(null); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  videoType === type ? accent : "border-iw-border bg-white hover:border-iw-border hover:bg-iw-bg/50"
                }`}
              >
                <Icon className={`w-5 h-5 ${videoType === type ? "" : "text-iw-muted"}`} />
                <span className={`text-xs font-semibold ${videoType === type ? "" : "text-iw-muted"}`}>{label}</span>
                <span className="text-[10px] text-iw-muted leading-tight">{desc}</span>
              </button>
            ))}
          </div>

          {/* URL field — only for video types */}
          {videoType !== "none" && videoType !== "virtual" && (
            <div>
              <label className={labelCls}>
                {videoType === "youtube" ? "URL do YouTube" : "URL do vídeo (CDN)"}
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={
                  videoType === "youtube"
                    ? "https://www.youtube.com/watch?v=..."
                    : "https://customer-xxx.cloudflarestream.com/..."
                }
                className={inputCls}
              />
            </div>
          )}

          {videoType === "virtual" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
              <Bot className="inline w-4 h-4 mr-1.5" />
              O professor virtual será configurado em breve. Salve a aula agora e volte para adicionar o vídeo quando o pipeline de geração estiver pronto.
            </div>
          )}

          {/* Duração manual (para direct/virtual) */}
          {(videoType === "direct" || videoType === "virtual") && (
            <div>
              <label className={labelCls}>Duração (segundos)</label>
              <input
                name="video_duration_secs"
                type="number"
                min={0}
                defaultValue={existingLesson?.video_duration_secs ?? ""}
                placeholder="Ex: 1800 = 30 minutos"
                className={inputCls}
              />
            </div>
          )}

          {/* YouTube preview */}
          {videoType === "youtube" && previewId && (
            <div className="rounded-xl overflow-hidden aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${previewId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/conteudo"
            className="text-sm text-iw-muted hover:text-iw-navy font-medium transition-colors"
          >
            Cancelar
          </Link>
          <SubmitBtn label={isEdit ? "Salvar alterações" : "Criar aula"} />
        </div>
      </form>
    </div>
  );
}
