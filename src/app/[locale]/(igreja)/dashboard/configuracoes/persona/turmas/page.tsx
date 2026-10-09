import { CalendarRange, Trash2, Pencil, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import {
  addTurmaConfigAction,
  updateTurmaConfigAction,
  deleteTurmaFormAction,
  atualizarCalendarioAulaAction,
  recalcularCalendarioTurmaAction,
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
const ANOS_DISPONIVEIS = [2026, 2027];

type AulaCalendario = {
  lesson_id: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  titulo: string;
};

type Igreja = { key: string; nome: string; turmas: Row[] };
type SubGrupo = { key: string; nome: string; total: number; igrejas: Igreja[] };

interface PageProps {
  searchParams: Promise<{
    msg?: string;
    error?: string;
    ano?: string;
  }>;
}

// Uma turma (linha), com o painel de edição + calendário de aulas que
// abre embaixo ao clicar — mesmo conteúdo que já existia antes de
// 02/10/2026, só extraído pra função à parte porque agora é renderizado
// dentro de 3 níveis de agrupamento (categoria > setor/regional > igreja)
// em vez de uma lista plana.
function TurmaRow({
  r,
  ano,
  calendario,
  cursos,
}: {
  r: Row;
  ano: string;
  calendario: AulaCalendario[];
  cursos: { id: string; title: string }[];
}) {
  return (
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
          <select
            name="course_id"
            required
            defaultValue={r.course_id}
            className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm cursor-pointer focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
          >
            {cursos.map((c) => (
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
            placeholder="Classe (opcional)"
            maxLength={40}
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

        <div className="mt-4 pt-4 border-t border-iw-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-iw-muted uppercase tracking-wider">
              Calendário de aulas (pra pedido de material — migration 122)
            </p>
            <form action={recalcularCalendarioTurmaAction}>
              <input type="hidden" name="course_edition_id" value={r.id} />
              <input type="hidden" name="ano" value={ano} />
              <button
                type="submit"
                className="text-[11px] font-bold text-iw-navy underline hover:text-iw-gold transition-colors"
              >
                Recalcular automaticamente
              </button>
            </form>
          </div>

          {calendario.length === 0 ? (
            <p className="text-xs text-iw-muted/70">
              Sem calendário ainda (a turma precisa ter data de início e fim preenchidas acima).
            </p>
          ) : (
            <div className="space-y-1.5">
              {calendario.map((a) => (
                <form
                  key={a.lesson_id}
                  action={atualizarCalendarioAulaAction}
                  className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-2"
                >
                  <input type="hidden" name="course_edition_id" value={r.id} />
                  <input type="hidden" name="lesson_id" value={a.lesson_id} />
                  <input type="hidden" name="ano" value={ano} />
                  <span className="text-[11px] font-bold text-iw-muted text-center">{a.ordem}</span>
                  <span className="text-xs text-iw-navy truncate">{a.titulo}</span>
                  <input
                    name="data_inicio"
                    type="date"
                    defaultValue={a.data_inicio ?? ""}
                    className="bg-white border border-iw-border rounded-lg px-2 py-1 text-xs focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
                  />
                  <input
                    name="data_fim"
                    type="date"
                    defaultValue={a.data_fim ?? ""}
                    className="bg-white border border-iw-border rounded-lg px-2 py-1 text-xs focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
                  />
                  <button
                    type="submit"
                    className="text-[11px] font-bold text-iw-blue hover:text-iw-navy transition-colors"
                  >
                    Salvar
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        <form action={deleteTurmaFormAction.bind(null, r.id)} className="pt-3">
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
  );
}

export default async function TurmasPage({ searchParams }: PageProps) {
  const { msg, error, ano: anoParam } = await searchParams;
  // 08/10/2026, pedido do Joaquim: ao abrir a tela já vem o ANO CORRENTE
  // (2026) selecionado e as turmas daquele ano visíveis. Só quando a URL
  // traz `?ano=` explícito (inclusive vazio, "Selecione...") é que se
  // respeita o que veio — assim o usuário ainda consegue limpar o filtro.
  const anoCorrente = String(new Date().getFullYear());
  const ano =
    anoParam !== undefined
      ? anoParam
      : ANOS_DISPONIVEIS.includes(Number(anoCorrente))
        ? anoCorrente
        : "";
  const supabase = await createClient();

  const [{ data: cursos }, { data: unitsRaw }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("visivel_busca", true).order("title"),
    // SEDE entra também — ela não é Setor nem Regional (fica acima desse
    // nível, direto embaixo do Campo), mas é um núcleo com turma própria
    // (14/09/2026), então precisa aparecer nos seletores de igreja mesmo
    // sem um Setor pai pra filtrar.
    supabase.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
  ]);

  const units = (unitsRaw ?? []) as UnitLite[];

  // 02/10/2026, pedido do Joaquim: mesmo critério de SEDE/SETOR/REGIONAL
  // usado em Professores/Alunos — mas aqui a categoria "REGIONAL" não vem
  // de uma coluna (como sectors.categoria), e sim do nome do setor
  // começar com "REGIONAL" (mesmo critério já usado em TurmasFiltros e
  // NovaTurmaForm pra separar os dois grupos no seletor).
  const setorPorId = new Map(units.filter((u) => u.type === "SETOR").map((u) => [u.id, u]));
  function categoriaDoSetor(setor: UnitLite | undefined): "SETOR" | "REGIONAL" {
    return setor && setor.name.toUpperCase().startsWith("REGIONAL") ? "REGIONAL" : "SETOR";
  }

  const sedeIds: string[] = [];
  const setorIgrejaIds: string[] = [];
  const regionalIgrejaIds: string[] = [];
  const unitInfo = new Map<
    string,
    { categoria: "SEDE" | "SETOR" | "REGIONAL"; setorId: string | null; setorNome: string | null; igrejaNome: string }
  >();

  for (const u of units) {
    if (u.type === "SEDE") {
      sedeIds.push(u.id);
      unitInfo.set(u.id, { categoria: "SEDE", setorId: null, setorNome: null, igrejaNome: u.name });
    } else if (u.type === "IGREJA") {
      const setor = u.parent_id ? setorPorId.get(u.parent_id) : undefined;
      const categoria = categoriaDoSetor(setor);
      if (categoria === "REGIONAL") regionalIgrejaIds.push(u.id);
      else setorIgrejaIds.push(u.id);
      unitInfo.set(u.id, { categoria, setorId: setor?.id ?? null, setorNome: setor?.name ?? null, igrejaNome: u.name });
    }
  }

  // Contagem agregada — pedido do Joaquim (02/10/2026): mostrar o total
  // quebrado por Sede/Setor/Regional assim que a página abre, SEM buscar
  // as 6.800+ linhas de turma (só 3 contagens via count:exact/head:true).
  // Soma todos os anos quando nenhum Ano está selecionado no filtro; ao
  // escolher um Ano, as 3 contagens passam a refletir só aquele ano.
  async function contar(ids: string[]) {
    if (ids.length === 0) return 0;
    let q = supabase.from("course_editions").select("id", { count: "exact", head: true }).in("unit_id", ids);
    if (ano) q = q.eq("ano", Number(ano));
    const { count } = await q;
    return count ?? 0;
  }

  const [totalSede, totalSetor, totalRegional] = await Promise.all([
    contar(sedeIds),
    contar(setorIgrejaIds),
    contar(regionalIgrejaIds),
  ]);
  const totalGeral = totalSede + totalSetor + totalRegional;

  // Total GLOBAL (todos os anos somados, sempre) — pedido do Joaquim
  // (03/10/2026): diferente do total acima (que já reflete o Ano quando
  // selecionado), este fica fixo no cabeçalho da página, logo abaixo do
  // título/descrição, igual ao padrão de Professores/Alunos, pra dar uma
  // visão geral mesmo antes de escolher um Ano.
  async function contarSemFiltroDeAno(ids: string[]) {
    if (ids.length === 0) return 0;
    const { count } = await supabase
      .from("course_editions")
      .select("id", { count: "exact", head: true })
      .in("unit_id", ids);
    return count ?? 0;
  }
  const [totalGlobalSede, totalGlobalSetor, totalGlobalRegional] = ano
    ? await Promise.all([
        contarSemFiltroDeAno(sedeIds),
        contarSemFiltroDeAno(setorIgrejaIds),
        contarSemFiltroDeAno(regionalIgrejaIds),
      ])
    : [totalSede, totalSetor, totalRegional];
  const totalGlobalGeral = totalGlobalSede + totalGlobalSetor + totalGlobalRegional;

  // A lista de turmas de verdade (pra abrir dentro dos blocos SEDE/SETOR/
  // REGIONAL) só é buscada depois que o Ano é escolhido — com 6.800+
  // turmas no total, listar tudo de cara travaria a tela à toa (ver
  // staging/evidence — decisão de 14/09/2026, mantida em 02/10/2026).
  let rows: Row[] = [];
  const calendarioPorTurma = new Map<string, AulaCalendario[]>();

  if (ano) {
    const { data: turmasRaw } = await supabase
      .from("course_editions")
      .select(
        "id, nome, classe, ano, data_inicio, data_fim, status, course_id, unit_id, courses(title), units(name)"
      )
      .eq("ano", Number(ano))
      .order("nome");
    rows = (turmasRaw ?? []) as unknown as Row[];

    if (rows.length > 0) {
      const { data: scheduleRaw } = await supabase
        .from("course_edition_lesson_schedule")
        .select("course_edition_id, lesson_id, ordem, data_inicio, data_fim, lessons(title)")
        .in("course_edition_id", rows.map((r) => r.id))
        .order("ordem");

      for (const s of scheduleRaw ?? []) {
        const lista = calendarioPorTurma.get(s.course_edition_id) ?? [];
        lista.push({
          lesson_id: s.lesson_id,
          ordem: s.ordem,
          data_inicio: s.data_inicio,
          data_fim: s.data_fim,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          titulo: ((Array.isArray(s.lessons) ? s.lessons[0] : s.lessons) as any)?.title ?? `Aula ${s.ordem}`,
        });
        calendarioPorTurma.set(s.course_edition_id, lista);
      }
    }
  }

  function agruparPorIgreja(rowsDaCategoria: Row[]): Igreja[] {
    const map = new Map<string, Igreja>();
    for (const r of rowsDaCategoria) {
      const info = r.unit_id ? unitInfo.get(r.unit_id) : undefined;
      const key = r.unit_id ?? "SEM_IGREJA";
      const nome = info?.igrejaNome ?? r.units?.name ?? "Sem igreja definida";
      if (!map.has(key)) map.set(key, { key, nome, turmas: [] });
      map.get(key)!.turmas.push(r);
    }
    return Array.from(map.values());
  }

  const sedeRows = rows.filter((r) => r.unit_id && unitInfo.get(r.unit_id)?.categoria === "SEDE");
  const setorRowsMap = new Map<string, Row[]>();
  const setorNomes = new Map<string, string>();
  const regionalRowsMap = new Map<string, Row[]>();
  const regionalNomes = new Map<string, string>();

  for (const r of rows) {
    const info = r.unit_id ? unitInfo.get(r.unit_id) : undefined;
    if (!info || info.categoria === "SEDE") continue;
    const key = info.setorId ?? "SEM_SETOR";
    const nome = info.setorNome ?? "Sem setor definido";
    const map = info.categoria === "REGIONAL" ? regionalRowsMap : setorRowsMap;
    const nomes = info.categoria === "REGIONAL" ? regionalNomes : setorNomes;
    nomes.set(key, nome);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const montarSubgrupos = (map: Map<string, Row[]>, nomes: Map<string, string>): SubGrupo[] =>
    Array.from(map.entries())
      .map(([key, rs]) => ({ key, nome: nomes.get(key) ?? "Sem setor definido", total: rs.length, igrejas: agruparPorIgreja(rs) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const categorias = [
    { chave: "SEDE", nome: "SEDE", total: totalSede, subgrupos: null as SubGrupo[] | null, igrejas: agruparPorIgreja(sedeRows) as Igreja[] | null },
    { chave: "SETOR", nome: "SETOR", total: totalSetor, subgrupos: montarSubgrupos(setorRowsMap, setorNomes), igrejas: null },
    { chave: "REGIONAL", nome: "REGIONAL", total: totalRegional, subgrupos: montarSubgrupos(regionalRowsMap, regionalNomes), igrejas: null },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={CalendarRange}
        title="Turmas"
        description="Edições de turma por curso, período, setor e igreja."
        backHref="/dashboard/configuracoes/persona"
        backLabel="Voltar para Persona"
        backNovoPadrao
        extra={
          <p className="text-black text-sm">
            Total Turmas{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalGlobalGeral}
            </span>
            , composição{" "}
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              SEDE
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalGlobalSede}
            </span>
            ,{" "}
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              SETOR
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalGlobalSetor}
            </span>{" "}
            e{" "}
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              REGIONAL
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalGlobalRegional}
            </span>
            .
          </p>
        }
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

      <TurmasFiltros
        anos={ANOS_DISPONIVEIS}
        anoAtual={ano}
        totalGeral={totalGeral}
        totalSede={totalSede}
        totalSetor={totalSetor}
        totalRegional={totalRegional}
      />

      <NovaTurmaForm
        cursos={cursos ?? []}
        units={units}
        addTurmaConfigAction={addTurmaConfigAction}
        ano={ano}
        setorId=""
        igrejaId=""
      />

      <div className="space-y-3">
        {categorias.map((cat) => (
          <details key={cat.chave} className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm group">
            <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-iw-bg select-none list-none">
              <span className="flex items-center gap-2 text-sm font-bold text-iw-navy">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                {cat.nome}
              </span>
              <span className="text-xs font-semibold text-iw-muted">
                <span className="text-[15px] font-black text-iw-navy">{cat.total}</span> turma
                {cat.total === 1 ? "" : "s"}
              </span>
            </summary>

            {!ano ? (
              <div className="px-5 py-8 text-center text-iw-muted text-sm">
                Selecione o Ano acima para ver a lista de turmas desta categoria.
              </div>
            ) : cat.igrejas !== null ? (
              cat.igrejas.length === 0 ? (
                <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhuma turma nesta categoria.</div>
              ) : (
                <div className="divide-y divide-iw-border">
                  {cat.igrejas.map((igreja) => (
                    <details key={igreja.key} className="group/igreja">
                      <summary className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                        <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/igreja:rotate-90" />
                          {igreja.nome}
                        </span>
                        <span className="text-[11px] font-bold text-iw-muted">{igreja.turmas.length}</span>
                      </summary>
                      <div className="divide-y divide-iw-border bg-iw-bg/30">
                        {igreja.turmas.map((r) => (
                          <TurmaRow key={r.id} r={r} ano={ano} calendario={calendarioPorTurma.get(r.id) ?? []} cursos={cursos ?? []} />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )
            ) : cat.subgrupos!.length === 0 ? (
              <div className="px-5 py-8 text-center text-iw-muted text-sm">Nenhuma turma nesta categoria.</div>
            ) : (
              <div className="divide-y divide-iw-border">
                {cat.subgrupos!.map((sub) => (
                  <details key={sub.key} className="group/sub">
                    <summary className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                      <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/sub:rotate-90" />
                        {sub.nome}
                      </span>
                      <span className="text-[11px] font-bold text-iw-muted">
                        {sub.total} turma{sub.total === 1 ? "" : "s"}
                      </span>
                    </summary>
                    <div className="divide-y divide-iw-border bg-iw-bg/30">
                      {sub.igrejas.map((igreja) => (
                        <details key={igreja.key} className="group/igreja">
                          <summary className="flex items-center justify-between px-8 py-2 cursor-pointer hover:bg-iw-bg/50 select-none list-none">
                            <span className="flex items-center gap-2 text-xs font-semibold text-iw-navy">
                              <ChevronRight className="w-3 h-3 transition-transform group-open/igreja:rotate-90" />
                              {igreja.nome}
                            </span>
                            <span className="text-[11px] font-bold text-iw-muted">{igreja.turmas.length}</span>
                          </summary>
                          <div className="divide-y divide-iw-border bg-iw-bg/50">
                            {igreja.turmas.map((r) => (
                              <TurmaRow key={r.id} r={r} ano={ano} calendario={calendarioPorTurma.get(r.id) ?? []} cursos={cursos ?? []} />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}
