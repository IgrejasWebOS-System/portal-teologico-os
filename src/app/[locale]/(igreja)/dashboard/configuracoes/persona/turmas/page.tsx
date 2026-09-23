import { CalendarRange, Trash2, Pencil, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import {
  addTurmaConfigAction,
  updateTurmaConfigAction,
  deleteTurmaFormAction,
} from "../../actions";
import TurmasFiltros, { type UnitLite } from "./TurmasFiltros";
import NovaTurmaForm from "./NovaTurmaForm";

type Row = {
  id: string;
  nome: string;
  classe: string | null;
  ano: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  course_id: string;
  unit_id: string | null;
  courses: { title: string } | null;
  units: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  ABERTA: "bg-iw-success-bg text-iw-success",
  ENCERRADA: "bg-iw-bg text-iw-muted",
};

// Anos com turma gerada em lote (14/09/2026) — ajustar aqui quando
// um novo ano for aberto pra matrícula.
const ANOS_DISPONIVEIS = [2027, 2026];

interface PageProps {
  searchParams: Promise<{
    msg?: string;
    error?: string;
    ano?: string;
    setor_id?: string;
    igreja_id?: string;
  }>;
}

export default async function TurmasPage({ searchParams }: PageProps) {
  const { msg, error, ano = "", setor_id: setorId = "", igreja_id: igrejaId = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: cursos }, { data: unitsRaw }] = await Promise.all([
    supabase.from("courses").select("id, title").order("title"),
    // SEDE entra também — ela não é Setor nem Regional (fica acima desse
    // nível, direto embaixo do Campo), mas é um núcleo com turma própria
    // (14/09/2026), então precisa aparecer nos seletores de igreja mesmo
    // sem um Setor pai pra filtrar.
    supabase.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
  ]);

  const units = (unitsRaw ?? []) as UnitLite[];

  // Só consulta course_editions depois que o Ano for escolhido — com
  // 6.800+ turmas geradas em lote, listar tudo de cara travaria a tela
  // à toa (ver staging/evidence — decisão de 14/09/2026).
  let rows: Row[] = [];
  let totalSemFiltroDeIgreja = 0;
  if (ano) {
    let query = supabase
      .from("course_editions")
      .select("id, nome, classe, ano, data_inicio, data_fim, status, course_id, unit_id, courses(title), units(name)", { count: "exact" })
      .eq("ano", Number(ano));

    if (igrejaId) {
      query = query.eq("unit_id", igrejaId);
    } else if (setorId) {
      const igrejasDoSetor = units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId).map((u) => u.id);
      query = query.in("unit_id", igrejasDoSetor.length > 0 ? igrejasDoSetor : ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data: turmasRaw, count } = await query.order("nome").limit(500);
    rows = (turmasRaw ?? []) as unknown as Row[];
    totalSemFiltroDeIgreja = count ?? rows.length;
  }

  const precisaRefinar = ano && !setorId && totalSemFiltroDeIgreja > 200;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={CalendarRange}
        title="Turmas"
        description="Edições de turma por curso, período, setor e igreja."
        backHref="/dashboard/configuracoes/persona"
        backLabel="Voltar para Persona"
        backNovoPadrao
      />

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

      <TurmasFiltros anos={ANOS_DISPONIVEIS} units={units} anoAtual={ano} setorAtual={setorId} igrejaAtual={igrejaId} />

      <NovaTurmaForm
        cursos={cursos ?? []}
        units={units}
        addTurmaConfigAction={addTurmaConfigAction}
        ano={ano}
        setorId={setorId}
        igrejaId={igrejaId}
      />

      {!ano ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold px-5 py-14 text-center">
          <CalendarRange className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Selecione um Ano acima para ver as turmas.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            São mais de 6.800 turmas cadastradas (todas as igrejas × Básico e Médio) — por
            isso a lista só aparece depois de filtrar.
          </p>
        </div>
      ) : precisaRefinar ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold px-5 py-14 text-center">
          <CalendarRange className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">
            {totalSemFiltroDeIgreja} turmas em {ano} — refine por Setor/Regional acima pra listar.
          </p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.7fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Turma</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Curso</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Período</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Status</span>
            <span></span>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarRange className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
              <p className="text-iw-muted text-sm font-medium">Nenhuma turma encontrada com esse filtro.</p>
            </div>
          ) : (
            <div className="divide-y divide-iw-border">
              {rows.map((r) => (
                <details key={r.id} className="group/row">
                  <summary className="cursor-pointer list-none grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.7fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                    <span className="text-sm font-semibold text-iw-navy truncate inline-flex items-center gap-1.5">
                      <Pencil className="w-3 h-3 text-iw-navy shrink-0" />
                      {r.nome}
                      {r.classe && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-iw-gold/10 text-iw-gold shrink-0">
                          Classe {r.classe}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-iw-muted truncate">{r.units?.name ?? "—"}</span>
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
                    <ChevronRight className="w-4 h-4 text-iw-muted transition-transform group-open/row:rotate-90" />
                  </summary>

                  <div className="px-5 pb-5 pt-1 bg-iw-bg/40 border-t border-iw-border">
                    <form action={updateTurmaConfigAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-3">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="unit_id" value={r.unit_id ?? ""} />
                      <input type="hidden" name="ano" value={ano} />
                      <input type="hidden" name="setor_id" value={setorId} />
                      <input type="hidden" name="igreja_id" value={igrejaId} />
                      <select
                        name="course_id"
                        required
                        defaultValue={r.course_id}
                        className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm cursor-pointer focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                      >
                        {(cursos ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      <input
                        name="nome"
                        required
                        defaultValue={r.nome}
                        className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                      />
                      <select
                        name="status"
                        defaultValue={r.status}
                        className="sm:col-span-1 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm cursor-pointer focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                      >
                        <option value="ABERTA">Aberta</option>
                        <option value="ENCERRADA">Encerrada</option>
                      </select>
                      <input
                        name="classe"
                        placeholder="Classe (opcional, ex: A)"
                        maxLength={1}
                        defaultValue={r.classe ?? ""}
                        className="sm:col-span-1 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm uppercase focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                      />
                      <input
                        name="data_inicio"
                        type="date"
                        defaultValue={r.data_inicio ?? ""}
                        className="sm:col-span-1 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                      />
                      <input
                        name="data_fim"
                        type="date"
                        defaultValue={r.data_fim ?? ""}
                        className="sm:col-span-1 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
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
      )}
    </div>
  );
}
