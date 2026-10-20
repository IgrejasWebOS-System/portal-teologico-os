import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lock } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ContextoPresenca, TurmaPresenca } from "@/utils/presenca-contexto";
import SeletorTurma from "./SeletorTurma";
import SeletorAula, { type AulaOpcao } from "./SeletorAula";
import ListaPresenca, { type AlunoLista } from "./ListaPresenca";
import {
  presencaLiberarProvaAction,
  presencaSalvarChamadaAction,
  presencaSalvarRegrasAction,
} from "./actions";

// ============================================================
// Tela única de Presença e frequência (17/10/2026). Mesma tela para professor,
// secretário de setor/núcleo e secretaria geral; muda só o escopo das turmas e
// quem pode editar as regras (só a secretaria geral).
// ============================================================

export interface PresencaPainelProps {
  ctx: ContextoPresenca;
  turmas: TurmaPresenca[];
  basePath: string;
  sp: { turma?: string; aula?: string; data?: string; aba?: string; msg?: string; error?: string };
}

type Perms = Record<string, Record<string, boolean>>;
const ACOES: { chave: string; rotulo: string }[] = [
  { chave: "corrigir_fora_prazo", rotulo: "Corrigir após o prazo" },
  { chave: "justificar", rotulo: "Falta justificada" },
  { chave: "liberar_prova", rotulo: "Liberar prova" },
];

function hojeBR(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
function somaDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const fmt = (iso: string) => iso.split("-").reverse().join("/");
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const NOME_SIT: Record<string, string> = { PRESENTE: "Presente", FALTA: "Falta", JUSTIFICADA: "Falta justificada" };

const input = "mt-1 w-full border border-iw-border rounded-lg px-3 py-2 text-sm font-normal bg-white";
const btnPri = "bg-iw-navy text-white text-sm font-bold px-4 py-2 rounded-lg";
const btnSec = "border border-iw-navy text-iw-navy text-sm font-bold px-4 py-2 rounded-lg";
const card = "bg-white border border-iw-border rounded-xl p-4 mb-4";

export default async function PresencaPainel({ ctx, turmas, basePath, sp }: PresencaPainelProps) {
  const admin = createAdminClient();
  const hoje = hojeBR();
  const aba = sp.aba === "chamada" || sp.aba === "historico" ? sp.aba : sp.aula && sp.turma ? "chamada" : "frequencia";
  // Professor com uma turma só: já entra nela, sem precisar escolher.
  const turmaSel =
    turmas.find((t) => t.id === sp.turma) ?? (ctx.modo === "professor" && turmas.length === 1 ? turmas[0] : null);

  const { data: cfg } = await admin
    .from("presenca_config")
    .select("frequencia_minima, prazo_correcao_professor_dias, data_inicio_controle, bloqueio_prova_ativo, permissoes")
    .eq("id", true)
    .maybeSingle();
  const minima = Number(cfg?.frequencia_minima ?? 75);
  const prazo = cfg?.prazo_correcao_professor_dias ?? 7;
  const inicio = cfg?.data_inicio_controle ?? hoje;
  const bloqueio = !!cfg?.bloqueio_prova_ativo;
  const perms = (cfg?.permissoes ?? {}) as Perms;
  const permite = (acao: string) => !!perms[ctx.papel]?.[acao];

  // Aulas dos cursos das turmas do escopo (passo 1 do fluxo "por aula").
  const cursoIds = [...new Set(turmas.map((t) => t.cursoId))];
  const { data: lic } = cursoIds.length
    ? await admin.from("lessons").select("id, title, course_id, order_index").in("course_id", cursoIds).order("order_index")
    : { data: [] as { id: string; title: string; course_id: string; order_index: number | null }[] };
  const nomeCurso = new Map(turmas.map((t) => [t.cursoId, t.curso]));
  const aulasOpcoes: AulaOpcao[] = (lic ?? []).map((l) => ({
    id: l.id as string,
    titulo: l.title as string,
    cursoId: l.course_id as string,
    curso: nomeCurso.get(l.course_id as string) ?? "Curso",
  }));
  const limitaProf = ctx.papel === "PROFESSOR" && !permite("corrigir_fora_prazo");
  const dataMinSel = limitaProf && somaDias(hoje, -prazo) > inicio ? somaDias(hoje, -prazo) : inicio;
  const dataEscolhida = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje;

  const qsTurma = turmaSel ? `&turma=${turmaSel.id}` : "";
  const hidden = (extra: Record<string, string> = {}) => (
    <>
      <input type="hidden" name="modo" value={ctx.modo} />
      {Object.entries({ aba, ...(turmaSel ? { turma: turmaSel.id } : {}), ...(sp.aula ? { aula: sp.aula } : {}), ...(sp.data ? { data: sp.data } : {}), ...extra }).map(
        ([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        )
      )}
    </>
  );

  return (
    <div>
      <h1 className="text-2xl font-black text-iw-navy mb-1 flex items-center gap-2">
        <ClipboardCheck className="w-6 h-6 text-iw-gold" /> Presença e frequência
      </h1>
      <p className="text-sm text-iw-navy/70 mb-5">
        Marque quem está presente e feche a chamada: quem não foi marcado fica com falta. Quem ficar abaixo de {minima}% de frequência
        {bloqueio ? " não consegue fazer a prova." : " será barrado na prova quando o bloqueio for ligado."}
      </p>

      {sp.msg && (
        <div className="mb-4 flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {sp.msg}
        </div>
      )}
      {sp.error && (
        <div className="mb-4 flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {sp.error}
        </div>
      )}

      {/* ---------- Regras ---------- */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-sm font-bold text-iw-navy">Regras do controle</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${bloqueio ? "bg-iw-success/10 text-iw-success" : "bg-amber-100 text-amber-800"}`}>
            Bloqueio de prova: {bloqueio ? "ligado" : "desligado"}
          </span>
        </div>
        {ctx.global ? (
          <form action={presencaSalvarRegrasAction} className="space-y-3">
            {hidden()}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-iw-navy">
                Frequência mínima (%)
                <input name="frequencia_minima" defaultValue={String(minima)} inputMode="decimal" className={input} />
              </label>
              <label className="text-xs font-bold text-iw-navy">
                Prazo de correção (dias)
                <input name="prazo_dias" type="number" min={0} max={60} defaultValue={prazo} className={input} />
              </label>
              <div className="text-xs font-bold text-iw-navy">
                Controle desde
                <div className="mt-1 px-3 py-2 text-sm font-normal bg-iw-bg/50 rounded-lg">{fmt(inicio)}</div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-iw-navy">
              <input type="checkbox" name="bloqueio" defaultChecked={bloqueio} className="w-4 h-4" />
              Bloquear a prova de quem estiver abaixo da frequência mínima
            </label>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-iw-navy/60">
                  <th className="py-1 font-medium">O que cada perfil pode fazer</th>
                  <th className="py-1 font-medium">Professor</th>
                  <th className="py-1 font-medium">Secretaria (núcleo/setor/geral)</th>
                </tr>
              </thead>
              <tbody>
                {ACOES.map((a) => (
                  <tr key={a.chave} className="border-t border-iw-border/60">
                    <td className="py-1.5">{a.rotulo}</td>
                    {["PROFESSOR", "SECRETARIA"].map((p) => (
                      <td key={p} className="py-1.5">
                        <input type="checkbox" name={`perm_${p}_${a.chave}`} defaultChecked={!!perms[p]?.[a.chave]} className="w-4 h-4" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="submit" className={btnPri}>Salvar regras</button>
          </form>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3 text-sm text-iw-navy">
            <div className="bg-iw-bg/50 rounded-lg p-2"><div className="text-xs text-iw-navy/60">Frequência mínima</div>{minima}%</div>
            <div className="bg-iw-bg/50 rounded-lg p-2"><div className="text-xs text-iw-navy/60">Prazo de correção</div>{prazo} dias</div>
            <div className="bg-iw-bg/50 rounded-lg p-2"><div className="text-xs text-iw-navy/60">Controle desde</div>{fmt(inicio)}</div>
            <p className="sm:col-span-3 text-xs text-iw-navy/60">Só a secretaria geral altera estas regras.</p>
          </div>
        )}
      </div>

      {/* ---------- Presença por aula: aula -> data -> turma ---------- */}
      {turmas.length > 0 && (
        <SeletorAula
          key={`${sp.aula ?? ""}|${sp.turma ?? ""}`}
          aulas={aulasOpcoes}
          turmas={turmas}
          basePath={basePath}
          aulaId={sp.aula ?? ""}
          turmaId={sp.turma ?? ""}
          data={dataEscolhida}
          hoje={hoje}
          dataMin={dataMinSel}
        />
      )}

      {/* ---------- Turma (frequência e histórico) ---------- */}
      {turmas.length === 0 ? (
        <p className="text-sm text-iw-navy/70">Nenhuma turma nova no seu escopo.</p>
      ) : (
        <SeletorTurma key={turmaSel?.id ?? "nenhuma"} turmas={turmas} turmaId={turmaSel?.id ?? ""} aba={aba} basePath={basePath} simples={ctx.modo === "professor"} />
      )}

      {!turmaSel && turmas.length > 0 && (
        <ListaChamadas turmas={turmas} basePath={basePath} titulo="Últimas chamadas" mostrarTurma />
      )}

      {turmaSel && (
        <>
          <div className="flex gap-2 mb-4 text-sm font-bold">
            {[
              ["frequencia", "Frequência por aluno"],
              ["chamada", "Chamada e correções"],
              ["historico", "Histórico"],
            ].map(([k, rotulo]) => (
              <Link
                key={k}
                href={`${basePath}?aba=${k}${qsTurma}`}
                className={`px-3 py-1.5 rounded-lg ${aba === k ? "bg-iw-navy text-white" : "bg-iw-bg text-iw-navy/70"}`}
              >
                {rotulo}
              </Link>
            ))}
          </div>

          {aba === "frequencia" && <AbaFrequencia ctx={ctx} turma={turmaSel} minima={minima} pode={permite("liberar_prova")} hidden={hidden} />}
          {aba === "chamada" && (
            <AbaChamada ctx={ctx} turma={turmaSel} turmas={turmas} sp={sp} hoje={hoje} inicio={inicio} prazo={prazo} basePath={basePath}
              foraPrazo={permite("corrigir_fora_prazo")} justifica={permite("justificar")} hidden={hidden} />
          )}
          {aba === "historico" && <AbaHistorico turma={turmaSel} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
async function AbaFrequencia({ turma, minima, pode, hidden }: {
  ctx: ContextoPresenca; turma: TurmaPresenca; minima: number; pode: boolean;
  hidden: (extra?: Record<string, string>) => React.ReactNode;
}) {
  const admin = createAdminClient();
  const { data: mats } = await admin
    .from("ead_matriculas")
    .select("id, status, ead_alunos(nome_completo)")
    .eq("course_edition_id", turma.id)
    .in("status", ["EM_ANDAMENTO", "APROVADO"]);
  const linhas = await Promise.all(
    (mats ?? []).map(async (m) => {
      const { data: f } = await admin.rpc("presenca_frequencia_matricula", { p_matricula: m.id });
      return {
        id: m.id as string,
        status: m.status as string,
        nome: ((Array.isArray(m.ead_alunos) ? m.ead_alunos[0] : m.ead_alunos) as { nome_completo: string } | null)?.nome_completo ?? "—",
        f: (f ?? {}) as { aplicavel?: boolean; base?: number; presentes?: number; frequencia?: number | null; liberada?: boolean; bloqueio_ativo?: boolean; motivo?: string },
      };
    })
  );
  linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (linhas.length === 0) return <p className="text-sm text-iw-navy/70">Nenhuma matrícula nesta turma.</p>;
  return (
    <div className={card}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-iw-navy/60 border-b border-iw-border">
            <th className="py-2 font-medium">Aluno</th>
            <th className="py-2 font-medium">Presenças</th>
            <th className="py-2 font-medium">Frequência</th>
            <th className="py-2 font-medium">Prova</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const aplica = l.f.aplicavel !== false && (l.f.base ?? 0) > 0;
            const freq = aplica ? Number(l.f.frequencia ?? 0) : null;
            const abaixo = freq !== null && freq < minima;
            return (
              <tr key={l.id} className="border-b border-iw-border/50 align-top">
                <td className="py-2 text-iw-navy">{l.nome}</td>
                <td className="py-2">{aplica ? `${l.f.presentes ?? 0} de ${l.f.base}` : "—"}</td>
                <td className="py-2">{freq === null ? "—" : `${Math.round(freq)}%`}</td>
                <td className="py-2">
                  {freq === null ? (
                    <span className="text-xs text-iw-navy/60">Sem chamadas ainda</span>
                  ) : !abaixo ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-iw-success/10 text-iw-success">Liberada</span>
                  ) : l.f.liberada ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">Liberada manualmente</span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-iw-error/10 text-iw-error">Abaixo do mínimo</span>
                  )}
                </td>
                <td className="py-2">
                  {abaixo && !l.f.liberada && pode && (
                    <form action={presencaLiberarProvaAction} className="flex gap-2">
                      {hidden({ matricula_id: l.id })}
                      <input name="motivo" required minLength={5} placeholder="Justificativa" className="border border-iw-border rounded-lg px-2 py-1 text-xs w-40" />
                      <button type="submit" className={`${btnSec} !px-2 !py-1 !text-xs`}>Liberar prova</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------
async function AbaChamada({ ctx, turma, turmas, sp, hoje, inicio, prazo, basePath, foraPrazo, justifica, hidden }: {
  ctx: ContextoPresenca; turma: TurmaPresenca; turmas: TurmaPresenca[]; sp: PresencaPainelProps["sp"]; hoje: string; inicio: string; prazo: number;
  basePath: string; foraPrazo: boolean; justifica: boolean; hidden: (extra?: Record<string, string>) => React.ReactNode;
}) {
  const admin = createAdminClient();
  // A aula vem do formulário "Registrar presença de uma aula" (aula -> data -> turma).
  let aulaSel: { id: string; titulo: string } | null = null;
  if (sp.aula) {
    const { data: l } = await admin.from("lessons").select("id, title, course_id").eq("id", sp.aula).maybeSingle();
    if (l && l.course_id === turma.cursoId) aulaSel = { id: l.id as string, titulo: l.title as string };
  }
  const dataSel = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje;
  const limitaProfessor = ctx.papel === "PROFESSOR" && !foraPrazo;
  const dataMin = limitaProfessor && somaDias(hoje, -prazo) > inicio ? somaDias(hoje, -prazo) : inicio;
  const dataValida = dataSel <= hoje && dataSel >= dataMin;

  let alunos: AlunoLista[] = [];
  let candidatos: AlunoLista[] = [];
  let status: "NOVA" | "ABERTA" | "FECHADA" = "NOVA";
  let podeCorrigir = true;
  if (aulaSel && dataValida) {
    const { data: enc } = await admin
      .from("aula_encontros")
      .select("id, status, fechada_em")
      .eq("course_edition_id", turma.id)
      .eq("lesson_id", aulaSel.id)
      .eq("data", dataSel)
      .maybeSingle();
    if (enc) {
      status = enc.status as "ABERTA" | "FECHADA";
      if (status === "FECHADA" && enc.fechada_em && limitaProfessor) {
        const dia = new Date(enc.fechada_em).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
        podeCorrigir = hoje <= somaDias(dia, prazo);
      }
    }
    const nomeDe = (v: unknown) =>
      ((Array.isArray(v) ? v[0] : v) as { nome_completo: string } | null)?.nome_completo ?? "—";
    const [{ data: mats }, { data: pres }, { data: encsAula }] = await Promise.all([
      admin.from("ead_matriculas").select("id, aluno_id, ead_alunos(nome_completo)").eq("course_edition_id", turma.id).eq("status", "EM_ANDAMENTO"),
      enc ? admin.from("aula_presencas").select("matricula_id, situacao").eq("encontro_id", enc.id) : Promise.resolve({ data: [] as { matricula_id: string; situacao: string }[] }),
      // Esta mesma aula já aplicada (fechada) em outras datas/turmas do curso.
      admin.from("aula_encontros").select("id, data").eq("lesson_id", aulaSel.id).eq("status", "FECHADA"),
    ]);
    const sit = new Map((pres ?? []).map((p) => [p.matricula_id as string, p.situacao as string]));

    // Quem já assistiu esta aula em outra data/turma: aluno_id -> data mais recente (dd/mm).
    const dataDoEncontro = new Map((encsAula ?? []).filter((x) => x.id !== enc?.id).map((x) => [x.id as string, x.data as string]));
    const jaAssistiu = new Map<string, string>();
    if (dataDoEncontro.size > 0) {
      const { data: pOut } = await admin
        .from("aula_presencas")
        .select("encontro_id, matricula_id")
        .in("encontro_id", [...dataDoEncontro.keys()])
        .in("situacao", ["PRESENTE", "JUSTIFICADA"]);
      const matOut = [...new Set((pOut ?? []).map((p) => p.matricula_id as string))];
      const { data: mOut } = matOut.length ? await admin.from("ead_matriculas").select("id, aluno_id").in("id", matOut) : { data: [] };
      const alunoDaMat = new Map((mOut ?? []).map((m) => [m.id as string, m.aluno_id as string]));
      for (const p of pOut ?? []) {
        const al = alunoDaMat.get(p.matricula_id as string);
        const d = dataDoEncontro.get(p.encontro_id as string);
        if (al && d && (jaAssistiu.get(al) ?? "") < d) jaAssistiu.set(al, d);
      }
    }
    const curta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

    const idsTurma = new Set((mats ?? []).map((m) => m.id as string));
    alunos = (mats ?? []).map((m) => ({
      id: m.id as string,
      nome: nomeDe(m.ead_alunos),
      situacao: sit.get(m.id as string) ?? null,
      jaAssistiu: jaAssistiu.has(m.aluno_id as string) ? curta(jaAssistiu.get(m.aluno_id as string)!) : null,
    }));

    // Alunos de outras turmas do mesmo curso: os que já estão nesta chamada + opções para adicionar.
    const outrasTurmas = turmas.filter((t) => t.cursoId === turma.cursoId && t.id !== turma.id);
    const nomeTurmaDe = new Map(outrasTurmas.map((t) => [t.id, `${t.nucleo} — ${t.titulo}`]));
    const visitantesIds = [...sit.keys()].filter((id) => !idsTurma.has(id));
    const [{ data: mVis }, { data: mCand }] = await Promise.all([
      visitantesIds.length
        ? admin.from("ead_matriculas").select("id, aluno_id, course_edition_id, ead_alunos(nome_completo)").in("id", visitantesIds)
        : Promise.resolve({ data: [] as { id: string; aluno_id: string; course_edition_id: string; ead_alunos: unknown }[] }),
      outrasTurmas.length
        ? admin.from("ead_matriculas").select("id, aluno_id, course_edition_id, ead_alunos(nome_completo)")
            .in("course_edition_id", outrasTurmas.map((t) => t.id)).eq("status", "EM_ANDAMENTO").limit(500)
        : Promise.resolve({ data: [] as { id: string; aluno_id: string; course_edition_id: string; ead_alunos: unknown }[] }),
    ]);
    const deVisitante = (m: { id: string; aluno_id: string; course_edition_id: string; ead_alunos: unknown }, situacao: string | null): AlunoLista => ({
      id: m.id,
      nome: nomeDe(m.ead_alunos),
      situacao,
      turma: nomeTurmaDe.get(m.course_edition_id) ?? "outra turma",
      jaAssistiu: jaAssistiu.has(m.aluno_id) ? curta(jaAssistiu.get(m.aluno_id)!) : null,
    });
    alunos.push(...(mVis ?? []).map((m) => deVisitante(m, sit.get(m.id) ?? null)));
    candidatos = (mCand ?? [])
      .filter((m) => !sit.has(m.id))
      .map((m) => deVisitante(m, null))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    alunos.sort((a, b) => Number(!!a.turma) - Number(!!b.turma) || a.nome.localeCompare(b.nome, "pt-BR"));
  }
  const fechada = status === "FECHADA";
  const travada = fechada && !podeCorrigir;
  // Sair da lista aberta: volta para a turma, sem aula/data escolhidas.
  const saidaHref = `${basePath}?aba=chamada&turma=${turma.id}`;

  return (
    <div>
      <ListaChamadas turmas={[turma]} basePath={basePath} titulo="Chamadas já feitas nesta turma" />
      {!aulaSel && (
        <p className="text-sm text-iw-navy/70 mb-4">
          Para registrar presença, use o formulário acima: escolha a aula, o dia e a turma.
        </p>
      )}

      {aulaSel && !dataValida && (
        <p className="text-sm text-iw-error">Data fora do permitido: de {fmt(dataMin)} até hoje ({fmt(hoje)}).</p>
      )}

      {aulaSel && dataValida && (
        <form action={presencaSalvarChamadaAction} className={card}>
          {hidden({ aula: aulaSel.id, data: dataSel })}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm font-bold text-iw-navy">{aulaSel.titulo}, {fmt(dataSel)}</div>
            <span className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${fechada ? "bg-iw-navy/10 text-iw-navy" : "bg-amber-100 text-amber-800"}`}>
                {status === "NOVA" ? "Chamada ainda não iniciada" : fechada ? "Chamada fechada" : "Chamada aberta"}
              </span>
              <Link href={saidaHref} className="text-xs font-bold text-iw-navy border border-iw-border rounded-lg px-2 py-1">
                Fechar ✕
              </Link>
            </span>
          </div>
          {alunos.length === 0 && <p className="text-sm text-iw-navy/70">Nenhum aluno com matrícula em andamento nesta turma.</p>}
          {travada && (
            <p className="mb-3 flex items-center gap-2 text-sm text-iw-navy/70">
              <Lock className="w-4 h-4" /> Prazo de correção de {prazo} dias encerrado para o seu perfil.
            </p>
          )}
          {alunos.length > 0 && (
            <ListaPresenca
              key={`${turma.id}|${aulaSel.id}|${dataSel}|${status}`}
              alunos={alunos}
              candidatos={candidatos}
              disabled={travada}
              justifica={justifica}
            />
          )}
          {alunos.length > 0 && fechada && !travada && (
            <label className="block text-xs font-bold text-iw-navy mb-3">
              Motivo da correção (obrigatório)
              <input name="motivo" required minLength={5} className={input} placeholder="Ex.: aluno marcado como falta por engano" />
            </label>
          )}
          {alunos.length > 0 && !travada && (
            <div className="flex flex-wrap gap-2">
              {fechada ? (
                <>
                  <button type="submit" name="acao" value="salvar" className={btnPri}>Registrar correção</button>
                  <Link href={saidaHref} className={btnSec}>Sair sem alterar</Link>
                </>
              ) : (
                <>
                  <button type="submit" name="acao" value="fechar" className={btnPri}>Salvar presença</button>
                  <Link href={saidaHref} className={btnSec}>Sair sem salvar</Link>
                </>
              )}
            </div>
          )}
          {alunos.length > 0 && travada && (
            <Link href={saidaHref} className={btnSec}>Fechar</Link>
          )}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Chamadas já registradas (abertas ou fechadas), mais recentes primeiro. Cada linha
// abre a chamada daquela aula/data na aba "Chamada e correções".
async function ListaChamadas({ turmas, basePath, titulo, mostrarTurma = false }: {
  turmas: TurmaPresenca[]; basePath: string; titulo: string; mostrarTurma?: boolean;
}) {
  const admin = createAdminClient();
  const { data: encs } = await admin
    .from("aula_encontros")
    .select("id, data, status, course_edition_id, lesson_id, lessons(title)")
    .in("course_edition_id", turmas.map((t) => t.id))
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(mostrarTurma ? 15 : 30);
  const lista = encs ?? [];
  if (lista.length === 0) {
    return <p className="text-sm text-iw-navy/70 mb-4">Nenhuma chamada registrada ainda.</p>;
  }
  const { data: pres } = await admin
    .from("aula_presencas")
    .select("encontro_id, situacao")
    .in("encontro_id", lista.map((e) => e.id as string));
  const cont = new Map<string, { p: number; f: number; j: number }>();
  for (const p of pres ?? []) {
    const c = cont.get(p.encontro_id as string) ?? { p: 0, f: 0, j: 0 };
    if (p.situacao === "PRESENTE") c.p++;
    else if (p.situacao === "FALTA") c.f++;
    else c.j++;
    cont.set(p.encontro_id as string, c);
  }
  const nomeTurma = new Map(turmas.map((t) => [t.id, t.titulo]));

  return (
    <div className={card}>
      <p className="text-sm font-bold text-iw-navy mb-2">{titulo}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-iw-navy/60 border-b border-iw-border">
            <th className="py-2 font-medium">Data</th>
            {mostrarTurma && <th className="py-2 font-medium">Turma</th>}
            <th className="py-2 font-medium">Aula</th>
            <th className="py-2 font-medium">Situação</th>
            <th className="py-2 font-medium">Presentes / faltas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => {
            const c = cont.get(e.id as string) ?? { p: 0, f: 0, j: 0 };
            const aula = ((Array.isArray(e.lessons) ? e.lessons[0] : e.lessons) as { title: string } | null)?.title ?? "Aula";
            const href = `${basePath}?aba=chamada&turma=${e.course_edition_id}&aula=${e.lesson_id}&data=${e.data}`;
            return (
              <tr key={e.id as string} className="border-b border-iw-border/50">
                <td className="py-2 whitespace-nowrap">{fmt(e.data as string)}</td>
                {mostrarTurma && <td className="py-2">{nomeTurma.get(e.course_edition_id as string) ?? "—"}</td>}
                <td className="py-2">{aula}</td>
                <td className="py-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.status === "FECHADA" ? "bg-iw-navy/10 text-iw-navy" : "bg-amber-100 text-amber-800"}`}>
                    {e.status === "FECHADA" ? "Fechada" : "Aberta"}
                  </span>
                </td>
                <td className="py-2">{c.p} / {c.f + c.j}</td>
                <td className="py-2 text-right">
                  <Link href={href} className="text-xs font-bold text-iw-navy underline">
                    {e.status === "FECHADA" ? "Ver / corrigir" : "Continuar"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------
async function AbaHistorico({ turma }: { turma: TurmaPresenca }) {
  const admin = createAdminClient();
  const { data: encs } = await admin
    .from("aula_encontros")
    .select("id, data, lessons(title)")
    .eq("course_edition_id", turma.id);
  const info = new Map(
    (encs ?? []).map((e) => [
      e.id as string,
      { data: e.data as string, aula: ((Array.isArray(e.lessons) ? e.lessons[0] : e.lessons) as { title: string } | null)?.title ?? "Aula" },
    ])
  );
  const ids = [...info.keys()];
  const { data: hist } = ids.length
    ? await admin
        .from("aula_presencas_historico")
        .select("id, encontro_id, matricula_id, situacao_anterior, situacao_nova, ator_user_id, papel, motivo, registrado_em")
        .in("encontro_id", ids)
        .order("registrado_em", { ascending: false })
        .limit(150)
    : { data: [] };
  const linhas = hist ?? [];
  const userIds = [...new Set(linhas.map((h) => h.ator_user_id).filter(Boolean))] as string[];
  const matIds = [...new Set(linhas.map((h) => h.matricula_id))] as string[];
  const [{ data: perfis }, { data: mats }] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    matIds.length ? admin.from("ead_matriculas").select("id, ead_alunos(nome_completo)").in("id", matIds) : Promise.resolve({ data: [] }),
  ]);
  const nomeUser = new Map((perfis ?? []).map((p) => [p.id as string, p.full_name as string]));
  const nomeAluno = new Map(
    (mats ?? []).map((m: { id: string; ead_alunos: unknown }) => [
      m.id,
      ((Array.isArray(m.ead_alunos) ? m.ead_alunos[0] : m.ead_alunos) as { nome_completo: string } | null)?.nome_completo ?? "—",
    ])
  );

  if (linhas.length === 0) return <p className="text-sm text-iw-navy/70">Ainda não há registros nesta turma.</p>;
  return (
    <div className={card}>
      <p className="text-xs text-iw-navy/60 mb-2">Registro permanente: não pode ser alterado nem apagado. Mostra os 150 mais recentes.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-iw-navy/60 border-b border-iw-border">
            <th className="py-2 font-medium">Quando</th>
            <th className="py-2 font-medium">Quem</th>
            <th className="py-2 font-medium">Aula</th>
            <th className="py-2 font-medium">Aluno</th>
            <th className="py-2 font-medium">Mudança</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((h) => {
            const e = info.get(h.encontro_id as string);
            return (
              <tr key={h.id as string} className="border-b border-iw-border/50 align-top">
                <td className="py-2 whitespace-nowrap">{fmtHora(h.registrado_em as string)}</td>
                <td className="py-2">{nomeUser.get(h.ator_user_id as string) ?? "—"} <span className="text-xs text-iw-navy/50">({h.papel === "PROFESSOR" ? "professor" : "secretaria"})</span></td>
                <td className="py-2">{e ? `${e.aula}, ${fmt(e.data)}` : "—"}</td>
                <td className="py-2">{nomeAluno.get(h.matricula_id as string) ?? "—"}</td>
                <td className="py-2">
                  {h.situacao_anterior ? `${NOME_SIT[h.situacao_anterior as string]} → ` : ""}{NOME_SIT[h.situacao_nova as string]}
                  {h.motivo ? <div className="text-xs text-iw-navy/60">{h.motivo as string}</div> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
