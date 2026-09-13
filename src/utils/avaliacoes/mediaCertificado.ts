// ============================================================
// Média geral pra elegibilidade de Certificado — decisão do
// Joaquim em 12/09/2026: só considera Testes 1-4 e Prova POR
// MATÉRIA (avaliacoes.tipo IN ('TESTE_LICAO','PROVA') com
// lesson_id preenchido — a Prova "antiga" por curso inteiro,
// lesson_id nulo, e o Simulado (prática ilimitada) NÃO entram
// nessa conta). Critério: média >= MEDIA_MINIMA_CERTIFICADO
// aprova, abaixo reprova.
//
// Isso é DIFERENTE do NOTA_MINIMA=6.0 usado em
// portal/testes/[lessonId]/actions.ts pra aprovar cada Prova de
// matéria individualmente — aqui é a média geral que decide se o
// Certificado do CURSO pode ser emitido, não a aprovação de uma
// matéria isolada. Não confundir os dois limites.
// ============================================================

export const MEDIA_MINIMA_CERTIFICADO = 6.1;

export interface AvaliacaoParaMedia {
  tipo: string;
  status: string;
  nota: number | null;
  lesson_id: string | null;
  lesson_title?: string | null;
  numero_teste?: number | null;
  finalizada_em?: string | null;
}

export interface ResultadoMedia {
  itens: AvaliacaoParaMedia[];
  media: number | null;
  aprovado: boolean | null;
  quantidade: number;
}

export function calcularMediaCertificado(avaliacoes: AvaliacaoParaMedia[]): ResultadoMedia {
  const itens = avaliacoes.filter(
    (a) =>
      (a.tipo === "TESTE_LICAO" || a.tipo === "PROVA") &&
      a.lesson_id != null &&
      a.status === "FINALIZADA" &&
      a.nota != null
  );

  if (itens.length === 0) {
    return { itens, media: null, aprovado: null, quantidade: 0 };
  }

  const soma = itens.reduce((acc, a) => acc + Number(a.nota), 0);
  const media = Number((soma / itens.length).toFixed(2));

  return {
    itens,
    media,
    aprovado: media >= MEDIA_MINIMA_CERTIFICADO,
    quantidade: itens.length,
  };
}
