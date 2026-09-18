"use client";

// ============================================================
// Vínculos de Turma do professor — Turma + Turno + Dia da semana
// (granularidade decidida com o Joaquim via AskUserQuestion, 15/09/2026).
// Um professor pode ter vários vínculos: mesma turma em dias/turnos
// diferentes, turmas diferentes na mesma igreja, ou até igrejas
// diferentes. Cobre o caso de "Classe A/Classe B" (duas salas da mesma
// turma, professores diferentes) porque cada Classe é uma course_edition
// própria (ver campo `classe` em Configurações > Turmas).
// Só aparece depois que o professor já foi salvo (precisa de um id).
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Trash2, Plus, Loader2, Map, Church, BookOpen } from "lucide-react";
import { addProfessorTurmaAction, deleteProfessorTurmaFormAction, buscarTurmasPorUnidadeConfigAction } from "../actions";
import type { UnitLite } from "../persona/turmas/TurmasFiltros";

type Curso = { id: string; title: string };

type Turma = { id: string; nome: string; classe: string | null; course_id: string; unit_id: string | null; ano: number | null };

export type VinculoExistente = {
  id: string;
  turno: string;
  dia_semana: string;
  turmaNome: string;
  classe: string | null;
  cursoTitle: string | null;
  igrejaNome: string | null;
};

interface Props {
  professorId: string;
  units: UnitLite[];
  cursos: Curso[];
  vinculos: VinculoExistente[];
}

const ANOS_DISPONIVEIS = [2027, 2026];

const TURNOS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
];

const DIAS_SEMANA = [
  { value: "DOMINGO", label: "Domingo" },
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
];

const TURNO_LABEL: Record<string, string> = Object.fromEntries(TURNOS.map((t) => [t.value, t.label]));
const DIA_LABEL: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((d) => [d.value, d.label]));

const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function ProfessorTurmasVinculos({ professorId, units, cursos, vinculos }: Props) {
  const [ano, setAno] = useState(String(ANOS_DISPONIVEIS[0]));
  const [setorId, setSetorId] = useState("");
  const [igrejaId, setIgrejaId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [turno, setTurno] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  // Em vez de um booleano ligado/desligado à mão dentro do efeito (o que o
  // lint react-hooks/set-state-in-effect reprova mesmo pra "setLoading(true)"
  // -- só aceita setState dentro do callback assíncrono), guarda pra qual
  // igreja as turmas em `turmas` já correspondem, e deriva "carregando" só
  // comparando com a igreja selecionada agora.
  const [igrejaTurmasCarregadas, setIgrejaTurmasCarregadas] = useState<string | null>(null);
  const carregandoTurmas = igrejaId !== "" && igrejaId !== igrejaTurmasCarregadas;
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const setores = useMemo(
    () => units.filter((u) => u.type === "SETOR").sort((a, b) => a.name.localeCompare(b.name)),
    [units]
  );
  // Sede não é Setor nem Regional — entra sempre na lista, mesmo sem Setor.
  const igrejas = useMemo(
    () =>
      [
        ...(setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []),
        ...units.filter((u) => u.type === "SEDE"),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [units, setorId]
  );

  // Troca de igreja reseta a turma escolhida e a lista antiga -- ajuste de
  // estado durante a renderização (não em useEffect), padrão recomendado
  // pelo React pra "resetar estado quando um valor derivado muda"
  // (https://react.dev/learn/you-might-not-need-an-effect), exigido pelo
  // lint react-hooks/set-state-in-effect (CI quebrou nisso em 18/09/2026).
  const [igrejaIdAnterior, setIgrejaIdAnterior] = useState(igrejaId);
  if (igrejaId !== igrejaIdAnterior) {
    setIgrejaIdAnterior(igrejaId);
    setTurmaId("");
    setTurmas([]);
  }

  // Busca as turmas da igreja escolhida -- este sim é efeito de verdade
  // (sincroniza com o backend); o reset de estado acima saiu daqui, e o
  // único setState direto no corpo do efeito acontece dentro do callback
  // assíncrono (padrão que o próprio lint aceita).
  useEffect(() => {
    if (!igrejaId) return;
    let cancelado = false;
    buscarTurmasPorUnidadeConfigAction(igrejaId).then((data) => {
      if (cancelado) return;
      setTurmas(data as Turma[]);
      setIgrejaTurmasCarregadas(igrejaId);
    });
    return () => {
      cancelado = true;
    };
  }, [igrejaId]);

  const turmasDoCurso = useMemo(() => {
    if (!courseId) return [];
    return turmas.filter((t) => t.course_id === courseId && (t.ano === null || t.ano === Number(ano)));
  }, [turmas, courseId, ano]);

  const handleAdicionar = () => {
    if (!turmaId) { setError("Selecione a turma."); return; }
    if (!turno) { setError("Selecione o turno."); return; }
    if (!diaSemana) { setError("Selecione o dia da semana."); return; }
    setError("");

    const fd = new FormData();
    fd.set("professor_id", professorId);
    fd.set("course_edition_id", turmaId);
    fd.set("turno", turno);
    fd.set("dia_semana", diaSemana);

    startTransition(async () => {
      const res = await addProfessorTurmaAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      setTurmaId("");
      setTurno("");
      setDiaSemana("");
    });
  };

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-1 pb-2 border-b border-iw-border">
        <CalendarDays className="w-4 h-4 text-iw-gold" />
        Vínculos de Turma (onde e quando ministra aula)
      </h3>
      <p className="text-xs text-iw-muted -mt-2">
        Um professor pode ter vários vínculos — turmas diferentes, ou a mesma turma em dias/turnos
        diferentes (ex: Classe A de manhã, Classe B à noite).
      </p>

      {error && (
        <p className="text-xs font-semibold text-iw-error bg-iw-error-bg border border-iw-error/20 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={(e) => { setAno(e.target.value); setTurmaId(""); }} className={selectCls}>
            {ANOS_DISPONIVEIS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span>
          </label>
          <select
            value={setorId}
            onChange={(e) => { setSetorId(e.target.value); setIgrejaId(""); }}
            className={selectCls}
          >
            <option value="">Setor / Regional...</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span>
          </label>
          <select
            value={igrejaId}
            onChange={(e) => setIgrejaId(e.target.value)}
            disabled={igrejas.length === 0}
            className={selectCls}
          >
            <option value="">{igrejas.length > 0 ? "Igreja..." : "Escolha o setor primeiro"}</option>
            {igrejas.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> Curso</span>
          </label>
          <select
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setTurmaId(""); }}
            disabled={!igrejaId}
            className={selectCls}
          >
            <option value="">{igrejaId ? "Curso..." : "Escolha a igreja primeiro"}</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Turma</label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={!courseId || carregandoTurmas}
            className={selectCls}
          >
            <option value="">
              {carregandoTurmas ? "Carregando..." : courseId ? "Turma..." : "Escolha o curso primeiro"}
            </option>
            {turmasDoCurso.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}{t.classe ? ` - Classe ${t.classe}` : ""}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleAdicionar}
          disabled={isPending || !turmaId}
          className="flex items-center justify-center gap-2 bg-iw-gold hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-opacity h-[42px]"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Turno</label>
          <select value={turno} onChange={(e) => setTurno(e.target.value)} className={selectCls}>
            <option value="">Selecione o turno...</option>
            {TURNOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Dia da semana</label>
          <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)} className={selectCls}>
            <option value="">Selecione o dia...</option>
            {DIAS_SEMANA.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2">
        {vinculos.length === 0 ? (
          <p className="text-xs text-iw-muted italic">Nenhum vínculo de turma cadastrado ainda.</p>
        ) : (
          <ul className="divide-y divide-iw-border border border-iw-border rounded-xl overflow-hidden">
            {vinculos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-iw-bg/40">
                <div className="text-xs text-iw-navy">
                  <span className="font-bold">{v.turmaNome}{v.classe ? ` - Classe ${v.classe}` : ""}</span>
                  {v.cursoTitle && <span className="text-iw-muted"> · {v.cursoTitle}</span>}
                  {v.igrejaNome && <span className="text-iw-muted"> · {v.igrejaNome}</span>}
                  <span className="text-iw-muted"> · {DIA_LABEL[v.dia_semana] ?? v.dia_semana} · {TURNO_LABEL[v.turno] ?? v.turno}</span>
                </div>
                <form action={deleteProfessorTurmaFormAction.bind(null, v.id)}>
                  <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover vínculo">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
