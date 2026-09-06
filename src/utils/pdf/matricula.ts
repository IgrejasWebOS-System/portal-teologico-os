// ============================================================
// Geração do PDF do formulário de matrícula, com a assinatura
// eletrônica (canvas) do aluno embutida + metadados de evidência
// (IP, user-agent, data/hora) — usado logo após a Confirmação de
// Cadastro (ver confirmar-cadastro/[id]/actions.ts).
//
// Layout em seções com caixa (Curso e Vínculo / Dados Pessoais /
// Endereço / Pagamento / Consentimento LGPD), espelhando o
// formulário de cadastro (ver "matriz ficha matricula.pdf" — o
// print do próprio formulário admin usado como referência visual).
// A foto do aluno fica ao lado esquerdo do quadro "Curso e Vínculo",
// circular, igual ao card do formulário admin.
//
// pdf-lib não depende de Chromium/Puppeteer, então roda tranquilo
// em ambiente serverless (Vercel) sem binário externo.
// ============================================================

import {
  PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb,
  pushGraphicsState, popGraphicsState, moveTo, appendBezierCurve, closePath, clip, endPath,
} from "pdf-lib";
import { gerarQrCodePngBytes } from "@/utils/qrcode";

export interface DadosPagamentoPdf {
  // Valor da matrícula em separado (ex.: Curso Básico) — 0/null quando o
  // curso não cobra matrícula à parte (ex.: Curso Médio, só mensalidade).
  // undefined = não foi possível apurar o recorte exato (cobrança única
  // via link de pagamento) — nesse caso o PDF mostra só o total, sem
  // marcar "isento" (isento é uma afirmação, não pode ser um chute).
  valorMatriculaCentavos?: number | null;
  valorParcelaCentavos: number;
  parcelas: number;
  formaPagamento?: string | null;
  responsavelPagamento?: string | null;
  primeiroVencimento?: string | null;
}

export interface DadosMatriculaPdf {
  nomeCompleto: string;
  matricula: string;
  cursoPretendido?: string | null;
  cpf?: string | null;
  email: string;
  telefone?: string | null;
  dataNascimento?: string | null;
  rg?: string | null;
  rgOrgaoEmissor?: string | null;
  rgUf?: string | null;
  genero?: string | null;
  estadoCivil?: string | null;
  escolaridade?: string | null;
  profissao?: string | null;
  naturalidadeCidade?: string | null;
  naturalidadeEstado?: string | null;
  nacionalidade?: string | null;
  nomeConjuge?: string | null;
  nomeMae?: string | null;
  nomePai?: string | null;
  cep?: string | null;
  endereco?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  // Curso e vínculo — opcionais porque nem toda origem de cadastro
  // já tem turma/professor/campo definidos no momento da geração.
  turmaNome?: string | null;
  professorNome?: string | null;
  campoMinisterio?: string | null;
  setorNome?: string | null;
  igrejaNome?: string | null;
  // Pagamento — ausente quando a matrícula não tem cobrança (ex.:
  // regularização de aluno que já estuda, feita via link/QR Code).
  pagamento?: DadosPagamentoPdf | null;
}

export interface EvidenciaAssinatura {
  ip: string;
  userAgent: string;
  assinadoEm: Date;
}

const marginX = 40;
const rightEdge = 555;
const navy = rgb(0.05, 0.09, 0.2);
const gold = rgb(0.55, 0.42, 0.09);
const muted = rgb(0.45, 0.45, 0.47);
const borderCinza = rgb(0.8, 0.8, 0.8);

// Largura reservada à esquerda pra foto circular, só na seção "Curso e
// Vínculo" (as demais seções seguem com a largura cheia da página).
const FOTO_AREA_LARGURA = 84;
const FOTO_RAIO = 30;

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// As datas chegam aqui em ISO (yyyy-mm-dd — formato de banco/input nativo)
// vindas de qualquer um dos três fluxos de matrícula. O formulário impresso
// é brasileiro, então sempre exibe dd/mm/aaaa — nunca o ISO cru. Se o valor
// já vier em outro formato (ou vazio), devolve como está, sem quebrar.
function isoParaBr(dataIso: string | null | undefined): string {
  if (!dataIso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataIso);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${dia}/${mes}/${ano}`;
}

// Dados institucionais do rodapé — os mesmos usados no rodapé público do
// site (PublicFooter.tsx) e no ícone de WhatsApp (FloatingSocialIcons.tsx),
// centralizados aqui pra não digitar de novo/divergir.
const INSTITUICAO = {
  sigla: "CETADP",
  nomeCompleto: "Centro Educacional Teológico das Assembleias de Deus Piracicaba",
  endereco: "Rua Alfredo Guedes, 1950 — Bairro Alto — Piracicaba — SP — 13.419-080",
  telefone: "(19) 99812-1950",
  site: "www.cetadp.teo.br",
};

// Recorta a imagem num círculo (técnica padrão do pdf-lib: aproxima o
// círculo com 4 curvas de Bézier e usa como caminho de clip) e desenha
// com "cover" — a imagem preenche o círculo todo, cortando o excesso,
// sem esticar/distorcer o rosto da pessoa.
function desenharFotoCircular(page: PDFPage, img: PDFImage, cx: number, cy: number, raio: number) {
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
// boxX permite encolher a caixa pela esquerda (usado só em "Curso e
// Vínculo" quando há foto reservando espaço ao lado).
function abrirSecao(page: PDFPage, y: number, titulo: string, fontBold: PDFFont, boxX: number = marginX): { boxTop: number; y: number } {
  const boxTop = y;
  page.drawText(titulo.toUpperCase(), { x: boxX + 10, y: y - 13, size: 8, font: fontBold, color: gold });
  return { boxTop, y: y - 24 };
}

// Fecha a seção desenhando o retângulo em volta do que foi escrito entre
// abrirSecao() e aqui. Devolve o y de onde a próxima seção deve começar e
// o boxBottom (pra centralizar a foto verticalmente, no caso da 1ª seção).
function fecharSecao(page: PDFPage, boxTop: number, y: number, boxX: number = marginX): { proximoY: number; boxBottom: number } {
  const boxBottom = y - 8;
  page.drawRectangle({
    x: boxX, y: boxBottom, width: rightEdge - boxX, height: boxTop - boxBottom,
    borderColor: borderCinza, borderWidth: 0.75,
  });
  return { proximoY: boxBottom - 14, boxBottom };
}

interface Celula { label: string; valor: string }

// Grade de campos label/valor dentro de uma seção — preenchendo linha a
// linha. Devolve o y logo abaixo da grade.
function desenharGrade(
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

function quebrarEDesenharTexto(
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

export async function gerarPdfMatricula(
  dados: DadosMatriculaPdf,
  assinaturaPngBytes: Uint8Array | null,
  evidencia: EvidenciaAssinatura,
  fotoBytes?: Uint8Array | null
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 800;

  // ── Cabeçalho ──────────────────────────────────────────────
  page.drawText(`${INSTITUICAO.sigla} — Formulário de Matrícula`, { x: marginX, y, size: 16, font: fontBold, color: navy });
  y -= 18;
  page.drawText(INSTITUICAO.nomeCompleto, { x: marginX, y, size: 9, font, color: muted });
  y -= 6;
  page.drawLine({ start: { x: marginX, y }, end: { x: rightEdge, y }, thickness: 1.5, color: gold });
  y -= 20;

  // Foto do aluno — carregada uma vez aqui, desenhada mais abaixo, ao lado
  // esquerdo do quadro "Curso e Vínculo" (em vez de solta no cabeçalho).
  let fotoImg: PDFImage | null = null;
  if (fotoBytes && fotoBytes.length > 0) {
    try {
      try {
        fotoImg = await pdf.embedJpg(fotoBytes);
      } catch {
        fotoImg = await pdf.embedPng(fotoBytes);
      }
    } catch {
      fotoImg = null; // segue sem foto no PDF
    }
  }
  const cursoBoxX = fotoImg ? marginX + FOTO_AREA_LARGURA : marginX;

  // ── Curso e vínculo ────────────────────────────────────────
  {
    const secao = abrirSecao(page, y, "Curso e vínculo", fontBold, cursoBoxX);
    const celulas: Celula[] = [
      { label: "Matrícula", valor: dados.matricula },
      { label: "Curso", valor: dados.cursoPretendido ?? "" },
      { label: "Turma", valor: dados.turmaNome ?? "" },
      { label: "Professor(a)", valor: dados.professorNome ?? "" },
      { label: "Campo / Ministério", valor: dados.campoMinisterio ?? "" },
      { label: "Setor / Igreja", valor: [dados.setorNome, dados.igrejaNome].filter(Boolean).join(" — ") },
    ];
    const yFinal = desenharGrade(page, secao.y, celulas, 3, fontBold, font, cursoBoxX);
    const fechado = fecharSecao(page, secao.boxTop, yFinal, cursoBoxX);
    if (fotoImg) {
      const cx = marginX + FOTO_RAIO + 2;
      const cy = (secao.boxTop + fechado.boxBottom) / 2;
      desenharFotoCircular(page, fotoImg, cx, cy, FOTO_RAIO);
    }
    y = fechado.proximoY;
  }

  // ── Dados pessoais ─────────────────────────────────────────
  {
    const secao = abrirSecao(page, y, "Dados pessoais", fontBold);
    const celulas: Celula[] = [
      { label: "Nome completo", valor: dados.nomeCompleto },
      { label: "CPF", valor: dados.cpf ?? "" },
      { label: "Data de nascimento", valor: isoParaBr(dados.dataNascimento) },
      { label: "E-mail", valor: dados.email },
      { label: "Telefone", valor: dados.telefone ?? "" },
      { label: "RG", valor: [dados.rg, dados.rgOrgaoEmissor, dados.rgUf].filter(Boolean).join(" / ") },
      { label: "Sexo", valor: dados.genero ?? "" },
      { label: "Estado civil", valor: dados.estadoCivil ?? "" },
      { label: "Escolaridade", valor: dados.escolaridade ?? "" },
      { label: "Profissão", valor: dados.profissao ?? "" },
      { label: "Naturalidade", valor: [dados.naturalidadeCidade, dados.naturalidadeEstado].filter(Boolean).join(" / ") },
      { label: "Nacionalidade", valor: dados.nacionalidade ?? "" },
      { label: "Cônjuge", valor: dados.nomeConjuge ?? "" },
      { label: "Nome da mãe", valor: dados.nomeMae ?? "" },
      { label: "Nome do pai", valor: dados.nomePai ?? "" },
    ];
    const yFinal = desenharGrade(page, secao.y, celulas, 3, fontBold, font);
    y = fecharSecao(page, secao.boxTop, yFinal).proximoY;
  }

  // ── Endereço ───────────────────────────────────────────────
  // CEP/Endereço/Número e Complemento/Bairro/Cidade-UF em células
  // separadas — junto num texto só, o número ficava sumindo/deslocado
  // quando o nome da rua era comprido.
  {
    const secao = abrirSecao(page, y, "Endereço", fontBold);
    const celulas: Celula[] = [
      { label: "CEP", valor: dados.cep ?? "" },
      { label: "Endereço", valor: dados.endereco ?? "" },
      { label: "Número", valor: dados.enderecoNumero ?? "" },
      { label: "Complemento", valor: dados.enderecoComplemento ?? "" },
      { label: "Bairro", valor: dados.bairro ?? "" },
      { label: "Cidade / UF", valor: [dados.cidade, dados.estado].filter(Boolean).join(" / ") },
    ];
    const yFinal = desenharGrade(page, secao.y, celulas, 3, fontBold, font);
    y = fecharSecao(page, secao.boxTop, yFinal).proximoY;
  }

  // ── Pagamento ──────────────────────────────────────────────
  // Antes disto, a grade mostrava um único "Valor (por parcela)" que na
  // prática recebia o TOTAL (matrícula + todas as parcelas somadas) — rótulo
  // errado, confundia a leitura. Agora mostra matrícula e parcela separadas
  // (quando conhecidas) + o total calculado, e marca "Isento de taxa de
  // matrícula" em negrito só quando sabemos de verdade que não há matrícula
  // (valorMatriculaCentavos === 0) — nunca quando o valor é desconhecido.
  {
    const secao = abrirSecao(page, y, "Pagamento", fontBold);
    let yFinal: number;
    if (dados.pagamento) {
      const p = dados.pagamento;
      const temMatricula = typeof p.valorMatriculaCentavos === "number" && p.valorMatriculaCentavos > 0;
      const isento = p.valorMatriculaCentavos === 0;
      const valorTotalCentavos = (p.valorMatriculaCentavos ?? 0) + p.valorParcelaCentavos * p.parcelas;

      let yGrade = secao.y;
      if (isento) {
        page.drawText(
          `${(dados.cursoPretendido ?? "Curso").toUpperCase()} — ISENTO DE TAXA DE MATRÍCULA`,
          { x: marginX + 10, y: yGrade, size: 8.5, font: fontBold, color: navy }
        );
        yGrade -= 18;
      }

      const celulas: Celula[] = [
        ...(temMatricula ? [{ label: "Valor da matrícula", valor: formatarCentavos(p.valorMatriculaCentavos!) }] : []),
        { label: "Valor da parcela", valor: formatarCentavos(p.valorParcelaCentavos) },
        { label: "Parcelas", valor: String(p.parcelas) },
        { label: "Valor total", valor: formatarCentavos(valorTotalCentavos) },
        { label: "1º vencimento", valor: isoParaBr(p.primeiroVencimento) },
        { label: "Forma de pagamento", valor: p.formaPagamento ?? "" },
        { label: "Quem paga", valor: p.responsavelPagamento ?? "" },
      ];
      yFinal = desenharGrade(page, yGrade, celulas, 3, fontBold, font);
    } else {
      page.drawText("Sem cobrança registrada para esta matrícula.", {
        x: marginX + 10, y: secao.y, size: 9, font, color: muted,
      });
      yFinal = secao.y - 14;
    }
    y = fecharSecao(page, secao.boxTop, yFinal).proximoY;
  }

  // ── Consentimento LGPD + assinatura ────────────────────────
  {
    const secao = abrirSecao(page, y, "Consentimento LGPD", fontBold);
    let yc = secao.y;

    // Identificação no fechamento do formulário — nome do aluno e do
    // professor responsável repetidos aqui (já aparecem também na grade de
    // "Curso e vínculo" lá em cima), pedido explícito pra deixar claro quem
    // assina/confirma o quê na seção final do PDF.
    page.drawText(`Aluno: ${dados.nomeCompleto}`, { x: marginX + 10, y: yc, size: 9, font: fontBold, color: navy });
    yc -= 13;
    page.drawText(`Professor(a) responsável: ${dados.professorNome ?? "—"}`, {
      x: marginX + 10, y: yc, size: 9, font: fontBold, color: navy,
    });
    yc -= 16;

    const declaracao =
      "Declaro estar ciente das informações acima e autorizo o uso e tratamento dos meus dados pessoais " +
      "para cadastro, de acordo com os artigos 7º e 11 da Lei nº 13.709/2018 (LGPD).";
    yc = quebrarEDesenharTexto(page, declaracao, marginX + 10, yc, rightEdge - marginX - 20, 9, font, muted);
    yc -= 6;

    if (assinaturaPngBytes) {
      try {
        const assinaturaImg = await pdf.embedPng(assinaturaPngBytes);
        const w = 140;
        const h = (assinaturaImg.height / assinaturaImg.width) * w;
        page.drawImage(assinaturaImg, { x: marginX + 10, y: yc - h, width: w, height: h });
        yc -= h + 4;
      } catch {
        // sem assinatura embutida se a imagem vier corrompida — segue com os
        // metadados de evidência mesmo assim
      }
      page.drawLine({ start: { x: marginX + 10, y: yc }, end: { x: marginX + 230, y: yc }, thickness: 0.5, color: muted });
      yc -= 11;
      page.drawText("Assinatura eletrônica do aluno", { x: marginX + 10, y: yc, size: 7.5, font, color: muted });
      yc -= 12;
      const dataFormatada = evidencia.assinadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      page.drawText(`Assinado eletronicamente em ${dataFormatada} — IP ${evidencia.ip}`, {
        x: marginX + 10, y: yc, size: 6.5, font, color: muted,
      });
      yc -= 9;
      const uaTruncado = evidencia.userAgent.length > 110 ? `${evidencia.userAgent.slice(0, 110)}...` : evidencia.userAgent;
      page.drawText(`Dispositivo: ${uaTruncado}`, { x: marginX + 10, y: yc, size: 6.5, font, color: muted });
      yc -= 9;
      yc = quebrarEDesenharTexto(
        page,
        "Documento gerado eletronicamente pelo sistema de matrícula do CETADP — assinatura eletrônica simples, nos termos do art. 10, §2º da MP 2.200-2/2001.",
        marginX + 10, yc, rightEdge - marginX - 20, 6.5, font, muted
      );
    } else {
      page.drawText("Formulário concluído sem assinatura eletrônica.", { x: marginX + 10, y: yc, size: 8.5, font, color: muted });
      yc -= 14;
    }
    fecharSecao(page, secao.boxTop, yc);
  }

  // ── Assinatura para impressão (sem assinatura eletrônica) ───
  // Só aparece quando o aluno não assinou digitalmente na hora do
  // cadastro — uma linha em branco, alinhada à esquerda, antes do
  // rodapé, pra assinar à caneta depois de impresso.
  if (!assinaturaPngBytes) {
    const sigY = 168;
    page.drawLine({ start: { x: marginX, y: sigY }, end: { x: marginX + 220, y: sigY }, thickness: 0.5, color: muted });
    page.drawText("Assinatura do Aluno (após impressão)", { x: marginX, y: sigY - 11, size: 7.5, font, color: muted });
  }

  // ── QR Code de consulta (acima do rodapé, lado direito) ─────
  // Codifica só o número da matrícula (não um link) — é o que dá pra
  // conferir sem inventar URL de verificação pública, que este sistema
  // não tem. Quem escanear vê o texto puro "CETADP-AAAA-NNNN"; a nota à
  // esquerda do QR deixa claro que o histórico completo só é visto no
  // Portal do Aluno, com login e senha.
  // Fica encostado na margem direita — testado com o formulário impresso
  // na mão, de frente: o QR precisa estar do lado direito da folha.
  try {
    const qrBytes = await gerarQrCodePngBytes(dados.matricula);
    const qrImg = await pdf.embedPng(qrBytes);
    const qrLado = 48;
    const qrY = 92; // base do QR — deixa espaço abaixo pro nº da matrícula sem encostar no rodapé
    const qrX = rightEdge - qrLado;
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrLado, height: qrLado });
    const numLargura = fontBold.widthOfTextAtSize(dados.matricula, 6);
    page.drawText(dados.matricula, {
      x: qrX + (qrLado - numLargura) / 2, y: qrY - 11, size: 6, font: fontBold, color: navy,
    });
    quebrarEDesenharTexto(
      page,
      "Consulta rápida da matrícula. O histórico completo do aluno só é acessado com login e senha no Portal do Aluno.",
      marginX, qrY + qrLado - 8, qrX - marginX - 10, 6.5, font, muted
    );
  } catch {
    // sem QR no PDF se a geração falhar — não deve travar o documento
  }

  // ── Rodapé institucional ────────────────────────────────────
  // Posição fixa perto do fim da página (não depende do conteúdo acima —
  // as seções de cima sempre deixam espaço de sobra abaixo delas, dado o
  // tamanho fixo de A4 usado aqui). Centralizado, sem repetir o nome da
  // instituição (já aparece no cabeçalho).
  {
    const footerTop = 78;
    page.drawLine({ start: { x: marginX, y: footerTop }, end: { x: rightEdge, y: footerTop }, thickness: 0.75, color: borderCinza });
    const centralizar = (texto: string, yPos: number, size: number, f: PDFFont, color: ReturnType<typeof rgb>) => {
      const largura = f.widthOfTextAtSize(texto, size);
      page.drawText(texto, { x: marginX + (rightEdge - marginX - largura) / 2, y: yPos, size, font: f, color });
    };
    let yf = footerTop - 14;
    centralizar(INSTITUICAO.endereco, yf, 7, font, muted);
    yf -= 11;
    centralizar(`Tel./WhatsApp: ${INSTITUICAO.telefone}  ·  ${INSTITUICAO.site}`, yf, 7, font, muted);
  }

  return pdf.save();
}
