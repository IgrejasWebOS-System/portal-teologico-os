// ============================================================
// Helpers compartilhados de geração de PDF institucional (cores,
// seções com caixa, grade de campos, cabeçalho com logo, rodapé).
//
// Extraído de matricula.ts (2026-09-18) pra poder ser reusado por
// outros geradores (ex.: fichaMembros.ts — impressão de Igrejas em
// /dashboard/configuracoes/igrejas) sem duplicar a mesma lógica de
// layout/cores. Nenhum valor foi alterado nessa extração — só
// mudou de arquivo.
// ============================================================

import {
  PDFDocument, PDFFont, PDFImage, PDFPage, rgb,
  pushGraphicsState, popGraphicsState, moveTo, appendBezierCurve, closePath, clip, endPath,
} from "pdf-lib";

export const marginX = 40;
export const rightEdge = 555;

// Fase 8 do BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md: cores oficiais do
// Manual de Identidade Visual CETADP v1.0 (preto #0D0D0D, dourado
// #CF8403), convertidas para escala 0–1 do pdf-lib.
export const navy = rgb(0x0d / 255, 0x0d / 255, 0x0d / 255); // #0D0D0D — preto institucional
export const gold = rgb(0xcf / 255, 0x84 / 255, 0x03 / 255); // #CF8403 — dourado institucional
// Pedido explícito do usuário: em RELATÓRIOS GERADOS EM PDF PARA IMPRESSÃO
// o texto auxiliar vira preto puro (#000000), não cinza — evita texto
// claro/desbotado na impressora. Vale só aqui, não no site.
export const muted = rgb(0, 0, 0);
export const borderCinza = rgb(0.8, 0.8, 0.8);

export const FOTO_AREA_LARGURA = 84;
export const FOTO_RAIO = 30;

// Dados institucionais do rodapé — os mesmos usados no rodapé público do
// site (PublicFooter.tsx) e no ícone de WhatsApp (FloatingSocialIcons.tsx).
export const INSTITUICAO = {
  sigla: "CETADP",
  nomeCompleto: "Centro Educacional Teológico das Assembleias de Deus Piracicaba",
  endereco: "Rua Alfredo Guedes, 1950 — Bairro Alto — Piracicaba — SP — 13.419-080",
  telefone: "(19) 99812-1950",
  site: "www.cetadp.teo.br",
};

// As datas chegam aqui em ISO (yyyy-mm-dd) vindas do banco. O formulário
// impresso é brasileiro, então sempre exibe dd/mm/aaaa.
export function isoParaBr(dataIso: string | null | undefined): string {
  if (!dataIso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataIso);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${dia}/${mes}/${ano}`;
}

export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Recorta a imagem num círculo e desenha com "cover" — a imagem preenche
// o círculo todo, cortando o excesso, sem esticar/distorcer o rosto.
export function desenharFotoCircular(page: PDFPage, img: PDFImage, cx: number, cy: number, raio: number) {
  const k = 0.5522847498;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx + raio, cy),
    appendBezierCurve(cx + raio, cy + raio * k, cx + raio * k, cy + raio, cx, cy + raio),
    appendBezierCurve(cx - raio * k, cy + raio, cx - raio, cy + raio * k, cx - raio, cy),
    appendBezierCurve(cx - raio, cy - raio * k, cx - raio * k, cy - raio, cx, cy - raio),
    appendBezierCurve(cx + raio * k, cy - raio, cx + raio, cy - raio * k, cx + raio, cy),
    closePath(),
    clip(),
    endPath()
  );
  const diam = raio * 2;
  const scale = Math.max(diam / img.width, diam / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, { x: cx - w / 2, y: cy - h / 2, width: w, height: h });
  page.pushOperators(popGraphicsState());
  page.drawEllipse({ x: cx, y: cy, xScale: raio, yScale: raio, borderColor: borderCinza, borderWidth: 1 });
}

// Abre uma seção: escreve o título dourado e devolve o topo da caixa (pra
// desenhar a borda depois, quando já soubermos onde o conteúdo terminou).
export function abrirSecao(
  page: PDFPage, y: number, titulo: string, fontBold: PDFFont, boxX: number = marginX
): { boxTop: number; y: number } {
  const boxTop = y;
  page.drawText(titulo.toUpperCase(), { x: boxX + 10, y: y - 13, size: 8, font: fontBold, color: gold });
  return { boxTop, y: y - 24 };
}

// Fecha a seção desenhando o retângulo em volta do que foi escrito entre
// abrirSecao() e aqui. Devolve o y de onde a próxima seção deve começar e
// o boxBottom (pra centralizar a foto verticalmente, se for o caso).
export function fecharSecao(
  page: PDFPage, boxTop: number, y: number, boxX: number = marginX
): { proximoY: number; boxBottom: number } {
  const boxBottom = y - 8;
  page.drawRectangle({
    x: boxX, y: boxBottom, width: rightEdge - boxX, height: boxTop - boxBottom,
    borderColor: borderCinza, borderWidth: 0.75,
  });
  return { proximoY: boxBottom - 14, boxBottom };
}

export interface Celula { label: string; valor: string }

// Grade de campos label/valor dentro de uma seção — preenchendo linha a
// linha. Devolve o y logo abaixo da grade.
export function desenharGrade(
  page: PDFPage, y: number, celulas: Celula[], cols: number, fontBold: PDFFont, font: PDFFont, boxX: number = marginX
): number {
  const areaLargura = rightEdge - boxX - 20;
  const colWidth = areaLargura / cols;
  const rowH = 26;
  celulas.forEach((c, i) => {
    const cx = boxX + 10 + (i % cols) * colWidth;
    const cy = y - Math.floor(i / cols) * rowH;
    page.drawText(c.label.toUpperCase(), { x: cx, y: cy, size: 6.5, font: fontBold, color: muted });
    page.drawText(c.valor || "—", {
      x: cx, y: cy - 11, size: 9, font, color: navy, maxWidth: colWidth - 8,
    });
  });
  const rows = Math.ceil(celulas.length / cols);
  return y - rows * rowH + 8;
}

export function quebrarEDesenharTexto(
  page: PDFPage, texto: string, x: number, yInicial: number, larguraMax: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>
): number {
  let y = yInicial;
  const palavras = texto.split(" ");
  let linhaAtual = "";
  const caberNaLinha = (linha: string) => font.widthOfTextAtSize(linha, size) <= larguraMax;
  for (const palavra of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (!caberNaLinha(teste) && linhaAtual) {
      page.drawText(linhaAtual, { x, y, size, font, color });
      y -= size + 4;
      linhaAtual = palavra;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) {
    page.drawText(linhaAtual, { x, y, size, font, color });
    y -= size + 4;
  }
  return y;
}

// Linha de texto centralizada entre marginX e rightEdge — usado no
// rodapé institucional.
export function desenharTextoCentralizado(
  page: PDFPage, texto: string, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>
) {
  const largura = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: marginX + (rightEdge - marginX - largura) / 2, y, size, font, color });
}

// Linha de texto encostada na margem direita.
export function desenharTextoAlinhadoDireita(
  page: PDFPage, texto: string, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>
) {
  const largura = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: rightEdge - largura, y, size, font, color });
}

// Carrega o arquivo oficial do logo (medalhão + lettering CETADP +
// faixa). Lê direto do disco (arquivo estático do repositório) — se o
// arquivo ainda não tiver sido copiado pra public/branding, falha em
// silêncio e o cabeçalho sai só com texto, sem quebrar o PDF.
export async function carregarLogoCabecalhoBytes(): Promise<Uint8Array | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    return await readFile(path.join(process.cwd(), "public", "branding", "logos", "logo-colorida.png"));
  } catch {
    return null;
  }
}

// Desenha o cabeçalho padrão (logo + título + subtítulo + linha dourada)
// usado em todo PDF institucional. Devolve o y logo abaixo da linha.
export async function desenharCabecalhoInstitucional(
  pdf: PDFDocument,
  page: PDFPage,
  titulo: string,
  fontBold: PDFFont,
  font: PDFFont,
  yInicial: number = 800
): Promise<number> {
  let y = yInicial;
  const logoBytes = await carregarLogoCabecalhoBytes();
  let tituloX = marginX;
  if (logoBytes) {
    try {
      const logoImg = await pdf.embedPng(logoBytes);
      const logoLado = 46;
      const escala = Math.max(logoLado / logoImg.width, logoLado / logoImg.height);
      const w = logoImg.width * escala;
      const h = logoImg.height * escala;
      const centroTexto = y - 5;
      page.drawImage(logoImg, { x: marginX, y: centroTexto - h / 2 + 1, width: w, height: h });
      tituloX = marginX + w + 10;
    } catch {
      // segue sem o logo no cabeçalho se a imagem vier corrompida
    }
  }
  page.drawText(`${INSTITUICAO.sigla} — ${titulo}`, { x: tituloX, y, size: 16, font: fontBold, color: navy });
  y -= 18;
  page.drawText(INSTITUICAO.nomeCompleto, { x: tituloX, y, size: 9, font, color: muted });
  y -= 6;
  page.drawLine({ start: { x: marginX, y: y - 3 }, end: { x: rightEdge, y: y - 3 }, thickness: 1.5, color: gold });
  y -= 20;
  return y;
}

// Rodapé institucional padrão (endereço + telefone/site), fixo perto do
// fim da página.
export function desenharRodapeInstitucional(page: PDFPage, font: PDFFont, footerTop: number = 50) {
  page.drawLine({ start: { x: marginX, y: footerTop }, end: { x: rightEdge, y: footerTop }, thickness: 0.75, color: borderCinza });
  let yf = footerTop - 14;
  desenharTextoCentralizado(page, INSTITUICAO.endereco, yf, 7, font, muted);
  yf -= 11;
  desenharTextoCentralizado(page, `Tel./WhatsApp: ${INSTITUICAO.telefone}  ·  ${INSTITUICAO.site}`, yf, 7, font, muted);
}
