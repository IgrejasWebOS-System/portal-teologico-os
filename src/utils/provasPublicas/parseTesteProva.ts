// ============================================================
// Extrai, de forma determinística (sem IA), as questões Certo/Errado de
// um PDF de teste do CETADP (02/10/2026, pedido do Joaquim: "transformar
// essa rotina em código").
//
// Baseado no padrão visto em TODOS os PDFs de teste já processados
// manualmente (Escatologia Bíblica, Liderança Cristã): cabeçalho
// "TESTE N - LIÇÕES X e Y", instrução fixa "Marque "C" para Certo e "E"
// para Errado", seguida de questões numeradas "01 - enunciado", "02 -
// enunciado" etc.
//
// IMPORTANTE (não testado em produção nesta sessão — meu ambiente de
// execução de código estava indisponível quando isto foi escrito):
// a extração de texto de PDF por biblioteca (pdf-parse) pode não
// preservar a ordem/quebra de linha exatamente como a leitura visual.
// Por isso esta função NUNCA deve escrever direto no banco — ela só
// alimenta uma tela de conferência (ver
// src/app/[locale]/(admin)/admin/provas-publicas/importar) onde a
// secretaria confirma cada questão antes de qualquer coisa ser
// publicada. Os `avisos` abaixo existem pra chamar atenção quando algo
// sai fora do esperado (sequência de números com buraco, cabeçalho não
// reconhecido etc.) — eles NÃO bloqueiam a extração, só avisam.
// ============================================================

export interface QuestaoExtraidaProva {
  ordem: number;
  enunciado: string;
}

export interface TesteProvaExtraido {
  numeroTeste: number | null;
  licaoInicio: number | null;
  licaoFim: number | null;
  questoes: QuestaoExtraidaProva[];
  avisos: string[];
  /**
   * Primeiros ~1500 caracteres do texto bruto extraído do PDF (sempre
   * preenchido, não só quando falha) — diagnóstico pra ajustar as regras
   * de extração quando o resultado não bate com o esperado (03/10/2026,
   * achado em teste: a extração zerou na primeira tentativa real).
   */
  amostraTexto: string;
}

// "TESTE 1 - LIÇÕES 1 e 2" / "TESTE 2  –  LIÇÃO 3 E 4" (tolera variação
// de traço, acento e maiúscula/minúscula no "e").
const RE_CABECALHO_TESTE =
  /TESTE\s*(\d{1,2})\s*[-–—]+\s*LI[ÇC][ÃA]O?[ÕO]?ES?\s*(\d{1,2})\s*(?:e|E)\s*(\d{1,2})/;

// Início de cada questão: número (1-2 dígitos, pra não confundir com
// datas/valores maiores dentro do próprio enunciado) seguido de traço.
// O "_*" cobre o traço de preenchimento (____) que antecede o número em
// todos os PDFs vistos até agora.
const RE_QUESTAO_INICIO = /(?:^|\n)\s*_*\s*(\d{1,2})\s*[-–—]+\s*/g;

export function parseTesteProva(textoBruto: string): TesteProvaExtraido {
  const avisos: string[] = [];
  const texto = textoBruto.replace(/\r/g, "\n");

  const cabecalho = texto.match(RE_CABECALHO_TESTE);
  const numeroTeste = cabecalho ? parseInt(cabecalho[1], 10) : null;
  const licaoInicio = cabecalho ? parseInt(cabecalho[2], 10) : null;
  const licaoFim = cabecalho ? parseInt(cabecalho[3], 10) : null;

  if (!cabecalho) {
    avisos.push(
      'Não encontrei o cabeçalho "TESTE N - LIÇÕES X e Y" neste PDF — confira manualmente o número do teste e as lições antes de confirmar.'
    );
  }

  // Corta tudo antes da instrução fixa "Marque ..." pra não confundir
  // números do cabeçalho (nome/data/núcleo) com questões.
  const marcaIdx = texto.search(/Marque/i);
  const corpo = marcaIdx >= 0 ? texto.slice(marcaIdx) : texto;

  const marcadores = [...corpo.matchAll(RE_QUESTAO_INICIO)];
  const questoes: QuestaoExtraidaProva[] = [];

  for (let i = 0; i < marcadores.length; i++) {
    const atual = marcadores[i];
    const numero = parseInt(atual[1], 10);
    if (numero < 1 || numero > 60) continue;

    const inicio = (atual.index ?? 0) + atual[0].length;
    const fim = i + 1 < marcadores.length ? marcadores[i + 1].index ?? corpo.length : corpo.length;

    const enunciado = corpo.slice(inicio, fim).replace(/\s+/g, " ").trim();
    if (enunciado.length < 5) continue; // provável falso positivo

    questoes.push({ ordem: numero, enunciado });
  }

  const ordens = questoes.map((q) => q.ordem).sort((a, b) => a - b);
  const esperado = Array.from({ length: questoes.length }, (_, i) => i + 1);
  const sequencial = JSON.stringify(ordens) === JSON.stringify(esperado);

  if (questoes.length === 0) {
    avisos.push('Não consegui identificar nenhuma questão numerada neste PDF. Confira se o arquivo é mesmo o teste (não o gabarito) e se não está escaneado como imagem.');
  } else if (!sequencial) {
    avisos.push(
      `As questões extraídas não formam uma sequência 1..${questoes.length} sem repetição/buraco (números encontrados: ${ordens.join(", ")}). Revise item a item antes de confirmar.`
    );
  }

  return { numeroTeste, licaoInicio, licaoFim, questoes, avisos, amostraTexto: texto.slice(0, 1500) };
}
