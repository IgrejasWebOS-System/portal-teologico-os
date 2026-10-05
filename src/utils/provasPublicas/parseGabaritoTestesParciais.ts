// ============================================================
// Extrai o gabarito da seção "TESTES PARCIAIS" dos PDFs de gabarito do
// CETADP (mesmo padrão visto em "ESCATOLOGIA GABARITO.pdf" e
// "Lideranca Crista - GABARITO A5.pdf"): depois das respostas por lição
// (que NÃO usamos aqui — são os exercícios do livro, não o teste), vem
// uma seção com blocos "TESTE 1" .. "TESTE N" e um bloco "GERAL" (soma
// de tudo, descartado — não corresponde a nenhum link individual).
//
// Mesmo aviso do parseTesteProva.ts: isto não substitui a conferência
// humana. O layout dessa seção é em múltiplas colunas no PDF original —
// uma biblioteca de extração de texto pode (ou não) preservar a ordem
// correta das colunas. Por isso cada resposta extraída aqui é cruzada
// com a questão correspondente numa tela de revisão antes de qualquer
// gravação (ver cruzarProvaComGabarito.ts) — nunca confiar cegamente
// neste resultado.
// ============================================================

export interface RespostaExtraida {
  ordem: number;
  resposta: "C" | "E";
}

export interface GabaritoExtraido {
  porTeste: Map<number, RespostaExtraida[]>;
  avisos: string[];
  /**
   * Primeiros ~1500 caracteres do texto bruto extraído do gabarito —
   * mesmo diagnóstico de amostraTexto em parseTesteProva.ts (03/10/2026).
   */
  amostraTexto: string;
}

const RE_SECAO_TESTES_PARCIAIS = /TESTES\s+PARCIAIS/i;
const RE_CABECALHO_TESTE = /TESTE\s*(\d{1,2})\b/gi;
const RE_CABECALHO_GERAL = /\bGERAL\b/i;
const RE_RESPOSTA = /(\d{1,2})\s*[.,]?\s*([CE])\b/g;

export function parseGabaritoTestesParciais(textoBruto: string): GabaritoExtraido {
  const avisos: string[] = [];
  const texto = textoBruto.replace(/\r/g, "\n");

  const idxSecao = texto.search(RE_SECAO_TESTES_PARCIAIS);
  if (idxSecao < 0) {
    avisos.push(
      'Não encontrei a seção "TESTES PARCIAIS" neste PDF — confira se é o gabarito certo da matéria (não o gabarito dos exercícios por lição, que tem outro formato).'
    );
    return { porTeste: new Map(), avisos, amostraTexto: texto.slice(0, 1500) };
  }

  const corpo = texto.slice(idxSecao);
  const cabecalhos = [...corpo.matchAll(RE_CABECALHO_TESTE)];
  const idxGeral = corpo.search(RE_CABECALHO_GERAL);
  const porTeste = new Map<number, RespostaExtraida[]>();

  for (let i = 0; i < cabecalhos.length; i++) {
    const atual = cabecalhos[i];
    const numeroTeste = parseInt(atual[1], 10);
    const inicio = (atual.index ?? 0) + atual[0].length;

    let fim = i + 1 < cabecalhos.length ? cabecalhos[i + 1].index ?? corpo.length : corpo.length;
    if (idxGeral >= inicio && idxGeral < fim) fim = idxGeral;

    const trecho = corpo.slice(inicio, Math.max(inicio, fim));
    const respostas: RespostaExtraida[] = [];

    for (const m of trecho.matchAll(RE_RESPOSTA)) {
      const ordem = parseInt(m[1], 10);
      if (ordem < 1 || ordem > 60) continue;
      respostas.push({ ordem, resposta: m[2].toUpperCase() as "C" | "E" });
    }

    if (porTeste.has(numeroTeste)) {
      avisos.push(`Mais de um bloco "TESTE ${numeroTeste}" encontrado no gabarito — usei só o primeiro, confira manualmente.`);
      continue;
    }

    porTeste.set(numeroTeste, respostas);
  }

  if (porTeste.size === 0) {
    avisos.push('Encontrei a seção "TESTES PARCIAIS" mas não consegui separar os blocos por "TESTE N" dentro dela — confira manualmente.');
  }

  return { porTeste, avisos, amostraTexto: texto.slice(0, 1500) };
}
