// ============================================================
// Geração da "Ficha Cadastral" de membros por igreja — pedido do
// Joaquim em 2026-09-18, a partir do botão "Membros" na lista de
// Igrejas (/dashboard/configuracoes/igrejas). Duas variantes:
//
// - Resumida: lista compacta (vários membros por página), no
//   critério dos PDFs de origem usados na extração (MODELO FICHA
//   RESUMIDA.pdf) — cargo + nome, estado civil/nascimento/telefone,
//   endereço.
// - Completa: um cartão por página, com todos os dados pessoais que
//   o cadastro tem (CPF, RG, endereço completo, cônjuge, nome da
//   mãe/pai, escolaridade, profissão, nacionalidade) — mesmo padrão
//   visual do formulário de matrícula (ver matricula.ts), mas sem os
//   campos de curso/turma/pagamento, que não existem neste contexto.
//
// Ambas usam os helpers de layout compartilhados em common.ts.
// ============================================================

import { PDFDocument, PDFImage, StandardFonts } from "pdf-lib";
import {
  marginX, rightEdge, navy, muted, borderCinza, FOTO_AREA_LARGURA, FOTO_RAIO, INSTITUICAO,
  isoParaBr, desenharFotoCircular, abrirSecao, fecharSecao, desenharGrade,
  desenharCabecalhoInstitucional, desenharRodapeInstitucional, type Celula,
} from "./common";

export interface MembroFichaDados {
  fullName: string;
  matricula: string | null;
  cargo: string | null;
  civilStatus: string | null;
  birthDate: string | null; // ISO yyyy-mm-dd
  phone: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  rgIssuer: string | null;
  rgState: string | null;
  schooling: string | null;
  profession: string | null;
  nationality: string | null;
  nationalityCity: string | null;
  nationalityState: string | null;
  spouseName: string | null;
  motherName: string | null;
  fatherName: string | null;
  address: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
}

const PAGE: [number, number] = [595.28, 841.89]; // A4

function calcularIdade(dataIso: string | null): number | null {
  if (!dataIso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataIso);
  if (!m) return null;
  const nascimento = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

// ── Ficha Resumida ───────────────────────────────────────────
export async function gerarPdfFichaResumida(
  igrejaNome: string,
  setorNome: string | null,
  membros: MembroFichaDados[]
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const footerTop = 50;
  const total = membros.length;

  let page = pdf.addPage(PAGE);
  let y = await desenharCabecalhoInstitucional(pdf, page, "Ficha Cadastral Resumida", fontBold, font, 800);
  page.drawText([igrejaNome, setorNome].filter(Boolean).join(" — "), {
    x: marginX, y, size: 11, font: fontBold, color: navy,
  });
  y -= 20;

  const rowH = 42;

  const paginasAnteriores: (typeof page)[] = [];

  function novaPagina() {
    paginasAnteriores.push(page);
    page = pdf.addPage(PAGE);
    y = 800;
    page.drawText(
      `${INSTITUICAO.sigla} — Ficha Cadastral Resumida (continuação) — ${igrejaNome}`,
      { x: marginX, y, size: 9, font: fontBold, color: navy }
    );
    y -= 18;
  }

  for (const m of membros) {
    if (y - rowH < footerTop + 20) {
      novaPagina();
    }
    const idade = calcularIdade(m.birthDate);

    const linha1 = `${m.cargo ? `[${m.cargo}] ` : ""}${m.fullName}`;
    page.drawText(linha1, {
      x: marginX, y, size: 9.5, font: fontBold, color: navy, maxWidth: rightEdge - marginX - 90,
    });
    if (m.matricula) {
      const largura = font.widthOfTextAtSize(m.matricula, 8);
      page.drawText(m.matricula, { x: rightEdge - largura, y, size: 8, font, color: muted });
    }
    y -= 12;

    const linha2 = [
      m.civilStatus,
      m.birthDate ? `${isoParaBr(m.birthDate)}${idade !== null ? ` (${idade})` : ""}` : null,
      m.phone,
    ].filter(Boolean).join("  |  ");
    page.drawText(linha2 || "—", { x: marginX, y, size: 8, font, color: muted });
    y -= 11;

    const enderecoLinha1 = [m.address, m.neighborhood].filter(Boolean).join(" - ");
    const enderecoLinha2 = [m.city, m.state].filter(Boolean).join(" / ");
    const linhaEndereco = [enderecoLinha1, enderecoLinha2].filter(Boolean).join("  —  ");
    page.drawText(linhaEndereco || "—", {
      x: marginX, y, size: 8, font, color: muted, maxWidth: rightEdge - marginX,
    });
    y -= 9;

    page.drawLine({ start: { x: marginX, y }, end: { x: rightEdge, y }, thickness: 0.4, color: borderCinza });
    y -= 10;
  }

  const yTotal = Math.max(y, footerTop + 30);
  page.drawText(`Total: ${total} membro${total !== 1 ? "s" : ""}`, {
    x: marginX, y: yTotal, size: 9, font: fontBold, color: navy,
  });

  for (const p of [...paginasAnteriores, page]) {
    desenharRodapeInstitucional(p, font, footerTop);
  }

  return pdf.save();
}

// ── Ficha Completa ───────────────────────────────────────────
export async function gerarPdfFichaCompleta(
  igrejaNome: string,
  setorNome: string | null,
  membros: MembroFichaDados[]
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const total = membros.length;

  for (let i = 0; i < membros.length; i++) {
    const m = membros[i];
    const page = pdf.addPage(PAGE);
    let y = await desenharCabecalhoInstitucional(pdf, page, "Ficha Cadastral Completa", fontBold, font, 800);

    page.drawText([igrejaNome, setorNome].filter(Boolean).join(" — "), {
      x: marginX, y, size: 10, font: fontBold, color: navy,
    });
    y -= 12;
    page.drawText(`Membro ${i + 1} de ${total}${m.cargo ? `  ·  Cargo: ${m.cargo}` : ""}`, {
      x: marginX, y, size: 8, font, color: muted,
    });
    y -= 16;

    // Foto — carregada da URL pública (Supabase Storage). Se falhar (sem
    // foto, URL fora do ar, etc.), segue sem foto — nunca quebra o PDF.
    let fotoImg: PDFImage | null = null;
    if (m.photoUrl) {
      try {
        const resp = await fetch(m.photoUrl);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          try {
            fotoImg = await pdf.embedJpg(bytes);
          } catch {
            fotoImg = await pdf.embedPng(bytes);
          }
        }
      } catch {
        fotoImg = null;
      }
    }
    const boxX = fotoImg ? marginX + FOTO_AREA_LARGURA : marginX;

    // ── Dados pessoais ──────────────────────────────────────
    {
      const secao = abrirSecao(page, y, "Dados pessoais", fontBold, boxX);
      let yGrade = secao.y;
      page.drawText("NOME COMPLETO", { x: boxX + 10, y: yGrade, size: 6.5, font: fontBold, color: muted });
      page.drawText(m.fullName || "—", {
        x: boxX + 10, y: yGrade - 11, size: 9.5, font, color: navy, maxWidth: rightEdge - boxX - 30,
      });
      yGrade -= 26;

      const celulas: Celula[] = [
        { label: "Matrícula", valor: m.matricula ?? "" },
        { label: "CPF", valor: m.cpf ?? "" },
        { label: "Data de nascimento", valor: isoParaBr(m.birthDate) },
        { label: "E-mail", valor: m.email ?? "" },
        { label: "Telefone", valor: m.phone ?? "" },
        { label: "RG", valor: [m.rg, m.rgIssuer, m.rgState].filter(Boolean).join(" / ") },
        { label: "Estado civil", valor: m.civilStatus ?? "" },
        { label: "Escolaridade", valor: m.schooling ?? "" },
        { label: "Profissão", valor: m.profession ?? "" },
        { label: "Naturalidade", valor: [m.nationalityCity, m.nationalityState].filter(Boolean).join(" / ") },
        { label: "Nacionalidade", valor: m.nationality ?? "" },
        { label: "Cônjuge", valor: m.spouseName ?? "" },
        { label: "Nome da mãe", valor: m.motherName ?? "" },
        { label: "Nome do pai", valor: m.fatherName ?? "" },
      ];
      const yFinal = desenharGrade(page, yGrade, celulas, 3, fontBold, font, boxX);
      const fechado = fecharSecao(page, secao.boxTop, yFinal, boxX);
      if (fotoImg) {
        const cx = marginX + FOTO_RAIO + 2;
        const cy = (secao.boxTop + fechado.boxBottom) / 2;
        desenharFotoCircular(page, fotoImg, cx, cy, FOTO_RAIO);
      }
      y = fechado.proximoY;
    }

    // ── Endereço ─────────────────────────────────────────────
    {
      const secao = abrirSecao(page, y, "Endereço", fontBold);
      const celulas: Celula[] = [
        { label: "CEP", valor: m.zipCode ?? "" },
        { label: "Endereço", valor: m.address ?? "" },
        { label: "Bairro", valor: m.neighborhood ?? "" },
        { label: "Cidade / UF", valor: [m.city, m.state].filter(Boolean).join(" / ") },
      ];
      const yFinal = desenharGrade(page, secao.y, celulas, 2, fontBold, font);
      y = fecharSecao(page, secao.boxTop, yFinal).proximoY;
    }

    desenharRodapeInstitucional(page, font, 50);
  }

  return pdf.save();
}
