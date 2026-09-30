"use client";

// ============================================================
// PedidosMaterialProfessor — 29/09/2026, redesenho do fluxo de material
// didático (migration 122). Material é por AULA, não por curso, e o
// pedido pra gráfica é feito perto do fim da aula atual: a regra travada
// com o Joaquim foi "10 dias corridos antes do fim da aula" — a contagem
// de alunos ainda em EM_ANDAMENTO entra só como referência (snapshot),
// a quantidade final é sempre digitada na mão (sem margem fixa).
//
// Este componente só mostra alerta pra aula em curso cujo fim está a
// <=10 dias (e ainda não passou) E que ainda não tem pedido registrado
// pra próxima aula — se já existe pedido (qualquer status != CANCELADO),
// mostra o status em vez do formulário.
// ============================================================

import { useState } from "react";
import { Package, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

type Aula = {
  lesson_id: string;
  ordem: number;
  data_inicio: string | null;
  data_fim: string | null;
  titulo: string;
  pedido: { status: string; quantidade_solicitada: number; created_at: string } | null;
};

export type TurmaPedidoMaterial = {
  course_edition_id: string;
  label: string;
  aulas: Aula[];
  alunosEmAndamento: number;
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITADO: "Solicitado",
  ENVIADO_GRAFICA: "Enviado à gráfica",
  RECEBIDO: "Recebido",
};

const STATUS_STYLE: Record<string, string> = {
  SOLICITADO: "bg-amber-50 text-amber-700 border-amber-200",
  ENVIADO_GRAFICA: "bg-blue-50 text-blue-700 border-blue-200",
  RECEBIDO: "bg-iw-success-bg text-iw-success border-iw-success/30",
};

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim + "T00:00:00");
  return Math.round((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function AlertaTurma({
  turma,
  criarPedidoAction,
}: {
  turma: TurmaPedidoMaterial;
  criarPedidoAction: (formData: FormData) => void;
}) {
  const [aberto, setAberto] = useState(false);

  // Aula atual = primeira aula cujo fim ainda não passou.
  const aulaAtual = turma.aulas.find((a) => {
    const dias = diasRestantes(a.data_fim);
    return dias !== null && dias >= 0;
  });

  if (!aulaAtual) return null; // turma sem calendário ou já toda encerrada

  const dias = diasRestantes(aulaAtual.data_fim);
  const proximaAula = turma.aulas.find((a) => a.ordem === aulaAtual.ordem + 1);

  if (dias === null || dias > 10 || !proximaAula) return null; // ainda não é hora, ou é a última aula

  if (proximaAula.pedido) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-iw-border bg-iw-bg/40">
        <div className="min-w-0">
          <p className="text-sm font-bold text-iw-navy truncate">{turma.label}</p>
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
          <p className="text-sm font-bold text-amber-900">{turma.label}</p>
          <p className="text-xs text-amber-800 mt-0.5">
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

export default function PedidosMaterialProfessor({
  turmas,
  criarPedidoAction,
}: {
  turmas: TurmaPedidoMaterial[];
  criarPedidoAction: (formData: FormData) => void;
}) {
  const alguemPrecisaDePedido = turmas.some((t) => {
    const aulaAtual = t.aulas.find((a) => {
      const dias = diasRestantes(a.data_fim);
      return dias !== null && dias >= 0;
    });
    if (!aulaAtual) return false;
    const dias = diasRestantes(aulaAtual.data_fim);
    return dias !== null && dias <= 10;
  });

  if (!alguemPrecisaDePedido) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-black text-iw-navy mb-1 inline-flex items-center gap-2">
        <Package className="w-4.5 h-4.5" /> Material didático — pedidos de remessa
      </h2>
      <p className="text-xs text-iw-muted mb-3">
        Aparece aqui só quando uma aula está a 10 dias ou menos do fim, pra você pedir o material da próxima aula
        junto à secretaria.
      </p>
      <div className="space-y-2.5">
        {turmas.map((t) => (
          <AlertaTurma key={t.course_edition_id} turma={t} criarPedidoAction={criarPedidoAction} />
        ))}
      </div>
      <p className="text-[11px] text-iw-muted/70 mt-2 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Turmas sem alerta acima já estão com o pedido em dia.
      </p>
    </div>
  );
}
