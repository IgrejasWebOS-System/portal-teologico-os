"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, BookOpen, Plus, X, Loader2 } from "lucide-react";
import { salvarLicaoAction, type DailyReadingInput, type TopicInput, type ReviewQuestionInput } from "../../actions";
import type { EbdQuarter, EbdLesson } from "@/types";

const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0 resize-none";

function Field({
  label, span, children,
}: { label: string; span?: string; children: React.ReactNode }) {
  return (
    <div className={`${boxCls} ${span ?? "col-span-12 md:col-span-6"}`}>
      <label className={boxLabelCls}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider pb-2 border-b border-iw-border">{label}</h2>;
}

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export default function LicaoForm({
  quarter, lesson, proximoNumero,
}: { quarter: EbdQuarter; lesson: EbdLesson | null; proximoNumero: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [lessonNumber, setLessonNumber] = useState(lesson?.lesson_number ?? proximoNumero);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [aureoText, setAureoText] = useState(lesson?.aureo_text ?? "");
  const [aureoReference, setAureoReference] = useState(lesson?.aureo_reference ?? "");
  const [practicalTruth, setPracticalTruth] = useState(lesson?.practical_truth ?? "");
  const [suggestedHymns, setSuggestedHymns] = useState(lesson?.suggested_hymns ?? "");
  const [classReadingRef, setClassReadingRef] = useState(lesson?.class_reading_ref ?? "");
  const [classReadingText, setClassReadingText] = useState(lesson?.class_reading_text ?? "");
  const [lessonPlan, setLessonPlan] = useState(lesson?.lesson_plan ?? "");
  const [introduction, setIntroduction] = useState(lesson?.introduction ?? "");
  const [conclusion, setConclusion] = useState(lesson?.conclusion ?? "");
  const [sourceUrl, setSourceUrl] = useState(lesson?.source_url ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [videoType, setVideoType] = useState<string>(lesson?.video_type ?? "none");

  const [dailyReadings, setDailyReadings] = useState<DailyReadingInput[]>(() =>
    DIAS.map((day) => {
      const existente = lesson?.daily_readings?.find((d) => d.day === day);
      return { day, reference: existente?.reference ?? "", description: existente?.description ?? "" };
    })
  );

  const [topics, setTopics] = useState<TopicInput[]>(
    lesson?.topics?.length
      ? lesson.topics.map((t) => ({
          number: t.number,
          title: t.title,
          synopsis: t.synopsis,
          bibliological_aid: t.bibliological_aid,
          knowledge_expansion: t.knowledge_expansion,
          subtopics: t.subtopics ?? [],
        }))
      : []
  );

  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestionInput[]>(
    lesson?.review_questions?.length
      ? lesson.review_questions.map((q) => ({ number: q.number, question: q.question, answer: q.answer }))
      : []
  );

  function updateDailyReading(idx: number, field: "reference" | "description", value: string) {
    setDailyReadings((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  function addTopic() {
    setTopics((prev) => [...prev, { number: prev.length + 1, title: "", synopsis: "", bibliological_aid: "", knowledge_expansion: "", subtopics: [] }]);
  }
  function removeTopic(idx: number) {
    setTopics((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTopic(idx: number, field: "title" | "synopsis" | "bibliological_aid" | "knowledge_expansion", value: string) {
    setTopics((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }
  function addSubtopic(topicIdx: number) {
    setTopics((prev) =>
      prev.map((t, i) =>
        i === topicIdx ? { ...t, subtopics: [...t.subtopics, { number: t.subtopics.length + 1, title: "", content: "" }] } : t
      )
    );
  }
  function removeSubtopic(topicIdx: number, subIdx: number) {
    setTopics((prev) =>
      prev.map((t, i) => (i === topicIdx ? { ...t, subtopics: t.subtopics.filter((_, si) => si !== subIdx) } : t))
    );
  }
  function updateSubtopic(topicIdx: number, subIdx: number, field: "title" | "content", value: string) {
    setTopics((prev) =>
      prev.map((t, i) =>
        i === topicIdx
          ? { ...t, subtopics: t.subtopics.map((s, si) => (si === subIdx ? { ...s, [field]: value } : s)) }
          : t
      )
    );
  }

  function addQuestion() {
    setReviewQuestions((prev) => [...prev, { number: prev.length + 1, question: "", answer: "" }]);
  }
  function removeQuestion(idx: number) {
    setReviewQuestions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateQuestion(idx: number, field: "question" | "answer", value: string) {
    setReviewQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Preencha o título da lição.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await salvarLicaoAction({
        id: lesson?.id,
        quarter_id: quarter.id,
        lesson_number: lessonNumber,
        title,
        aureo_text: aureoText || null,
        aureo_reference: aureoReference || null,
        practical_truth: practicalTruth || null,
        suggested_hymns: suggestedHymns || null,
        class_reading_ref: classReadingRef || null,
        class_reading_text: classReadingText || null,
        lesson_plan: lessonPlan || null,
        introduction: introduction || null,
        conclusion: conclusion || null,
        source_url: sourceUrl || null,
        video_url: videoUrl || null,
        video_type: videoType,
        daily_readings: dailyReadings,
        topics,
        review_questions: reviewQuestions,
      });

      if (!res.success) {
        setError(res.message ?? "Erro ao salvar a lição.");
        return;
      }
      router.push(`/admin/ebd/${quarter.id}`);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <Link
          href={`/admin/ebd/${quarter.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para o trimestre
        </Link>
        <h1 className="text-xl font-black text-iw-navy tracking-tight">
          {lesson ? "Editar Lição" : "Nova Lição"}
        </h1>
        <p className="text-iw-muted text-xs mt-0.5">
          {["1°", "2°", "3°", "4°"][quarter.quarter - 1]} Trimestre {quarter.year} — {quarter.theme ?? "Sem tema"}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader label="Identificação" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="Nº da lição" span="col-span-3 md:col-span-2">
              <input type="number" min={1} value={lessonNumber} onChange={(e) => setLessonNumber(Number(e.target.value))} className={bareCls} />
            </Field>
            <Field label="Título da lição *" span="col-span-9 md:col-span-10">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: O chamado de Abrão" className={bareCls} />
            </Field>
            <Field label="Texto Áureo" span="col-span-12 md:col-span-8">
              <textarea rows={2} value={aureoText ?? ""} onChange={(e) => setAureoText(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Referência do Texto Áureo" span="col-span-12 md:col-span-4">
              <input value={aureoReference ?? ""} onChange={(e) => setAureoReference(e.target.value)} placeholder="Ex: Gn 12.1-3" className={bareCls} />
            </Field>
            <Field label="Verdade Prática" span="col-span-12">
              <textarea rows={2} value={practicalTruth ?? ""} onChange={(e) => setPracticalTruth(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Hinos sugeridos" span="col-span-12">
              <input value={suggestedHymns ?? ""} onChange={(e) => setSuggestedHymns(e.target.value)} className={bareCls} />
            </Field>
          </div>
        </div>

        {/* Leitura diária */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader label="Leitura Diária" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dailyReadings.map((d, i) => (
              <div key={d.day} className={boxCls}>
                <label className={boxLabelCls}>{d.day}</label>
                <input
                  value={d.reference}
                  onChange={(e) => updateDailyReading(i, "reference", e.target.value)}
                  placeholder="Referência"
                  className={`${bareCls} mb-1`}
                />
                <input
                  value={d.description}
                  onChange={(e) => updateDailyReading(i, "description", e.target.value)}
                  placeholder="Descrição"
                  className={`${bareCls} text-xs`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Leitura bíblica em classe + plano */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader label="Leitura Bíblica em Classe" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="Referência" span="col-span-12 md:col-span-4">
              <input value={classReadingRef ?? ""} onChange={(e) => setClassReadingRef(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Texto" span="col-span-12 md:col-span-8">
              <textarea rows={2} value={classReadingText ?? ""} onChange={(e) => setClassReadingText(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Esboço da lição (plano de aula)" span="col-span-12">
              <textarea rows={3} value={lessonPlan ?? ""} onChange={(e) => setLessonPlan(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Introdução" span="col-span-12">
              <textarea rows={3} value={introduction ?? ""} onChange={(e) => setIntroduction(e.target.value)} className={bareCls} />
            </Field>
          </div>
        </div>

        {/* Tópicos */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader label="Tópicos (I, II, III...)" />
            <button type="button" onClick={addTopic} className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-blue hover:text-iw-navy transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" /> Adicionar tópico
            </button>
          </div>

          {topics.length === 0 && <p className="text-xs text-iw-muted">Nenhum tópico adicionado.</p>}

          {topics.map((topic, ti) => (
            <div key={ti} className="bg-iw-bg rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-iw-gold uppercase">Tópico {["I", "II", "III", "IV", "V", "VI"][ti] ?? ti + 1}</span>
                <button type="button" onClick={() => removeTopic(ti)} className="text-iw-error hover:opacity-70 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <Field label="Título do tópico" span="col-span-12">
                  <input value={topic.title} onChange={(e) => updateTopic(ti, "title", e.target.value)} className={bareCls} />
                </Field>
                <Field label="Sinopse" span="col-span-12">
                  <textarea rows={2} value={topic.synopsis ?? ""} onChange={(e) => updateTopic(ti, "synopsis", e.target.value)} className={bareCls} />
                </Field>
                <Field label="Auxílio Bibliológico" span="col-span-12 md:col-span-6">
                  <textarea rows={2} value={topic.bibliological_aid ?? ""} onChange={(e) => updateTopic(ti, "bibliological_aid", e.target.value)} className={bareCls} />
                </Field>
                <Field label="Ampliando o Conhecimento" span="col-span-12 md:col-span-6">
                  <textarea rows={2} value={topic.knowledge_expansion ?? ""} onChange={(e) => updateTopic(ti, "knowledge_expansion", e.target.value)} className={bareCls} />
                </Field>
              </div>

              <div className="pl-4 border-l-2 border-iw-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-iw-muted uppercase">Subtópicos</span>
                  <button type="button" onClick={() => addSubtopic(ti)} className="inline-flex items-center gap-1 text-[11px] font-bold text-iw-blue hover:text-iw-navy transition-colors">
                    <Plus className="w-3 h-3" /> Subtópico
                  </button>
                </div>
                {topic.subtopics.map((sub, si) => (
                  <div key={si} className="grid grid-cols-12 gap-2 items-start">
                    <div className={`${boxCls} col-span-5`}>
                      <label className={boxLabelCls}>Título</label>
                      <input value={sub.title} onChange={(e) => updateSubtopic(ti, si, "title", e.target.value)} className={bareCls} />
                    </div>
                    <div className={`${boxCls} col-span-6`}>
                      <label className={boxLabelCls}>Conteúdo</label>
                      <input value={sub.content} onChange={(e) => updateSubtopic(ti, si, "content", e.target.value)} className={bareCls} />
                    </div>
                    <button type="button" onClick={() => removeSubtopic(ti, si)} className="col-span-1 text-iw-error hover:opacity-70 transition-opacity mt-3">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Conclusão */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader label="Conclusão" />
          <textarea rows={3} value={conclusion ?? ""} onChange={(e) => setConclusion(e.target.value)} className={`${bareCls} border border-iw-border rounded-xl p-3`} />
        </div>

        {/* Revisando o conteúdo */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader label="Revisando o Conteúdo" />
            <button type="button" onClick={addQuestion} className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-blue hover:text-iw-navy transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" /> Adicionar pergunta
            </button>
          </div>
          {reviewQuestions.length === 0 && <p className="text-xs text-iw-muted">Nenhuma pergunta adicionada.</p>}
          {reviewQuestions.map((q, qi) => (
            <div key={qi} className="grid grid-cols-12 gap-2 items-start">
              <div className={`${boxCls} col-span-5`}>
                <label className={boxLabelCls}>Pergunta {qi + 1}</label>
                <input value={q.question} onChange={(e) => updateQuestion(qi, "question", e.target.value)} className={bareCls} />
              </div>
              <div className={`${boxCls} col-span-6`}>
                <label className={boxLabelCls}>Resposta</label>
                <input value={q.answer} onChange={(e) => updateQuestion(qi, "answer", e.target.value)} className={bareCls} />
              </div>
              <button type="button" onClick={() => removeQuestion(qi)} className="col-span-1 text-iw-error hover:opacity-70 transition-opacity mt-3">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Vídeo e fonte */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader label="Vídeo (opcional)" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="Tipo de vídeo" span="col-span-12 md:col-span-3">
              <select value={videoType} onChange={(e) => setVideoType(e.target.value)} className={`${bareCls} cursor-pointer`}>
                <option value="none">Sem vídeo</option>
                <option value="youtube">YouTube</option>
                <option value="direct">Vídeo direto</option>
                <option value="virtual">Professor Virtual</option>
              </select>
            </Field>
            <Field label="URL do vídeo" span="col-span-12 md:col-span-5">
              <input value={videoUrl ?? ""} onChange={(e) => setVideoUrl(e.target.value)} className={bareCls} />
            </Field>
            <Field label="URL da fonte original (opcional)" span="col-span-12 md:col-span-4">
              <input value={sourceUrl ?? ""} onChange={(e) => setSourceUrl(e.target.value)} className={bareCls} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/ebd/${quarter.id}`}
            className="border border-iw-border text-iw-navy font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-iw-bg transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-opacity"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {lesson ? "Salvar alterações" : "Criar lição"}
          </button>
        </div>
      </form>
    </div>
  );
}
