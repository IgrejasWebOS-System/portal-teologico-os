import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, GraduationCap, BookOpen } from "lucide-react";
import type { Course } from "@/types";
import { createCourseVoidAction, toggleCourseStatusAction } from "../actions";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Trilhas — Admin" };

const inputCls = "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none transition-colors";
const labelCls = "block text-xs font-semibold text-iw-muted uppercase tracking-wider mb-1.5";

export default async function TrilhasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("module")
    .order("created_at");

  const courseList = (courses ?? []) as Course[];
  const escola = courseList.filter((c) => c.module === "escola");
  const cursos = courseList.filter((c) => c.module === "cursos");

  return (
    <div className="max-w-4xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      <div>
        <Link href="/admin/conteudo" className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Biblioteca
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Trilhas e Módulos</h1>
          <p className="text-iw-muted text-sm">Organize as trilhas de conteúdo por módulo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Escola Teológica ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-iw-blue" />
            <h2 className="font-bold text-iw-navy">Escola Teológica</h2>
            <span className="text-xs text-iw-muted ml-auto">{escola.length} trilhas</span>
          </div>

          {escola.map((c) => (
            <div key={c.id} className="bg-iw-surface rounded-xl border border-iw-border p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-iw-navy truncate">{c.title}</p>
                {c.instructor_name && (
                  <p className="text-xs text-iw-muted">{c.instructor_name}</p>
                )}
              </div>
              <form action={toggleCourseStatusAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value={c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                <button
                  type="submit"
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                    c.status === "PUBLISHED"
                      ? "bg-iw-success/10 text-iw-success"
                      : "bg-iw-warning/10 text-iw-warning"
                  }`}
                >
                  {c.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                </button>
              </form>
              <Link
                href={`/admin/conteudo/nova?course_id=${c.id}`}
                className="text-xs text-iw-blue font-semibold hover:text-iw-navy transition-colors"
              >
                + Aula
              </Link>
            </div>
          ))}

          {/* Nova trilha — Escola */}
          <details className="bg-iw-surface rounded-xl border border-iw-border overflow-hidden">
            <summary className="px-4 py-3 flex items-center gap-2 text-sm font-semibold text-iw-blue cursor-pointer hover:bg-iw-bg/50 transition-colors list-none">
              <Plus className="w-4 h-4" /> Nova trilha na Escola Teológica
            </summary>
            <form action={createCourseVoidAction} className="px-4 pb-4 pt-1 space-y-3 border-t border-iw-border">
              <input type="hidden" name="module" value="escola" />
              <div><label className={labelCls}>Título</label>
                <input name="title" type="text" required placeholder="Ex: Teologia Sistemática" className={inputCls} /></div>
              <div><label className={labelCls}>Descrição</label>
                <textarea name="description" rows={2} placeholder="Breve descrição..." className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Professor</label>
                  <input name="instructor_name" type="text" placeholder="Nome do professor" className={inputCls} /></div>
                <div><label className={labelCls}>Nível</label>
                  <select name="level" className={inputCls}>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-iw-blue text-white text-sm font-semibold hover:bg-iw-navy transition-colors">
                Criar trilha
              </button>
            </form>
          </details>
        </div>

        {/* ── Cursos & Treinamentos ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-iw-gold" />
            <h2 className="font-bold text-iw-navy">Cursos & Treinamentos</h2>
            <span className="text-xs text-iw-muted ml-auto">{cursos.length} trilhas</span>
          </div>

          {cursos.map((c) => (
            <div key={c.id} className="bg-iw-surface rounded-xl border border-iw-border p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-iw-navy truncate">{c.title}</p>
                {c.instructor_name && (
                  <p className="text-xs text-iw-muted">{c.instructor_name}</p>
                )}
              </div>
              <form action={toggleCourseStatusAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value={c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                <button type="submit" className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                  c.status === "PUBLISHED" ? "bg-iw-success/10 text-iw-success" : "bg-iw-warning/10 text-iw-warning"
                }`}>
                  {c.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                </button>
              </form>
              <Link href={`/admin/conteudo/nova?course_id=${c.id}`} className="text-xs text-iw-gold font-semibold hover:text-iw-navy transition-colors">
                + Aula
              </Link>
            </div>
          ))}

          <details className="bg-iw-surface rounded-xl border border-iw-border overflow-hidden">
            <summary className="px-4 py-3 flex items-center gap-2 text-sm font-semibold text-iw-gold cursor-pointer hover:bg-iw-bg/50 transition-colors list-none">
              <Plus className="w-4 h-4" /> Novo curso / treinamento
            </summary>
            <form action={createCourseVoidAction} className="px-4 pb-4 pt-1 space-y-3 border-t border-iw-border">
              <input type="hidden" name="module" value="cursos" />
              <div><label className={labelCls}>Título</label>
                <input name="title" type="text" required placeholder="Ex: Liderança e Ministério" className={inputCls} /></div>
              <div><label className={labelCls}>Descrição</label>
                <textarea name="description" rows={2} placeholder="Breve descrição..." className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Professor</label>
                  <input name="instructor_name" type="text" placeholder="Nome do professor" className={inputCls} /></div>
                <div><label className={labelCls}>Nível</label>
                  <select name="level" className={inputCls}>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-iw-gold text-white text-sm font-semibold hover:bg-iw-navy transition-colors">
                Criar curso
              </button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
