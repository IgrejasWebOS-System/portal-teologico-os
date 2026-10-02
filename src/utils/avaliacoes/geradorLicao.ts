// ============================================================
// gerarQuestoesLicao() — sorteio real de Teste/Prova por matéria
// (lesson_id) a partir do banco avaliacoes_banco_questoes_licao
// (migrations 099/100). Decisão de 11-12/09/2026 com o Joaquim:
//
// - "Teste N" (N=1..4) é parcial: sorteia 20 questões do pool das
//   duas lições internas da matéria correspondentes a esse teste
//   (Teste 1 -> Lições 1 e 2, Teste 2 -> Lições 3 e 4, etc.).
// - "Prova" é cumulativa: sorteia 20 questões do pool de todas as
//   8 lições internas da matéria.
// - Sempre 20 questões, sempre um sorteio real (pool maior que 20
//   em todos os casos verificados) — nunca uma lista fixa.
// - Rótulo "Teste Geral" nunca aparece em lugar nenhum visível ao
//   aluno; é sempre "Teste 1/2/3/4" ou "Prova".
//
// Só embaralha a ORDEM das questões sorteadas, não a ordem interna
// de "opcoes" — ao contrário do gerador.ts (múltipla escolha pura,
// resposta por índice), aqui "resposta_correta" é texto/letra que
// depende da posição original em "opcoes" (ex.: associação de
// colunas), então embaralhar opções exigiria remapear a resposta e
// arrisca um bug silencioso. Mantemos "opcoes" como cadastrado.
// ============================================================

import { createAdminClient } from "@/utils/supabase/admin";

export type FormatoQuestaoLicao =
  | "CERTO_ERRADO"
  | "MULTIPLA_ESCOLHA"
  | "PREENCHER_LACUNA"
  | "ASSOCIACAO_COLUNAS";

export type TipoAvaliacaoLicao = "TESTE_LICAO" | "PROVA";

export interface QuestaoLicaoGerada {
  formato: FormatoQuestaoLicao;
  enunciado: string;
  opcoes: string[] | null;
  resposta_correta: string;
}

export const QUANTIDADE_QUESTOES_LICAO = 20;
export const TOTAL_TESTES_POR_MATERIA = 4;

function embaralhar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Teste 1 -> lições 1,2 · Teste 2 -> lições 3,4 · Teste 3 -> lições 5,6 · Teste 4 -> lições 7,8
export function licoesDoTeste(numeroTeste: number): [number, number] {
  return [numeroTeste * 2 - 1, numeroTeste * 2];
}

interface FiltroPool {
  lessonId: string;
  tipo: TipoAvaliacaoLicao;
  numeroTeste?: number;
}

async function buscarPool({ lessonId, tipo, numeroTeste }: FiltroPool) {
  const admin = createAdminClient();
  let query = admin
    .from("avaliacoes_banco_questoes_licao")
    .select("formato, enunciado, opcoes, resposta_correta")
    .eq("lesson_id", lessonId)
    .eq("ativo", true);

  if (tipo === "TESTE_LICAO") {
    if (!numeroTeste || numeroTeste < 1 || numeroTeste > TOTAL_TESTES_POR_MATERIA) {
      throw new Error("numeroTeste inválido para TESTE_LICAO.");
    }
    const [licaoA, licaoB] = licoesDoTeste(numeroTeste);
    query = query.in("licao", [licaoA, licaoB]);
  }
  // PROVA: sem filtro de lição — pool cumulativo (todas as 8 lições).

  const { data } = await query;
  return data ?? [];
}

export async function contarQuestoesDisponiveisLicao(filtro: FiltroPool): Promise<number> {
  const pool = await buscarPool(filtro);
  return pool.length;
}

export async function gerarQuestoesLicao(
  filtro: FiltroPool,
  quantidade: number = QUANTIDADE_QUESTOES_LICAO
): Promise<QuestaoLicaoGerada[]> {
  const pool = await buscarPool(filtro);
  if (pool.length === 0) return [];

  const sorteadas = embaralhar(pool).slice(0, quantidade);

  return sorteadas.map((q) => ({
    formato: q.formato as FormatoQuestaoLicao,
    enunciado: q.enunciado,
    opcoes: (q.opcoes as string[] | null) ?? null,
    resposta_correta: q.resposta_correta,
  }));
}

// Extrai o "valor" de uma opção de MULTIPLA_ESCOLHA/ASSOCIACAO_COLUNAS
// pra usar como value do rádio/seleção, casando com resposta_correta:
// - "a. vida eterna"      -> "a"   (múltipla escolha a-d, letra minúscula)
// - "A - Neo-Ortodoxa"    -> "A"   (associação de colunas, letra maiúscula)
// - "respeito" (Sublinhar, sem prefixo de letra) -> "respeito" (texto puro)
const PREFIXO_LETRA_RE = /^([A-Za-z])\s*[.\-]\s*/;

export function extrairValorOpcao(opcaoTexto: string): string {
  const m = opcaoTexto.match(PREFIXO_LETRA_RE);
  return m ? m[1] : opcaoTexto.trim();
}

export const LABEL_CERTO_ERRADO: Record<string, string> = {
  C: "Certo",
  E: "Errado",
};

// Compara a resposta do aluno com o gabarito, format-aware.
// PREENCHER_LACUNA é comparado sem diferenciar maiúsculas/minúsculas
// e ignorando espaços nas pontas, já que o aluno digita livremente.
export function respostaCorretaLicao(
  formato: FormatoQuestaoLicao,
  respostaCorreta: string,
  respostaAluno: string | null
): boolean {
  if (respostaAluno == null || respostaAluno === "") return false;
  if (formato === "PREENCHER_LACUNA") {
    return respostaAluno.trim().toLowerCase() === respostaCorreta.trim().toLowerCase();
  }
  return respostaAluno === respostaCorreta;
}
