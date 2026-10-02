"use client";

// ============================================================
// PedidosMaterialProfessor — 29/09/2026, redesenho do fluxo de material
// didático (migration 122). Material é por AULA, não por curso, e o
// pedido pra gráfica é feito perto do fim da aula atual: a regra travada
// com o Joaquim foi "10 dias corridos antes do fim da aula" — a contagem
// de alunos ainda em EM_ANDAMENTO entra só como referência (snapshot),
// a quantidade final é sempre digitada na mão (sem margem fixa).
//
// 30/09/2026, ajuste (o Joaquim foi procurar essa tela e não achou): esta
// seção agora fica sempre visível por turma (não só quando há alerta),
// com o calendário de aulas editável (mesma ação que a secretaria usa,
// mas escopada à própria turma) e o histórico completo de pedidos — antes
// só existia o alerta dos 10 dias, sem lugar nenhum pra ver/editar as
// datas ou ver pedidos passados.
// ============================================================

import { useState } from "react";
import { Package, AlertTriangle, Clock, CheckCircle2, CalendarRange, ChevronDown, ChevronRight, History } from "lucide-react";

type Aula = {
  lesson_id: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  titulo: string;
  pedido: { status: string; quantidade_solicitada: number; created_at: string } | null;
};

type HistoricoItem = {
  lesson_id: string;
  titulo: string;
  status: string;
  quantidade_solicitada: number;
  created_at: string;
};

export type TurmaPedidoMaterial = {
  course_edition_id: string;
  label: string;
  aulas: Aula[];
  alunosEmAndamento: number;
  historico: HistoricoItem[];
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITADO: "Solicitado",
  ENVIADO_GRAFICA: "Enviado à gráfica",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  SOLICITADO: "bg-amber-50 text-amber-700 border-amber-200",
  ENVIADO_GRAFICA: "bg-blue-50 text-blue-700 border-blue-200",
  RECEBIDO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  CANCELADO: "bg-iw-bg text-iw-muted border-iw-border",
};

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim + "T00:00:00");
  return Math.round((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function AlertaPedido({
  turma,
  criarPedidoAction,
}: {
  turma: TurmaPedidoMaterial;
  criarPedidoAction: (formData: FormData) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const aulaAtual = turma.aulas.find((a) => {
    const dias = diasRestantes(a.data_fim);
    return dias !== null && dias >= 0;
  });

  if (!aulaAtual) {
    return <p className="text-xs text-iw-muted">Sem alertas — a turma ainda não tem calendário ou já terminou.</p>;
  }

  const dias = diasRestantes(aulaAtual.data_fim);
  const proximaAula = turma.aulas.find((a) => a.ordem === aulaAtual.ordem + 1);

  if (dias === null || dias > 10 || !proximaAula) {
    return (
      <p className="text-xs text-iw-muted inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-iw-success" /> Nenhum pedido pendente no momento — próximo alerta
        aparece quando faltarem 10 dias ou menos pro fim da aula atual (&ldquo;{aulaAtual.titulo}&rdquo;).
      </p>
    );
  }

  if (proximaAula.pedido) {
    return (
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-iw-border bg-iw-bg/40">
        <div className="min-w-0">
          <p className="text-xs text-iw-muted truncate">
            Pedido pra &ldquo;{proximaAula.titulo}&rdquo;: {proximaAula.pedido.quantidade_solicitada} unidade(s)
          </p>
        </div>
        <span
          className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
            STATUS_STYLE[proximaAula.pedido.status] ?? "bg-iw-bg text-iw-muted border-iw-border"
          }`}
        >
          {STATUS_LABEL[proximaAula.pedido.status] ?? proximaAula.pedido.status}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-800">
            A aula &ldquo;{aulaAtual.titulo}&rdquo; termina em {dias === 0 ? "hoje" : `${dias} dia(s)`} — hora de pedir
            o material da próxima aula: <strong>{proximaAula.titulo}</strong>.
          </p>
          <p className="text-xs text-amber-700 mt-1 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {turma.alunosEmAndamento} aluno(s) em andamento nesta turma (referência)
          </p>

          {!aberto ? (
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              <Package className="w-3.5 h-3.5" /> Registrar pedido
            </button>
          ) : (
            <form action={criarPedidoAction} className="mt-3 flex flex-wrap items-end gap-2.5">
              <input type="hidden" name="course_edition_id" value={turma.course_edition_id} />
              <input type="hidden" name="lesson_id" value={proximaAula.lesson_id} />
              <div>
                <label className="block text-[11px] font-bold text-amber-800 mb-1">Quantidade</label>
                <input
                  name="quantidade_solicitada"
                  type="number"
                  min={1}
                  defaultValue={turma.alunosEmAndamento || undefined}
                  required
                  className="w-24 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/30"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[11px] font-bold text-amber-800 mb-1">Observação (opcional)</label>
                <input
                  name="observacao"
                  maxLength={200}
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/30"
                />
              </div>
              <button
                type="submit"
                className="bg-iw-blue hover:bg-iw-navy text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Confirmar pedido
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarioTurma({
  turma,
  atualizarCalendarioAction,
  recalcularCalendarioAction,
}: {
  turma: TurmaPedidoMaterial;
  atualizarCalendarioAction: (formData: FormData) => void;
  recalcularCalendarioAction: (formData: FormData) => void;
}) {
  if (turma.aulas.length === 0) {
    return (
      <p className="text-xs text-iw-muted">
        Esta turma ainda não tem data de início/fim preenchida — fale com a secretaria pra gerar o calendário.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider">
          Ajuste as datas se o ritmo real da turma for diferente do calculado automaticamente.
        </p>
        <form action={recalcularCalendarioAction}>
          <input type="hidden" name="course_edition_id" value={turma.course_edition_id} />
          <button type="submit" className="text-[11px] font-bold text-iw-navy underline hover:text-iw-gold transition-colors shrink-0">
            Recalcular automaticamente
          </button>
        </form>
      </div>
      <div className="space-y-1.5">
        {turma.aulas.map((a) => (
          <form
            key={a.lesson_id}
            action={atualizarCalendarioAction}
            className="grid grid-cols-[1.75rem_1fr_auto_auto_auto] items-center gap-2"
          >
            <input type="hidden" name="course_edition_id" value={turma.course_edition_id} />
            <input type="hidden" name="lesson_id" value={a.lesson_id} />
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
            <button type="submit" className="text-[11px] font-bold text-iw-blue hover:text-iw-navy transition-colors">
              Salvar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

function HistoricoPedidos({ historico }: { historico: HistoricoItem[] }) {
  if (historico.length === 0) {
    return <p className="text-xs text-iw-muted">Nenhum pedido registrado ainda pra esta turma.</p>;
  }
  return (
    <div className="space-y-1.5">
      {historico.map((h, i) => (
        <div key={`${h.lesson_id}-${i}`} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-iw-navy truncate">{h.titulo}</span>
          <span className="text-iw-muted shrink-0">{h.quantidade_solicitada} un.</span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
              STATUS_STYLE[h.status] ?? "bg-iw-bg text-iw-muted border-iw-border"
            }`}
          >
            {STATUS_LABEL[h.status] ?? h.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function TurmaCard({
  turma,
  criarPedidoAction,
  atualizarCalendarioAction,
  recalcularCalendarioAction,
}: {
  turma: TurmaPedidoMaterial;
  criarPedidoAction: (formData: FormData) => void;
  atualizarCalendarioAction: (formData: FormData) => void;
  recalcularCalendarioAction: (formData: FormData) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const aulaAtual = turma.aulas.find((a) => {
    const dias = diasRestantes(a.data_fim);
    return dias !== null && dias >= 0;
  });
  const dias = aulaAtual ? diasRestantes(aulaAtual.data_fim) : null;
  const proximaAula = aulaAtual ? turma.aulas.find((a) => a.ordem === aulaAtual.ordem + 1) : null;
  const temAlerta = dias !== null && dias <= 10 && !!proximaAula && !proximaAula?.pedido;

  return (
    <div className={`rounded-xl border ${temAlerta ? "border-amber-300" : "border-iw-border"} bg-iw-surface overflow-hidden`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-iw-bg/40 transition-colors text-left"
      >
        <span className="text-sm font-bold text-iw-navy truncate">{turma.label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {temAlerta && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
              Pedido pendente
            </span>
          )}
          {aberto ? <ChevronDown className="w-4 h-4 text-iw-muted" /> : <ChevronRight className="w-4 h-4 text-iw-muted" />}
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4 pt-1 border-t border-iw-border space-y-4">
          <div>
            <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Pedido de material
            </p>
            <AlertaPedido turma={turma} criarPedidoAction={criarPedidoAction} />
          </div>

          <div>
            <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5">
              <CalendarRange className="w-3 h-3" /> Calendário de aulas
            </p>
            <CalendarioTurma
              turma={turma}
              atualizarCalendarioAction={atualizarCalendarioAction}
              recalcularCalendarioAction={recalcularCalendarioAction}
            />
          </div>

          <div>
            <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5">
              <History className="w-3 h-3" /> Histórico de pedidos
            </p>
            <HistoricoPedidos historico={turma.historico} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PedidosMaterialProfessor({
  turmas,
  criarPedidoAction,
  atualizarCalendarioAction,
  recalcularCalendarioAction,
}: {
  turmas: TurmaPedidoMaterial[];
  criarPedidoAction: (formData: FormData) => void;
  atualizarCalendarioAction: (formData: FormData) => void;
  recalcularCalendarioAction: (formData: FormData) => void;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-black text-iw-navy mb-1 inline-flex items-center gap-2">
        <Package className="w-4.5 h-4.5" /> Material didático
      </h2>
      <p className="text-xs text-iw-muted mb-3">
        Calendário de aulas por turma e pedidos de remessa de material pra gráfica. Clique numa turma pra abrir.
      </p>
      <div className="space-y-2.5">
        {turmas.map((t) => (
          <TurmaCard
            key={t.course_edition_id}
            turma={t}
            criarPedidoAction={criarPedidoAction}
            atualizarCalendarioAction={atualizarCalendarioAction}
            recalcularCalendarioAction={recalcularCalendarioAction}
          />
        ))}
      </div>
    </div>
  );
}
