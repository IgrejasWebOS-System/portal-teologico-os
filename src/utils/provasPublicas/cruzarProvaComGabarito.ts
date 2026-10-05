import type { TesteProvaExtraido } from "./parseTesteProva";
import type { GabaritoExtraido } from "./parseGabaritoTestesParciais";

export interface QuestaoCruzada {
  ordem: number;
  enunciado: string;
  resposta: "C" | "E" | null;
}

export interface CruzamentoResultado {
  questoes: QuestaoCruzada[];
  avisos: string[];
  amostraTexto: string;
}

// Casa as questões extraídas do PDF do teste com as respostas extraídas
// do bloco "TESTE N" correspondente no PDF do gabarito, pela ORDEM (1,
// 2, 3...), não pelo texto do enunciado (o gabarito não tem o enunciado,
// só o número). Questão sem resposta casada fica com `resposta: null` —
// a tela de revisão exige que a secretaria preencha manualmente antes de
// confirmar (nunca publica com resposta nula).
export function cruzarProvaComGabarito(
  prova: TesteProvaExtraido,
  gabarito: GabaritoExtraido
): CruzamentoResultado {
  const avisos = [...prova.avisos];
  const numeroTeste = prova.numeroTeste;
  const respostas = numeroTeste != null ? gabarito.porTeste.get(numeroTeste) : undefined;

  if (!respostas) {
    avisos.push(
      numeroTeste != null
        ? `Não achei o bloco "TESTE ${numeroTeste}" no PDF do gabarito — preencha cada resposta manualmente abaixo.`
        : "Não identifiquei o número deste teste (cabeçalho não reconhecido), então não dá pra casar automaticamente com o gabarito — preencha manualmente."
    );
  }

  const respostaPorOrdem = new Map((respostas ?? []).map((r) => [r.ordem, r.resposta]));

  const questoes: QuestaoCruzada[] = prova.questoes.map((q) => ({
    ordem: q.ordem,
    enunciado: q.enunciado,
    resposta: respostaPorOrdem.get(q.ordem) ?? null,
  }));

  const semResposta = questoes.filter((q) => q.resposta === null).length;
  if (semResposta > 0) {
    avisos.push(`${semResposta} questão(ões) ficaram sem resposta casada automaticamente — marque manualmente antes de confirmar.`);
  }

  return { questoes, avisos, amostraTexto: prova.amostraTexto };
}
