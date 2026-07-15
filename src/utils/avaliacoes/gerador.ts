// ============================================================
// gerarQuestoes() — módulo isolado de propósito.
//
// Fase atual (sem IA, decisão de 15/07/2026): sorteia questões de um
// banco estático cadastrado por curso (`avaliacoes_banco_questoes`),
// embaralhando a ordem das questões e das opções de cada uma, para
// que cada aluno receba uma combinação diferente sem depender de
// nenhuma API paga.
//
// Fase futura (com ANTHROPIC_API_KEY configurada): esta função passa
// a gerar perguntas novas via IA a partir do conteúdo do curso, com
// suporte a questões dissertativas. O resto do sistema (telas,
// correção de múltipla escolha, histórico, regra de 1 prova por
// matrícula) não muda — só a implementação desta função.
// ============================================================

import { createAdminClient } from "@/utils/supabase/admin";

export interface QuestaoGerada {
  enunciado: string;
  opcoes: string[];
  resposta_correta_index: number;
}

function embaralhar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export async function gerarQuestoes(
  courseId: string,
  quantidade: number
): Promise<QuestaoGerada[]> {
  const admin = createAdminClient();

  const { data: banco } = await admin
    .from("avaliacoes_banco_questoes")
    .select("enunciado, opcoes, resposta_correta_index")
    .eq("course_id", courseId)
    .eq("ativo", true);

  if (!banco || banco.length === 0) return [];

  const sorteadas = embaralhar(banco).slice(0, quantidade);

  return sorteadas.map((q) => {
    const opcoesOriginais = q.opcoes as string[];
    const respostaCorretaTexto = opcoesOriginais[q.resposta_correta_index];
    const opcoesEmbaralhadas = embaralhar(opcoesOriginais);
    return {
      enunciado: q.enunciado,
      opcoes: opcoesEmbaralhadas,
      resposta_correta_index: opcoesEmbaralhadas.indexOf(respostaCorretaTexto),
    };
  });
}

export async function contarQuestoesDisponiveis(courseId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("avaliacoes_banco_questoes")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("ativo", true);
  return count ?? 0;
}
