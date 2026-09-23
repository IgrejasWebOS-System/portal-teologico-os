"use client";

// ============================================================
// Fluxo de primeiro cadastro do professor (reescrito 20/09/2026, pedido
// do Joaquim) — 3 passos:
//
// 1. "ficha"    — a MESMA tela completa que a secretaria usa em "Novo
//                 Professor" (ProfessorForm.tsx), em modo selfService:
//                 sem a busca por matrícula/CPF/nome (mostrarBusca=false)
//                 e sem a seção de conceder acesso (o professor já tem
//                 login próprio) -- grava com salvarFichaProfessorAction.
// 2. "pergunta" — depois de salvar, pergunta em caixa alta se ele já tem
//                 turma formada ou se foi só atualização de dados.
// 3. "turma"    — só quando a resposta é "Sim": busca livre de uma turma
//                 JÁ EXISTENTE (Setor/Regional → Igreja/SEDE → Curso →
//                 Turma → Turno/Dia -- turmas são sempre criadas antes
//                 pela secretaria, nunca aqui) e grava o vínculo
//                 (professor_turmas). Pode adicionar mais de uma. Cada
//                 vínculo novo já sai com link_token próprio (default no
//                 banco, migration 108) -- mostrado na lista pra copiar e
//                 mandar pro aluno.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Loader2, Map, Church, BookOpen, CalendarDays, Copy, Check, AlertTriangle } from "lucide-react";
import ProfessorForm, { type ExistingProfessor } from "../(igreja)/dashboard/configuracoes/professores/ProfessorForm";
import type { UnitNode } from "../(igreja)/dashboard/configuracoes/unitsChain";
import { buscarTurmasPorUnidadeConfigAction } from "../(igreja)/dashboard/configuracoes/actions";
import { salvarFichaProfessorAction, vincularTurmaProfessorSelfAction } from "./actions";

type SelectItem = { id: string; name: string };
type ChurchLink = { id: string; unit_id: string | null };
type CursoLite = { id: string; title: string };
type TurmaLite = { id: string; nome: string; classe: string | null; course_id: string; unit_id: string | null; ano: number | null };
type LinkGerado = { label: string; url: string };

const ANOS_TURMA = [2027, 2026];

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

const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

interface Props {
  units: UnitNode[];
  churches: ChurchLink[];
  generos: SelectItem[];
  estadosCivis: SelectItem[];
  escolaridades: SelectItem[];
  profissoes: SelectItem[];
  cargos: SelectItem[];
  cursos: CursoLite[];
  existing: ExistingProfessor;
}

export default function CompletarCadastroProfessorFluxo({
  units, churches, generos, estadosCivis, escolaridades, profissoes, cargos, cursos, existing,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"ficha" | "pergunta" | "turma">("ficha");

  // ── Passo 3: vínculo com turma existente (repetível) ──
  const [turmaSetorId, setTurmaSetorId] = useState("");
  const [turmaIgrejaId, setTurmaIgrejaId] = useState("");
  const [turmaAno, setTurmaAno] = useState(String(ANOS_TURMA[0]));
  const [turmaCourseId, setTurmaCourseId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [turmaTurno, setTurmaTurno] = useState("");
  const [turmaDiaSemana, setTurmaDiaSemana] = useState("");
  const [turmasDaIgreja, setTurmasDaIgreja] = useState<TurmaLite[]>([]);
  const [turmaIgrejaCarregada, setTurmaIgrejaCarregada] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkGerado[]>([]);
  const [turmaError, setTurmaError] = useState("");
  const [salvandoTurma, setSalvandoTurma] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const carregandoTurmas = turmaIgrejaId !== "" && turmaIgrejaId !== turmaIgrejaCarregada;

  const turmaSetores = useMemo(
    () => units.filter((u) => u.type === "SETOR").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );
  // SEDE não pertence a nenhum Setor -- é alternativa a ele, não igreja
  // "dentro" dele: com Setor escolhido, só igrejas daquele Setor; sem
  // Setor, só a(s) Sede(s).
  const turmaIgrejas = useMemo(
    () =>
      (turmaSetorId
        ? units.filter((u) => u.type === "IGREJA" && u.parent_id === turmaSetorId)
        : units.filter((u) => u.type === "SEDE")
      ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units, turmaSetorId]
  );

  useEffect(() => {
    if (!turmaIgrejaId) return;
    let cancelado = false;
    buscarTurmasPorUnidadeConfigAction(turmaIgrejaId).then((data) => {
      if (cancelado) return;
      setTurmasDaIgreja(data as TurmaLite[]);
      setTurmaIgrejaCarregada(turmaIgrejaId);
    });
    return () => {
      cancelado = true;
    };
  }, [turmaIgrejaId]);

  const turmasDoCurso = useMemo(() => {
    if (!turmaCourseId) return [];
    return turmasDaIgreja.filter((t) => t.course_id === turmaCourseId && (t.ano === null || t.ano === Number(turmaAno)));
  }, [turmasDaIgreja, turmaCourseId, turmaAno]);

  const handleAdicionarTurma = async () => {
    if (!turmaId || !turmaTurno || !turmaDiaSemana) {
      setTurmaError("Selecione a turma, o turno e o dia da semana.");
      return;
    }
    setTurmaError("");
    setSalvandoTurma(true);
    const fd = new FormData();
    fd.set("turma_course_edition_id", turmaId);
    fd.set("turma_turno", turmaTurno);
    fd.set("turma_dia_semana", turmaDiaSemana);
    const res = await vincularTurmaProfessorSelfAction(fd);
    setSalvandoTurma(false);
    if (!res.success) {
      setTurmaError(res.message);
      return;
    }
    const turma = turmasDoCurso.find((t) => t.id === turmaId);
    const label = turma ? `${turma.nome}${turma.classe ? ` - Classe ${turma.classe}` : ""}` : "Turma";
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/matricula-turma/${res.linkToken}`;
    setLinks((prev) => [...prev, { label, url }]);
    setTurmaId("");
    setTurmaTurno("");
    setTurmaDiaSemana("");
  };

  const copiarLink = (url: string, idx: number) => {
    navigator.clipboard?.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((atual) => (atual === idx ? null : atual)), 1500);
  };

  if (step === "ficha") {
    // 21/09/2026: ProfessorForm agora monta seus próprios cards por seção
    // (mesmo padrão caixa/foco dourado de Nova/Editar Matrícula) -- sem
    // envolver num card extra aqui, senão vira caixa dentro de caixa.
    return (
      <ProfessorForm
        units={units}
        churches={churches}
        generos={generos}
        estadosCivis={estadosCivis}
        escolaridades={escolaridades}
        profissoes={profissoes}
        cargos={cargos}
        existing={existing}
        mostrarBusca={false}
        selfService
        action={salvarFichaProfessorAction}
        submitLabel="Concluir cadastro"
        onSaved={() => setStep("pergunta")}
      />
    );
  }

  if (step === "pergunta") {
    return (
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-8 text-center space-y-6">
        <p className="flex items-center justify-center gap-2 text-[#0D0D0D] text-lg font-black uppercase tracking-wide">
          <HelpCircle className="w-5 h-5 shrink-0" />
          Já tem turma formada ou é cadastro de atualização de dados?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep("turma")}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase bg-[#0D0D0D] border-2 border-[#CF8403] text-[#CF8403] hover:opacity-90 transition-opacity"
          >
            Sim, já tenho turma
          </button>
          <button
            type="button"
            onClick={() => router.push("/professor")}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase border-2 border-iw-navy text-iw-navy bg-white hover:bg-iw-bg transition-colors"
          >
            Não, é só atualização
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-black text-iw-navy uppercase tracking-wide mb-1">Vincular turma</h2>
        <p className="text-sm text-[#0D0D0D]">
          Busque a turma onde você já dá aula — pode ser em outro Setor/Regional ou igreja, e você pode
          adicionar mais de uma.
        </p>
      </div>

      {turmaError && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{turmaError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className={labelCls}>Ano</label>
          <select value={turmaAno} onChange={(e) => { setTurmaAno(e.target.value); setTurmaId(""); }} className={selectCls}>
            {ANOS_TURMA.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span></label>
          <select
            value={turmaSetorId}
            onChange={(e) => { setTurmaSetorId(e.target.value); setTurmaIgrejaId(""); setTurmaCourseId(""); setTurmaId(""); }}
            className={selectCls}
          >
            <option value="">Setor / Regional...</option>
            {turmaSetores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span></label>
          <select
            value={turmaIgrejaId}
            onChange={(e) => { setTurmaIgrejaId(e.target.value); setTurmaCourseId(""); setTurmaId(""); }}
            disabled={turmaIgrejas.length === 0}
            className={selectCls}
          >
            <option value="">{turmaIgrejas.length > 0 ? "Igreja..." : "Escolha o setor primeiro"}</option>
            {turmaIgrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> Curso</span></label>
          <select
            value={turmaCourseId}
            onChange={(e) => { setTurmaCourseId(e.target.value); setTurmaId(""); }}
            disabled={!turmaIgrejaId}
            className={selectCls}
          >
            <option value="">{turmaIgrejaId ? "Curso..." : "Escolha a igreja primeiro"}</option>
            {cursos.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Turma</label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={!turmaCourseId || carregandoTurmas}
            className={selectCls}
          >
            <option value="">
              {carregandoTurmas ? "Carregando..." : turmaCourseId ? "Turma..." : "Escolha o curso primeiro"}
            </option>
            {turmasDoCurso.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}{t.classe ? ` - Classe ${t.classe}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Turno</span></label>
          <select value={turmaTurno} onChange={(e) => setTurmaTurno(e.target.value)} className={selectCls}>
            <option value="">Selecione o turno...</option>
            {TURNOS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Dia da semana</label>
          <select value={turmaDiaSemana} onChange={(e) => setTurmaDiaSemana(e.target.value)} className={selectCls}>
            <option value="">Selecione o dia...</option>
            {DIAS_SEMANA.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdicionarTurma}
        disabled={salvandoTurma}
        className="flex items-center justify-center gap-2 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {salvandoTurma ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        + Adicionar turma
      </button>

      {links.length > 0 && (
        <div className="border-t border-iw-border pt-4 space-y-3">
          <p className={labelCls}>Link{links.length > 1 ? "s" : ""} pra enviar pro aluno</p>
          {links.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-3 bg-iw-bg border border-iw-border rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-iw-navy">{l.label}</p>
                <p className="text-xs text-[#0D0D0D] break-all">{l.url}</p>
              </div>
              <button
                type="button"
                onClick={() => copiarLink(l.url, i)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-iw-navy border border-iw-navy rounded-lg px-3 py-1.5 hover:bg-white transition-colors"
              >
                {copiedIdx === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIdx === i ? "Copiado" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => router.push("/professor")}
          className="bg-[#CF8403] hover:opacity-90 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          Concluir e ir para minha área
        </button>
      </div>
    </div>
  );
}
