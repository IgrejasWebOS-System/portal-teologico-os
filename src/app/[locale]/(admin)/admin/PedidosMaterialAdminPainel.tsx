"use client";

// ============================================================
// PedidosMaterialAdminPainel — 29/09/2026, redesenho do fluxo de material
// didático (migration 122). Visão consolidada da secretaria: junta os
// pedidos que cada professor lançou pra própria turma, agrupados por
// material/aula, pra fechar uma remessa só com a gráfica. Nada aqui
// desconta estoque sozinho — só a transição pra "Recebido" soma no
// estoque_atual do material vinculado (feito no server, ver
// atualizarStatusPedidoMaterialAction).
// ============================================================

import { useState, useTransition } from "react";
import { PackageSearch, ChevronRight } from "lucide-react";
import { atualizarStatusPedidoMaterialAction } from "./actions";

export type PedidoMaterialRow = {
  id: string;
  turma_label: string;
  aula_titulo: string;
  material_nome: string | null;
  alunos_em_andamento_snapshot: number;
  quantidade_solicitada: number;
  status: "SOLICITADO" | "ENVIADO_GRAFICA" | "RECEBIDO" | "CANCELADO";
  observacao: string | null;
  created_at: string;
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

const PROXIMO_STATUS: Record<string, string | null> = {
  SOLICITADO: "ENVIADO_GRAFICA",
  ENVIADO_GRAFICA: "RECEBIDO",
  RECEBIDO: null,
  CANCELADO: null,
};

const PROXIMO_STATUS_LABEL: Record<string, string> = {
  ENVIADO_GRAFICA: "Marcar enviado à gráfica",
  RECEBIDO: "Marcar recebido",
};

function LinhaPedido({ pedido }: { pedido: PedidoMaterialRow }) {
  const [isPending, startTransition] = useTransition();
  const proximo = PROXIMO_STATUS[pedido.status];

  return (
    <tr className="border-b border-iw-border/60 last:border-b-0">
      <td className="py-2 pr-2 font-semibold text-iw-navy truncate max-w-[180px]">{pedido.turma_label}</td>
      <td className="py-2 pr-2 text-iw-muted truncate max-w-[160px]">{pedido.aula_titulo}</td>
      <td className="py-2 pr-2 text-iw-muted truncate max-w-[140px]">{pedido.material_nome ?? "—"}</td>
      <td className="py-2 pr-2 text-right text-iw-muted">{pedido.alunos_em_andamento_snapshot}</td>
      <td className="py-2 pr-2 text-right font-bold text-iw-navy">{pedido.quantidade_solicitada}</td>
      <td className="py-2 pr-2">
        <span
          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[pedido.status]}`}
        >
          {STATUS_LABEL[pedido.status]}
        </span>
      </td>
      <td className="py-2 pr-2 text-iw-muted truncate max-w-[160px]">{pedido.observacao ?? "—"}</td>
      <td className="py-2">
        {proximo && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", pedido.id);
              fd.set("status", proximo);
              startTransition(() => {
                atualizarStatusPedidoMaterialAction(fd);
              });
            }}
            className="text-[11px] font-bold text-iw-blue hover:text-iw-navy transition-colors disabled:opacity-50"
          >
            {PROXIMO_STATUS_LABEL[proximo]}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function PedidosMaterialAdminPainel({ pedidos }: { pedidos: PedidoMaterialRow[] }) {
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  const visiveis = pedidos.filter((p) => mostrarCancelados || p.status !== "CANCELADO");
  const totalPendente = pedidos.filter((p) => p.status === "SOLICITADO" || p.status === "ENVIADO_GRAFICA").length;

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PackageSearch className="w-4 h-4 text-iw-gold" />
          <h2 className="font-bold text-iw-navy text-sm">Pedidos de material — visão consolidada</h2>
          {totalPendente > 0 && (
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {totalPendente} pendente(s)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMostrarCancelados((v) => !v)}
          className="text-xs font-bold text-iw-muted hover:text-iw-navy inline-flex items-center gap-1"
        >
          {mostrarCancelados ? "Ocultar" : "Mostrar"} cancelados <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {visiveis.length === 0 ? (
        <p className="text-xs text-iw-muted">
          Nenhum pedido de material registrado ainda — eles aparecem aqui assim que um professor pedir material pra
          próxima aula da turma dele.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-iw-border">
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Turma</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Aula</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Material</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase text-right">Alunos (ref.)</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase text-right">Qtd. pedida</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Status</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Obs.</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <LinhaPedido key={p.id} pedido={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
