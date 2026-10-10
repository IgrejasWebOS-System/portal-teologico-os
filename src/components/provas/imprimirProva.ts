import type { QuestaoItem } from "@/components/provas/TestesProvasPainel";

// ============================================================
// Impressão da prova/teste feito pelo link público — layout único usado pelo
// professor/secretaria (Testes e Provas) e pelo aluno (Impressão > Testes /
// Prova). 10/10/2026, pedido do Joaquim: aluno com o MESMO Visualizar/Imprimir
// do professor. Só roda no navegador (window.open).
// Layout: logo à esquerda; à direita, linha 1 = título + aluno/CPF, linha 2 =
// matéria + dados gerais; rodapé institucional em todas as páginas.
// @page margin 0 remove o cabeçalho/rodapé do navegador; as margens vêm do
// thead/tfoot.
// ============================================================

export function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

export function fmtCpf(cpf: string) {
  const d = soDigitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

export function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Cor do veredito (10/10/2026, pedido do Joaquim): ACERTOU verde, ERROU
// vermelho, ambos em negrito; o resto do texto é preto (#000000).
export const COR_ACERTOU = "#008000";
export const COR_ERROU = "#D00000";

export interface DadosImpressaoProva {
  alunoNome: string;
  // Dados da matrícula (substituem o CPF no cabeçalho).
  matricula: string;
  curso?: string;
  professorNome?: string;
  titulo: string;
  materia: string;
  enviadoEm: string;
  acertos: number;
  total: number;
  nota: number;
  aprovado: boolean;
  marcadas: Record<number, string>;
  questoes: QuestaoItem[];
}

export function imprimirProva(d: DadosImpressaoProva) {
  const corpo = d.questoes
    .map((q) => {
      const marcada = d.marcadas[q.ordem] || "";
      const ok = marcada === q.respostaCorreta;
      const opcoes = q.opcoes ? `<div class="op">${q.opcoes.map(escapeHtml).join(" &nbsp;|&nbsp; ")}</div>` : "";
      // Resultado na MESMA linha, logo após o enunciado.
      return `<div class="q"><b>${q.ordem}.</b> ${escapeHtml(q.enunciado)}
          (Marcada: <b>${marcada ? escapeHtml(marcada) : "em branco"}</b> &nbsp; Correta: <b>${escapeHtml(q.respostaCorreta)}</b> &nbsp; <b style="color:${ok ? COR_ACERTOU : COR_ERROU}">${ok ? "ACERTOU" : "ERROU"}</b>)${opcoes}</div>`;
    })
    .join("");
  const dadosMatricula = [`Matrícula: ${d.matricula || "—"}`, d.curso].filter(Boolean).join(" — ");
  const professor = d.professorNome ? ` — Professor: <b>${escapeHtml(d.professorNome)}</b>` : "";
  const logo = `${window.location.origin}/branding/logos/logo-colorida.png`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(d.titulo)}</title>
      <style>
        @page{size:A4;margin:0}
        *{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;font-size:12px;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .linha span:last-child{text-align:right}
        table.wrap{width:100%;border-collapse:collapse}
        .sp-top{height:12mm}.sp-bot{height:26mm}
        .conteudo{padding:0 14mm}
        .cab{display:flex;align-items:center;gap:14px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:6px}
        .cab img{width:70px;height:70px;object-fit:contain;flex:none}
        .cab .info{flex:1}
        .linha{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
        .linha+.linha{margin-top:4px}
        .titulo{font-size:15px;font-weight:bold}
        .q{border-bottom:1px solid #ccc;padding:7px 0;break-inside:avoid;font-size:11pt;color:#000}
        .op{margin:3px 0}
        .rodape{position:fixed;left:0;right:0;bottom:0;padding:6px 14mm 8mm;border-top:1px solid #000;text-align:center;font-size:10px;background:#fff}
      </style></head><body>
      <table class="wrap">
        <thead><tr><td><div class="sp-top"></div></td></tr></thead>
        <tfoot><tr><td><div class="sp-bot"></div></td></tr></tfoot>
        <tbody><tr><td><div class="conteudo">
          <div class="cab">
            <img src="${logo}" alt="CETADP" />
            <div class="info">
              <div class="linha"><span class="titulo">${escapeHtml(d.titulo)}</span><span>Aluno: <b>${escapeHtml(d.alunoNome)}</b> — ${escapeHtml(dadosMatricula)}</span></div>
              <div class="linha"><span>${escapeHtml(d.materia)}</span><span>Enviada em ${escapeHtml(fmtDataHora(d.enviadoEm))} — ${d.acertos}/${d.total} acertos — nota ${d.nota.toFixed(1)} — <b>${d.aprovado ? "APROVADO" : "REPROVADO"}</b>${professor}</span></div>
            </div>
          </div>
          ${corpo}
        </div></td></tr></tbody>
      </table>
      <div class="rodape">Rua Alfredo Guedes, 1950 — Bairro Alto — Piracicaba — SP — 13.419-080<br>Tel./WhatsApp: (19) 99812-1950 · www.cetadp.teo.br</div>
      <script>window.onload=function(){var i=document.querySelector('img');function p(){window.print()}if(i&&!i.complete){i.onload=p;i.onerror=p}else{p()}}<\/script></body></html>`);
  w.document.close();
}
