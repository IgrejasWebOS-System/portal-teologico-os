"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { validarCPF } from "@/utils/cpf";

// ============================================================
// Prova pública por link + CPF (01/10/2026, pedido do Joaquim) — caso
// específico pro aluno que ainda não tem matrícula no sistema. A prova é
// FIXA (sempre as mesmas perguntas, sempre a mesma ordem do PDF original),
// por isso as questões/gabarito ficam em provas_publicas_questoes em vez
// de usar o sorteio de pool de avaliacoes_banco_questoes_licao.
//
// Corrige sempre no servidor com o client admin (nunca confia em acertos
// calculados no navegador, e nunca manda a letra certa pro cliente -- só
// "certo"/"errado" por questão). A resposta final fica em
// provas_publicas_respostas até que um ead_alunos com o mesmo CPF exista
// -- aí o trigger do banco (vincular_provas_publicas_por_cpf, migration
// 123) liga sozinho.
//
// 01/10/2026: fluxo de "refazer" -- quando não atinge a média, o aluno só
// reedita as questões erradas (as certas ficam travadas) e cada mudança
// chama checarProvaPublicaAction (não grava nada) pra atualizar um índice
// flutuante de % ao vivo; ao atingir a média, o client chama
// enviarProvaPublicaAction pra gravar o resultado final.
// ============================================================

// Mesmo limiar das provas oficiais (NOTA_MINIMA em
// portal/testes/[lessonId]/actions.ts, atualizado 29/09/2026 de 6,0 pra
// 6,1) -- decisão do Joaquim (01/10/2026): as provas públicas seguem a
// mesma regra de aprovação.
const NOTA_MINIMA = 6.1;

export type RespostaEnviada = { ordem: number; resposta: string };

type CorrecaoBase = {
  porQuestao: Record<number, boolean>;
  acertos: number;
  total: number;
  nota: number;
  aprovado: boolean;
};

export type CheckResultado = ({ success: true } & CorrecaoBase) | { success: false; message: string };

export type EnviarProvaPublicaResultado =
  | ({ success: true; vinculadoAgora: boolean } & CorrecaoBase)
  | { success: false; message: string };

async function corrigir(
  slug: string,
  respostas: RespostaEnviada[],
  permitirParcial = false
): Promise<{ ok: true; provaId: string; correcao: CorrecaoBase } | { ok: false; message: string }> {
  const admin = createAdminClient();

  const { data: prova } = await admin
    .from("provas_publicas")
    .select("id, ativo")
    .eq("slug", slug)
    .maybeSingle();

  if (!prova) return { ok: false, message: "Prova não encontrada." };
  if (!prova.ativo) return { ok: false, message: "Esta prova não está mais disponível." };

  const { data: questoes } = await admin
    .from("provas_publicas_questoes")
    .select("ordem, resposta_correta")
    .eq("prova_id", prova.id)
    .order("ordem");

  if (!questoes || questoes.length === 0) {
    return { ok: false, message: "Esta prova ainda não tem questões cadastradas." };
  }

  const respostaPorOrdem = new Map(respostas.map((r) => [r.ordem, r.resposta?.trim().toUpperCase() ?? ""]));

  // Conferência "ao vivo" (modo refazer) permite questões ainda em branco
  // -- contam como erradas na % mostrada, mas não travam o fluxo. O envio
  // final (permitirParcial=false) continua exigindo tudo respondido.
  if (!permitirParcial && questoes.some((q) => !respostaPorOrdem.get(q.ordem))) {
    return { ok: false, message: "Responda todas as questões antes de enviar." };
  }

  const porQuestao: Record<number, boolean> = {};
  let acertos = 0;
  for (const q of questoes) {
    const dada = respostaPorOrdem.get(q.ordem) ?? "";
    const certa = dada === q.resposta_correta.trim().toUpperCase();
    porQuestao[q.ordem] = certa;
    if (certa) acertos += 1;
  }

  const total = questoes.length;
  const nota = Math.round((acertos / total) * 10 * 100) / 100;
  const aprovado = nota >= NOTA_MINIMA;

  return { ok: true, provaId: prova.id, correcao: { porQuestao, acertos, total, nota, aprovado } };
}

// Conferência "ao vivo" -- usada no modo de refazer (só as erradas ficam
// editáveis). Nunca grava nada, nunca revela a letra correta -- só
// certo/errado por questão, pro client travar as certas e recalcular o
// índice flutuante de %.
export async function checarProvaPublicaAction(
  slug: string,
  respostas: RespostaEnviada[]
): Promise<CheckResultado> {
  const resultado = await corrigir(slug, respostas, true);
  if (!resultado.ok) return { success: false, message: resultado.message };
  return { success: true, ...resultado.correcao };
}

export async function enviarProvaPublicaAction(
  slug: string,
  cpf: string,
  nomeCompleto: string,
  respostas: RespostaEnviada[],
  permitirParcial = false
): Promise<EnviarProvaPublicaResultado> {
  const nome = nomeCompleto.trim();
  if (!nome) return { success: false, message: "Informe seu nome completo." };
  if (!cpf || !validarCPF(cpf)) return { success: false, message: "Informe um CPF válido." };

  // permitirParcial=true -- usado só quando o modo "refazer" já atingiu a
  // média mínima no meio do caminho (algumas questões erradas podem ainda
  // estar em branco, contam como erradas mesmo, não bloqueiam o envio).
  // Bug corrigido em 01/10/2026: antes disso, o auto-finalizar do refazer
  // chamava esta action sempre exigindo 100% respondido e falhava calado
  // (sem mostrar erro), deixando o aluno aprovado sem nenhum jeito de
  // finalizar a prova.
  const resultado = await corrigir(slug, respostas, permitirParcial);
  if (!resultado.ok) return { success: false, message: resultado.message };

  const { provaId, correcao } = resultado;
  const cpfNormalizado = cpf.replace(/\D/g, "");
  const admin = createAdminClient();

  // 01/10/2026, achado em teste (Joaquim): refazer a mesma prova várias
  // vezes com o mesmo CPF criava uma linha nova a cada envio -- quando a
  // matrícula fosse criada depois, o trigger de vínculo por CPF linkava
  // TODAS de uma vez. Antes de gravar, apaga a tentativa anterior desta
  // mesma prova+CPF -- só a mais recente conta.
  //
  // 02/10/2026, achado em teste (Joaquim): a trava acima só cobria
  // tentativas PENDENTES (ead_aluno_id is null). Pra quem já estava
  // matriculado, cada reenvio virava uma linha NOVA (já vinculada na
  // hora, ver "vinculadoAgora" abaixo), acumulando resultados sem limite
  // -- 4 linhas "VINCULADO" pro mesmo CPF no mesmo teste. Correção: apaga
  // a tentativa anterior sempre, vinculada ou não (migration 126 trocou o
  // índice único parcial por um de verdade: só 1 linha por prova+CPF).
  // Se a tentativa anterior já estava vinculada a um aluno, guarda o id
  // pra não perder esse vínculo ao gravar a nova.
  const { data: tentativaAnterior } = await admin
    .from("provas_publicas_respostas")
    .select("ead_aluno_id")
    .eq("prova_id", provaId)
    .eq("cpf", cpfNormalizado)
    .maybeSingle();

  await admin.from("provas_publicas_respostas").delete().eq("prova_id", provaId).eq("cpf", cpfNormalizado);

  // 01/10/2026, pergunta do Joaquim: o trigger vincular_provas_publicas_por_cpf
  // (migration 123) só dispara em INSERT/UPDATE de ead_alunos -- cobre quem
  // faz a prova ANTES da matrícula existir. Pra quem já tem matrícula (o
  // CPF já existe em ead_alunos) antes de fazer a prova pública, nenhum
  // evento de ead_alunos ia disparar de novo -- ficaria pendente pra
  // sempre. Aqui cobre o caso inverso: já vincula na hora do envio, sem
  // depender do trigger. ead_alunos.cpf é salvo formatado ("000.000.000-00"),
  // por isso compara nos dois formatos.
  const cpfFormatado = cpfNormalizado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const { data: alunoExistente } = await admin
    .from("ead_alunos")
    .select("id")
    .or(`cpf.eq.${cpfNormalizado},cpf.eq.${cpfFormatado}`)
    .limit(1)
    .maybeSingle();

  // Preserva o vínculo da tentativa anterior (se já estava vinculada a um
  // aluno) mesmo que a busca acima por algum motivo não repita o match --
  // nunca "desvincula" uma linha que já estava oficialmente ligada.
  const alunoId = alunoExistente?.id ?? tentativaAnterior?.ead_aluno_id ?? null;
  const vinculadoAgora = !!alunoId;

  const { error } = await admin.from("provas_publicas_respostas").insert({
    prova_id: provaId,
    cpf: cpfNormalizado,
    nome_completo: nome,
    respostas,
    acertos: correcao.acertos,
    total: correcao.total,
    nota: correcao.nota,
    aprovado: correcao.aprovado,
    ead_aluno_id: alunoId,
    vinculado_em: alunoId ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("[prova-publica] enviarProvaPublicaAction", error);
    return { success: false, message: "Não foi possível enviar sua prova. Tente novamente." };
  }

  return { success: true, vinculadoAgora, ...correcao };
}
