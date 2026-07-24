import Link from "next/link";
import { ArrowLeft, CalendarRange, Plus, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  addTurmaConfigAction,
  updateTurmaConfigAction,
  deleteTurmaFormAction,
} from "../../actions";

type Row = {
  id: string;
  nome: string;
  ano: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  course_id: string;
  courses: { title: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  ABERTA: "bg-iw-success-bg text-iw-success",
  ENCERRADA: "bg-iw-bg text-iw-muted",
};

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function TurmasPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: turmasRaw }, { data: cursos }] = await Promise.all([
    supabase
      .from("course_editions")
      .select("id, nome, ano, data_inicio, data_fim, status, course_id, courses(title)")
      .order("ano", { ascending: false })
      .order("nome"),
    supabase.from("courses").select("id, title").order("title"),
  ]);

  const rows = (turmasRaw ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard/configuracoes/persona"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Persona
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-sky/20 flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5 text-iw-navy" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Turmas</h1>
            <p className="text-iw-muted text-xs mt-0.5">Edições de turma por curso e período.</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy uppercase tracking-wider">
          <Plus className="w-4 h-4 text-iw-gold" />
          Nova Turma
        </summary>
        <form action={addTurmaConfigAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
          <select
            name="course_id"
            required
            defaultValue=""
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
          >
            <option value="" disabled>Curso</option>
            {(cursos ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <input
            name="nome"
            required
            placeholder="Nome da turma (ex: Turma 2026-A)"
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="data_inicio"
            type="date"
            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="data_fim"
            type="date"
            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-6 justify-self-start bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
          >
            Cadastrar
          </button>
        </form>
      </details>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Turma</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Curso</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Período</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Status</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarRange className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm font-medium">Nenhuma turma cadastrada.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Clique em &ldquo;Nova Turma&rdquo; para começar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-iw-border">
            {rows.map((r) => (
              <details key={r.id} className="group/row">
                <summary className="cursor-pointer list-none grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                  <span className="text-sm font-semibold text-iw-navy truncate inline-flex items-center gap-1.5">
                    <Pencil className="w-3 h-3 text-iw-muted shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                    {r.nome}
                  </span>
                  <span className="text-xs text-iw-muted truncate">{r.courses?.title ?? "—"}</span>
                  <span className="text-xs text-iw-muted truncate">
                    {r.data_inicio ? new Date(r.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    {" – "}
                    {r.data_fim ? new Date(r.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </span>
                  <span
                    className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-center ${
                      STATUS_STYLE[r.status] ?? "bg-iw-bg text-iw-muted"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span></span>
                </summary>

                <div className="px-5 pb-5 pt-1 bg-iw-bg/40 border-t border-iw-border">
                  <form action={updateTurmaConfigAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <select
                      name="course_id"
                      required
                      defaultValue={r.course_id}
                      className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
                    >
                      {(cursos ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    <input
                      name="nome"
                      required
                      defaultValue={r.nome}
                      className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
                    />
                    <select
                      name="status"
                      defaultValue={r.status}
                      className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
                    >
                      <option value="ABERTA">Aberta</option>
                      <option value="ENCERRADA">Encerrada</option>
                    </select>
                    <div />
                    <input
                      name="data_inicio"
                      type="date"
                      defaultValue={r.data_inicio ?? ""}
                      className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
                    />
                    <input
                      name="data_fim"
                      type="date"
                      defaultValue={r.data_fim ?? ""}
                      className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
                    />
                    <div className="sm:col-span-6 flex items-center gap-4">
                      <button
                        type="submit"
                        className="bg-iw-blue hover:bg-iw-navy text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                  <form action={deleteTurmaFormAction.bind(null, r.id)} className="pt-1">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-muted hover:text-iw-error transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover turma
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
