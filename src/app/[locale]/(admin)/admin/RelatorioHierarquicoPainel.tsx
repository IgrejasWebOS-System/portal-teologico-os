"use client";

import { useState } from "react";
import { LayoutList, ChevronRight, Church, X } from "lucide-react";

// ============================================================
// RelatorioHierarquicoPainel — 3ª correção do mesmo dia (01/10/2026).
//
// Histórico: v1 tinha 4 caixas separadas com <table> aninhada (quebrava
// alinhamento) → v2 juntou tudo numa caixa só, com seções em linha
// (sem accordion) → o Joaquim corrigiu: "quando falei desagrupar, me
// expressei errado". O que ele queria desde o início era o MESMO padrão
// já usado em Professores/Alunos (listas por Setor/Regional): só o
// título principal visível (Relatório Global/Sede/Setor/Regional) e,
// ao clicar, abre a relação completa — aqui, como modal (overlay com
// X pra fechar, igual às imagens de referência que ele mandou).
//
// Então: 4 linhas clicáveis (mesmo visual do accordion de Setor/
// Regional dessas outras telas) + modal com o conteúdo de cada
// relatório. Dentro do modal de Setor/Regional, cada setor/regional
// individual continua com o próprio accordion (clica pra ver as
// igrejas) — isso nunca mudou, é o padrão de linha em CSS Grid já
// comprovado em persona/turmas/page.tsx e AlunosListClient.tsx.
// ============================================================

type LinhaIgreja = { nome: string; basico: number; medio: number; aPagar: number; pago: number };
type GrupoSetor = { nome: string; igrejas: LinhaIgreja[]; subtotal: LinhaIgreja };

export interface RelatorioHierarquico {
  sede: LinhaIgreja;
  setores: GrupoSetor[];
  regionais: GrupoSetor[];
  global: {
    sede: LinhaIgreja;
    setor: { basico: number; medio: number; aPagar: number; pago: number };
    regional: { basico: number; medio: number; aPagar: number; pago: number };
    geral: { basico: number; medio: number; aPagar: number; pago: number };
  };
}

type TipoRelatorio = "GLOBAL" | "SEDE" | "SETOR" | "REGIONAL";

// Mesmo grid-cols usado no header e em TODAS as linhas (resumo, grupo e
// detalhe) — é isso que garante que as colunas numéricas sempre alinham.
const COLS = "grid-cols-[1.8fr_0.65fr_0.65fr_0.75fr_1fr_1fr_1.1fr]";

function fmtDin(centavos: number) {
  return centavos > 0
    ? "R$ " + (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : "—";
}

function CabecalhoColunas() {
  return (
    <div className={`grid ${COLS} gap-3 px-4 py-2 bg-iw-bg border-b border-iw-border`}>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Nome</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">Básico</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">Médio</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">Total</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">A Pagar</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">Pago</span>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right">Saldo Devedor</span>
    </div>
  );
}

function ValoresGrid({ linha, destaque }: { linha: LinhaIgreja; destaque?: boolean }) {
  const total = linha.basico + linha.medio;
  const saldo = linha.aPagar - linha.pago;
  return (
    <>
      <span className={`text-right ${destaque ? "font-bold text-iw-navy" : "text-iw-muted"}`}>{linha.basico}</span>
      <span className={`text-right ${destaque ? "font-bold text-iw-navy" : "text-iw-muted"}`}>{linha.medio}</span>
      <span className="text-right font-bold text-iw-navy">{total}</span>
      <span className="text-right text-iw-muted">{fmtDin(linha.aPagar)}</span>
      <span className="text-right text-iw-success">{fmtDin(linha.pago)}</span>
      <span className="text-right font-bold text-iw-error">{saldo !== 0 ? fmtDin(saldo) : "—"}</span>
    </>
  );
}

function LinhaSimples({ nome, linha, destaque }: { nome: string; linha: LinhaIgreja; destaque?: boolean }) {
  return (
    <div className={`grid ${COLS} gap-3 items-center px-4 py-2.5 border-b border-iw-border/60 last:border-b-0`}>
      <span className={`text-sm ${destaque ? "font-bold text-iw-navy" : "text-iw-navy"} truncate`}>{nome}</span>
      <ValoresGrid linha={linha} destaque={destaque} />
    </div>
  );
}

function LinhaTotal({ nome, linha }: { nome: string; linha: LinhaIgreja }) {
  return (
    <div className={`grid ${COLS} gap-3 items-center px-4 py-3 bg-iw-bg/70 border-t border-iw-border`}>
      <span className="text-sm font-black text-iw-navy uppercase">{nome}</span>
      <ValoresGrid linha={linha} destaque />
    </div>
  );
}

// Accordion por setor/regional individual (clica pra ver as igrejas) —
// usado DENTRO do modal de Setor/Regional, nunca mudou desde a 1ª versão.
function GrupoAccordion({ grupo }: { grupo: GrupoSetor }) {
  return (
    <details className="group/grupo border-b border-iw-border/60 last:border-b-0">
      <summary className={`cursor-pointer list-none grid ${COLS} gap-3 items-center px-4 py-2.5 hover:bg-iw-bg/50 transition-colors`}>
        <span className="text-sm font-bold text-iw-navy truncate inline-flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-iw-muted transition-transform group-open/grupo:rotate-90 shrink-0" />
          {grupo.nome}
          <span className="text-[11px] font-normal text-iw-muted">
            ({grupo.igrejas.length} núcleo{grupo.igrejas.length === 1 ? "" : "s"})
          </span>
        </span>
        <ValoresGrid linha={grupo.subtotal} destaque />
      </summary>
      <div className="bg-iw-bg/40">
        {grupo.igrejas.map((igreja) => (
          <div key={igreja.nome} className={`grid ${COLS} gap-3 items-center px-4 py-2 border-t border-iw-border/40`}>
            <span className="text-xs text-iw-muted truncate pl-5 inline-flex items-center gap-1.5">
              <Church className="w-3 h-3 shrink-0" /> {igreja.nome}
            </span>
            <ValoresGrid linha={igreja} />
          </div>
        ))}
      </div>
    </details>
  );
}

// Linha de título clicável na tela principal (mesmo visual do accordion
// de Setor/Regional em Professores/Alunos) — abre o modal com o
// relatório completo.
function LinhaTituloRelatorio({
  titulo,
  resumo,
  onClick,
}: {
  titulo: string;
  resumo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 bg-iw-surface border border-iw-gold rounded-2xl shadow-sm hover:bg-iw-bg/50 transition-colors text-left"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-iw-navy">
        <ChevronRight className="w-4 h-4" />
        {titulo}
      </span>
      <span className="text-xs font-semibold text-iw-muted">{resumo}</span>
    </button>
  );
}

function ModalRelatorio({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-iw-surface border border-iw-gold rounded-2xl shadow-xl">
        <div className="sticky top-0 flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border bg-iw-surface rounded-t-2xl">
          <h2 className="text-sm font-black text-iw-navy uppercase tracking-wide">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-iw-navy hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}

export default function RelatorioHierarquicoPainel({
  relatorio,
}: {
  relatorio: RelatorioHierarquico;
}) {
  const [modalAberto, setModalAberto] = useState<TipoRelatorio | null>(null);

  const totalSetorLinha: LinhaIgreja = { nome: "TOTAL SETOR", ...relatorio.global.setor };
  const totalRegionalLinha: LinhaIgreja = { nome: "TOTAL REGIONAL", ...relatorio.global.regional };
  const totalGeralLinha: LinhaIgreja = { nome: "TOTAL GERAL", ...relatorio.global.geral };

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <LayoutList className="w-5 h-5 text-iw-navy" />
        <h2 className="font-bold text-iw-navy text-base">Relatório Geral Individualizado</h2>
      </div>

      <LinhaTituloRelatorio
        titulo="Relatório Global"
        resumo={`${totalGeralLinha.basico + totalGeralLinha.medio} matrícula${totalGeralLinha.basico + totalGeralLinha.medio === 1 ? "" : "s"}`}
        onClick={() => setModalAberto("GLOBAL")}
      />
      <LinhaTituloRelatorio
        titulo="Relatório Sede"
        resumo={`${relatorio.sede.basico + relatorio.sede.medio} matrícula${relatorio.sede.basico + relatorio.sede.medio === 1 ? "" : "s"}`}
        onClick={() => setModalAberto("SEDE")}
      />
      <LinhaTituloRelatorio
        titulo="Relatório Setor"
        resumo={`${totalSetorLinha.basico + totalSetorLinha.medio} matrícula${totalSetorLinha.basico + totalSetorLinha.medio === 1 ? "" : "s"} · ${relatorio.setores.length} setor${relatorio.setores.length === 1 ? "" : "es"}`}
        onClick={() => setModalAberto("SETOR")}
      />
      <LinhaTituloRelatorio
        titulo="Relatório Regional"
        resumo={`${totalRegionalLinha.basico + totalRegionalLinha.medio} matrícula${totalRegionalLinha.basico + totalRegionalLinha.medio === 1 ? "" : "s"} · ${relatorio.regionais.length} regional${relatorio.regionais.length === 1 ? "" : "is"}`}
        onClick={() => setModalAberto("REGIONAL")}
      />

      {modalAberto === "GLOBAL" && (
        <ModalRelatorio titulo="Relatório Global" onClose={() => setModalAberto(null)}>
          <CabecalhoColunas />
          <LinhaSimples nome="SEDE" linha={relatorio.sede} />
          <LinhaSimples nome="SETOR" linha={{ nome: "SETOR", ...relatorio.global.setor }} />
          <LinhaSimples nome="REGIONAL" linha={{ nome: "REGIONAL", ...relatorio.global.regional }} />
          <LinhaTotal nome="Total geral" linha={totalGeralLinha} />
        </ModalRelatorio>
      )}

      {modalAberto === "SEDE" && (
        <ModalRelatorio titulo="Relatório Sede" onClose={() => setModalAberto(null)}>
          <CabecalhoColunas />
          <LinhaSimples nome="SEDE" linha={relatorio.sede} destaque />
        </ModalRelatorio>
      )}

      {modalAberto === "SETOR" && (
        <ModalRelatorio titulo="Relatório Setor" onClose={() => setModalAberto(null)}>
          {relatorio.setores.length === 0 ? (
            <p className="text-sm text-iw-muted px-4 py-6">Nenhum setor com registros.</p>
          ) : (
            <>
              <CabecalhoColunas />
              {relatorio.setores.map((g) => (
                <GrupoAccordion key={g.nome} grupo={g} />
              ))}
              <LinhaTotal nome="Total setor" linha={totalSetorLinha} />
            </>
          )}
        </ModalRelatorio>
      )}

      {modalAberto === "REGIONAL" && (
        <ModalRelatorio titulo="Relatório Regional" onClose={() => setModalAberto(null)}>
          {relatorio.regionais.length === 0 ? (
            <p className="text-sm text-iw-muted px-4 py-6">Nenhuma regional com registros.</p>
          ) : (
            <>
              <CabecalhoColunas />
              {relatorio.regionais.map((g) => (
                <GrupoAccordion key={g.nome} grupo={g} />
              ))}
              <LinhaTotal nome="Total regional" linha={totalRegionalLinha} />
            </>
          )}
        </ModalRelatorio>
      )}
    </div>
  );
}
