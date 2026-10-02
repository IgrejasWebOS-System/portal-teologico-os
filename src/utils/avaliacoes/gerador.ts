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

// ============================================================
// Testes de Certo/Errado por par de lições (ex: "Prova Pneumatologia"
// impressa do CETADP, digitalizada — Teste 1: Lições 1 e 2, etc).
// Diferente do simulado/prova: ordem FIXA (mesma numeração do papel,
// sem embaralhar) e sempre 2 opções fixas — Certo/Errado.
// ============================================================

export interface QuestaoTesteLicao extends QuestaoGerada {
  gabaritoProvisorio: boolean;
}

export async function carregarTesteLicao(
  lessonId: string,
  numeroTeste: number
): Promise<{ questoes: QuestaoTesteLicao[]; licoesLabel: string | null }> {
  const admin = createAdminClient();

  const { data: banco } = await admin
    .from("avaliacoes_teste_licao_banco")
    .select("enunciado, resposta_correta_index, gabarito_provisorio, licoes_label")
    .eq("lesson_id", lessonId)
    .eq("numero_teste", numeroTeste)
    .eq("ativo", true)
    .order("ordem");

  if (!banco || banco.length === 0) return { questoes: [], licoesLabel: null };

  return {
    licoesLabel: banco[0].licoes_label,
    questoes: banco.map((q) => ({
      enunciado: q.enunciado,
      opcoes: ["Certo", "Errado"],
      resposta_correta_index: q.resposta_correta_index,
      gabaritoProvisorio: q.gabarito_provisorio,
    })),
  };
}

export interface TesteLicaoDisponivel {
  lessonId: string;
  lessonTitle: string;
  numeroTeste: number;
  licoesLabel: string;
  totalQuestoes: number;
  gabaritoProvisorio: boolean;
}

// Lista, por curso, quais combinações lesson_id + numero_teste têm
// banco cadastrado — usado pra montar o seletor na tela do aluno sem
// hardcodar nada de Pneumatologia especificamente.
export async function listarTestesLicaoDoCurso(courseId: string): Promise<TesteLicaoDisponivel[]> {
  const admin = createAdminClient();

  const { data: lessons } = await admin
    .from("lessons")
    .select("id, title")
    .eq("course_id", courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);
  const tituloPorLesson = new Map(lessons.map((l) => [l.id, l.title]));

  const { data: banco } = await admin
    .from("avaliacoes_teste_licao_banco")
    .select("lesson_id, numero_teste, licoes_label, gabarito_provisorio")
    .in("lesson_id", lessonIds)
    .eq("ativo", true);

  if (!banco || banco.length === 0) return [];

  const grupos = new Map<string, TesteLicaoDisponivel>();
  for (const q of banco) {
    const chave = `${q.lesson_id}::${q.numero_teste}`;
    const existente = grupos.get(chave);
    if (existente) {
      existente.totalQuestoes += 1;
      if (q.gabarito_provisorio) existente.gabaritoProvisorio = true;
    } else {
      grupos.set(chave, {
        lessonId: q.lesson_id,
        lessonTitle: tituloPorLesson.get(q.lesson_id) ?? "—",
        numeroTeste: q.numero_teste,
        licoesLabel: q.licoes_label,
        totalQuestoes: 1,
        gabaritoProvisorio: q.gabarito_provisorio,
      });
    }
  }

  return [...grupos.values()].sort((a, b) =>
    a.lessonTitle === b.lessonTitle ? a.numeroTeste - b.numeroTeste : a.lessonTitle.localeCompare(b.lessonTitle, "pt-BR")
  );
}
