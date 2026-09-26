"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Copy,
  Check,
  Power,
  PowerOff,
  GraduationCap,
  Search,
  Loader2,
} from "lucide-react";
import { professorAlternarLinkTurmaAction } from "./actions";
import { buscarTurmasPorUnidadeConfigAction } from "../(igreja)/dashboard/configuracoes/actions";
import { vincularTurmaProfessorSelfAction } from "../completar-cadastro/actions";

type Curso = { id: string; title: string };
type UnitLite = { id: string; type: string; name: string; parent_id: string | null };
type TurmaBusca = { id: string; nome: string; classe: string | null; course_id: string; unit_id: string | null; ano: number | null };
export type TurmaVinculo = {
  id: string;
  turno: string;
  dia_semana: string;
  link_token: string;
  link_ativo: boolean;
  // 21/09/2026, pedido do Joaquim (imagem 8): precisa do course_edition_id
  // cru (não só os campos aninhados pro texto) pra poder filtrar "Meus
  // Alunos" por turma — ead_matriculas guarda esse mesmo id (migration
  // 044), então é a chave de junção entre as duas listas.
  course_edition_id: string;
  course_edition: { nome: string; classe: string | null; courses: { title: string } | null; units: { name: string } | null } | null;
};

interface Props {
  cursos: Curso[];
  units: UnitLite[];
  turmas: TurmaVinculo[];
  appUrl: string;
  // 21/09/2026, pedido do Joaquim (imagem 8): trazer "Nova Matrícula" +
  // busca de aluno pro mesmo alinhamento do título "Minhas Turmas", à
  // direita — slot pra page.tsx passar esses controles sem esta seção
  // (que é só sobre turmas) precisar saber o que é renderizado ali.
  headerRight?: React.ReactNode;
}

const selectCls = "bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer";

const TURNOS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
];
const DIAS = [
  { value: "DOMINGO", label: "Domingo" },
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
];

const ANOS_TURMA = [2027, 2026];

function CopiarLinkButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // clipboard indisponível (http sem TLS, permissão negada) —
          // o link ainda fica visível pra copiar manualmente.
        }
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFFFFF] text-iw-navy border-[1.5px] border-[#CF8403] hover:bg-iw-gold/10 transition-colors shrink-0"
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}

export default function TurmasDoProfessor({ cursos, units, turmas, appUrl, headerRight }: Props) {
  const router = useRouter();

  // 25/09/2026, pedido do Joaquim: ordem de exibição no seletor precisa
  // ser SEDE, depois SETOR, depois REGIONAL — mas "Regional" não é um
  // `type` próprio em `units` (migration 094_regionais_bridge_sectors.sql
  // trouxe os regionais pra dentro de type="SETOR" também), só dá pra
  // distinguir pelo prefixo do nome ("REGIONAL 0xx" vs "SETOR 0xx").
  // Ordenar só por nome (localeCompare) colocava REGIONAL antes de SETOR
  // porque "R" vem antes de "S" no alfabeto — por isso o agrupamento
  // manual abaixo, igual ao já corrigido em ProfessorForm/SeletorHierarquico
  // /CongregacoesListClient.
  const sedes = useMemo(
    () => units.filter((u) => u.type === "SEDE").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );
  const setores = useMemo(
    () =>
      units
        .filter((u) => u.type === "SETOR" && !u.name.toUpperCase().startsWith("REGIONAL"))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );
  const regionais = useMemo(
    () =>
      units
        .filter((u) => u.type === "SETOR" && u.name.toUpperCase().startsWith("REGIONAL"))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );

  // ── Vincular a turma já existente (20/09/2026, pedido do Joaquim) ──
  // Mesma busca livre (Setor/Regional → Igreja/SEDE-exclusivo → Curso →
  // Turma → Turno/Dia) que já existe em /completar-cadastro (primeiro
  // login), agora disponível também aqui pra uso contínuo -- o professor
  // não precisa mais depender só daquele passo único de primeiro acesso
  // pra vincular uma turma que já existe. Reaproveita a MESMA action
  // (vincularTurmaProfessorSelfAction) porque ela já resolve a
  // identidade pelo usuário logado, sem gate de "primeiro login".
  const [buscaSetorId, setBuscaSetorId] = useState("");
  const [buscaIgrejaId, setBuscaIgrejaId] = useState("");
  const [buscaAno, setBuscaAno] = useState(String(ANOS_TURMA[0]));
  const [buscaCourseId, setBuscaCourseId] = useState("");
  const [buscaTurmaId, setBuscaTurmaId] = useState("");
  const [buscaTurno, setBuscaTurno] = useState("");
  const [buscaDiaSemana, setBuscaDiaSemana] = useState("");
  const [turmasEncontradas, setTurmasEncontradas] = useState<TurmaBusca[]>([]);
  const [igrejaCarregada, setIgrejaCarregada] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const [vincularErro, setVincularErro] = useState("");
  const [vincularOk, setVincularOk] = useState("");

  const carregandoTurmas = buscaIgrejaId !== "" && buscaIgrejaId !== igrejaCarregada;

  const sedeSelecionada = sedes.find((s) => s.id === buscaSetorId);

  const buscaIgrejas = useMemo(
    () =>
      units
        .filter((u) => u.type === "IGREJA" && u.parent_id === buscaSetorId)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units, buscaSetorId]
  );

  useEffect(() => {
    if (!buscaIgrejaId) return;
    let cancelado = false;
    buscarTurmasPorUnidadeConfigAction(buscaIgrejaId).then((data) => {
      if (cancelado) return;
      setTurmasEncontradas(data as TurmaBusca[]);
      setIgrejaCarregada(buscaIgrejaId);
    });
    return () => {
      cancelado = true;
    };
  }, [buscaIgrejaId]);

  const turmasDoCurso = useMemo(() => {
    if (!buscaCourseId) return [];
    return turmasEncontradas.filter(
      (t) => t.course_id === buscaCourseId && (t.ano === null || t.ano === Number(buscaAno))
    );
  }, [turmasEncontradas, buscaCourseId, buscaAno]);

  const handleVincularTurma = async () => {
    if (!buscaTurmaId || !buscaTurno || !buscaDiaSemana) {
      setVincularErro("Selecione a turma, o turno e o dia da semana.");
      return;
    }
    setVincularErro("");
    setVincularOk("");
    setVinculando(true);
    const fd = new FormData();
    fd.set("turma_course_edition_id", buscaTurmaId);
    fd.set("turma_turno", buscaTurno);
    fd.set("turma_dia_semana", buscaDiaSemana);
    const res = await vincularTurmaProfessorSelfAction(fd);
    setVinculando(false);
    if (!res.success) {
      setVincularErro(res.message);
      return;
    }
    setVincularOk("Turma vinculada! O link já está na lista acima.");
    setBuscaTurmaId("");
    setBuscaTurno("");
    setBuscaDiaSemana("");
    router.refresh();
  };

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-iw-gold" />
          <h2 className="text-sm font-bold text-iw-navy">Minhas Turmas</h2>
        </div>
        {headerRight}
      </div>

      {turmas.length === 0 ? (
        <p className="text-xs text-iw-muted">Você ainda não criou nenhuma turma.</p>
      ) : (
        <div className="space-y-2">
          {turmas.map((t) => {
            const link = `${appUrl}/matricula-turma/${t.link_token}`;
            return (
              <div key={t.id} className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-iw-navy truncate">
                      {t.course_edition?.courses?.title ?? "Curso"} — {t.course_edition?.nome ?? ""}
                      {t.course_edition?.classe ? ` (Classe ${t.course_edition.classe})` : ""}
                    </p>
                    <p className="text-xs text-iw-muted truncate">
                      {t.course_edition?.units?.name ?? "—"} · {TURNOS.find((x) => x.value === t.turno)?.label ?? t.turno} ·{" "}
                      {DIAS.find((x) => x.value === t.dia_semana)?.label ?? t.dia_semana}
                    </p>
                  </div>
                  <form action={professorAlternarLinkTurmaAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="ativar" value={(!t.link_ativo).toString()} />
                    <button
                      type="submit"
                      title={t.link_ativo ? "Desativar link" : "Reativar link"}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        t.link_ativo ? "bg-iw-success/10 text-iw-success" : "bg-iw-muted/10 text-iw-muted"
                      }`}
                    >
                      {t.link_ativo ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                      {t.link_ativo ? "Ativo" : "Desativado"}
                    </button>
                  </form>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-white border border-iw-border rounded-lg px-2.5 py-1.5">
                    <Link2 className="w-3.5 h-3.5 text-iw-muted shrink-0" />
                    <span className="text-xs text-iw-navy truncate font-mono">{link}</span>
                  </div>
                  <CopiarLinkButton url={link} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 21/09/2026, pedido do Joaquim (imagem 14): "Criar Turma" foi
          removido daqui de propósito -- professor NUNCA cria turma pelo
          próprio painel, só vincula a uma turma que a secretaria já
          cadastrou pela área de administração. */}
      <details className="border-t border-iw-border pt-4">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy">
          <Search className="w-4 h-4 text-iw-gold" /> Vincular a turma já existente
        </summary>
        <div className="mt-4 space-y-3">
          <p className="text-xs text-iw-muted">
            Busque uma turma que a secretaria já cadastrou — pode ser em outro Setor/Regional ou igreja.
          </p>

          {vincularErro && (
            <div className="text-xs text-iw-error bg-iw-error-bg border border-iw-error/20 px-3 py-2 rounded-lg">
              {vincularErro}
            </div>
          )}
          {vincularOk && (
            <div className="text-xs text-iw-success bg-iw-success/8 border border-iw-success/30 px-3 py-2 rounded-lg">
              {vincularOk}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={buscaAno}
              onChange={(e) => { setBuscaAno(e.target.value); setBuscaTurmaId(""); }}
              className={selectCls}
            >
              {ANOS_TURMA.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>

            <select
              value={buscaSetorId}
              onChange={(e) => {
                const valor = e.target.value;
                setBuscaSetorId(valor);
                const sedeEscolhida = sedes.find((s) => s.id === valor);
                setBuscaIgrejaId(sedeEscolhida ? sedeEscolhida.id : "");
                setBuscaCourseId("");
                setBuscaTurmaId("");
              }}
              className={selectCls}
            >
              <option value="">Setor / Regional...</option>
              {sedes.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              {setores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              {regionais.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>

            <select
              value={buscaIgrejaId}
              onChange={(e) => { setBuscaIgrejaId(e.target.value); setBuscaCourseId(""); setBuscaTurmaId(""); }}
              disabled={!!sedeSelecionada || buscaIgrejas.length === 0}
              className={selectCls}
            >
              <option value="">
                {sedeSelecionada ? "Sede selecionada" : buscaIgrejas.length > 0 ? "Igreja..." : "Escolha o setor primeiro"}
              </option>
              {buscaIgrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>

            <select
              value={buscaCourseId}
              onChange={(e) => { setBuscaCourseId(e.target.value); setBuscaTurmaId(""); }}
              disabled={!buscaIgrejaId}
              className={selectCls}
            >
              <option value="">{buscaIgrejaId ? "Curso..." : "Escolha a igreja primeiro"}</option>
              {cursos.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>

            <select
              value={buscaTurmaId}
              onChange={(e) => setBuscaTurmaId(e.target.value)}
              disabled={!buscaCourseId || carregandoTurmas}
              className={selectCls}
            >
              <option value="">
                {carregandoTurmas ? "Carregando..." : buscaCourseId ? "Turma..." : "Escolha o curso primeiro"}
              </option>
              {turmasDoCurso.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.classe ? ` - Classe ${t.classe}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={buscaTurno} onChange={(e) => setBuscaTurno(e.target.value)} className={selectCls}>
              <option value="">Turno...</option>
              {TURNOS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
            <select value={buscaDiaSemana} onChange={(e) => setBuscaDiaSemana(e.target.value)} className={selectCls}>
              <option value="">Dia da semana...</option>
              {DIAS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleVincularTurma}
            disabled={vinculando}
            className="flex items-center justify-center gap-2 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {vinculando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Vincular turma e gerar link
          </button>
        </div>
      </details>
    </div>
  );
}
