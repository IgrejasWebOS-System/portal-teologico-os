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

import { PDFDocument, PDFImage, StandardFonts } from "pdf-lib";
import { gerarQrCodePngBytes } from "@/utils/qrcode";
import {
  marginX, rightEdge, navy, muted, FOTO_AREA_LARGURA, FOTO_RAIO,
  isoParaBr, formatarCentavos, desenharFotoCircular, abrirSecao, fecharSecao, desenharGrade,
  quebrarEDesenharTexto, desenharTextoAlinhadoDireita, desenharCabecalhoInstitucional,
  desenharRodapeInstitucional, type Celula,
} from "./common";

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
  // Logo institucional completo + título + subtítulo + linha dourada —
  // helper compartilhado (ver common.ts), usado também pelas fichas de
  // membros por igreja.
  y = await desenharCabecalhoInstitucional(pdf, page, "Formulário de Matrícula", fontBold, font, y);

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

    // Nome completo em linha própria, com a largura cheia da caixa — em
    // 1/3 da largura (como as demais células) nomes compostos longos
    // (ex.: "LUCIA HELENA BATISTA SOARES") estouravam e o sobrenome caía
    // pra linha de baixo, invadindo a célula seguinte. Pedido explícito do
    // usuário: usar o espaço livre do lado direito da caixa.
    let yGrade = secao.y;
    page.drawText("NOME COMPLETO", { x: marginX + 10, y: yGrade, size: 6.5, font: fontBold, color: muted });
    page.drawText(dados.nomeCompleto || "—", {
      x: marginX + 10, y: yGrade - 11, size: 9.5, font, color: navy, maxWidth: rightEdge - marginX - 30,
    });
    yGrade -= 26;

    const celulas: Celula[] = [
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
    const yFinal = desenharGrade(page, yGrade, celulas, 3, fontBold, font);
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

  // Posições fixas da faixa final da página — de baixo pra cima: rodapé,
  // assinatura (só 2 linhas acima do rodapé) e QR Code + legenda,
  // encostados na margem direita. footerTop mais baixo que antes (pedido
  // explícito), com tudo mais recalculado em cascata a partir dele.
  const footerTop = 50;

  // ── QR Code de consulta (acima do rodapé, lado direito) ─────
  // Codifica só o número da matrícula (não um link) — é o que dá pra
  // conferir sem inventar URL de verificação pública, que este sistema
  // não tem. Fica encostado na margem direita — testado com o formulário
  // impresso na mão, de frente: o QR precisa estar do lado direito da folha.
  const qrLado = 48;
  const qrY = footerTop + 14; // base do QR — deixa espaço abaixo pro nº da matrícula sem encostar no rodapé
  const qrX = rightEdge - qrLado;
  try {
    const qrBytes = await gerarQrCodePngBytes(dados.matricula);
    const qrImg = await pdf.embedPng(qrBytes);
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrLado, height: qrLado });
    const numLargura = fontBold.widthOfTextAtSize(dados.matricula, 6);
    page.drawText(dados.matricula, {
      x: qrX + (qrLado - numLargura) / 2, y: qrY - 11, size: 6, font: fontBold, color: navy,
    });
  } catch {
    // sem QR no PDF se a geração falhar — não deve travar o documento
  }

  // Legenda acima do QR Code — encostada na margem direita (mesma coluna
  // do QR), não centralizada na página inteira: fica ACIMA do QR, não ao
  // lado/alinhada com ele.
  const qrTopo = qrY + qrLado;
  desenharTextoAlinhadoDireita(page, "Consulta rápida matrícula.", qrTopo + 26, 7, font, muted);
  desenharTextoAlinhadoDireita(page, "Histórico aluno", qrTopo + 17, 7, font, muted);
  desenharTextoAlinhadoDireita(page, "login e senha no Portal EAD-CETADP", qrTopo + 8, 7, font, muted);

  // ── Assinatura para impressão (sem assinatura eletrônica) ───
  // Só aparece quando o aluno não assinou digitalmente na hora do
  // cadastro — uma linha em branco, alinhada à esquerda, ficando só ~2
  // linhas de texto acima do rodapé (pedido explícito).
  if (!assinaturaPngBytes) {
    const sigY = footerTop + 24;
    page.drawLine({ start: { x: marginX, y: sigY }, end: { x: marginX + 220, y: sigY }, thickness: 0.5, color: muted });
    page.drawText("Assinatura do Aluno", { x: marginX, y: sigY - 11, size: 7.5, font, color: muted });
  }

  // ── Rodapé institucional ────────────────────────────────────
  // Posição fixa perto do fim da página (não depende do conteúdo acima —
  // as seções de cima sempre deixam espaço de sobra abaixo delas, dado o
  // tamanho fixo de A4 usado aqui). Centralizado, sem repetir o nome da
  // instituição (já aparece no cabeçalho).
  desenharRodapeInstitucional(page, font, footerTop);

  return pdf.save();
}
