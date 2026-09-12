"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  gerarQuestoesLicao,
  respostaCorretaLicao,
  TOTAL_TESTES_POR_MATERIA,
  type FormatoQuestaoLicao,
  type TipoAvaliacaoLicao,
} from "@/utils/avaliacoes/geradorLicao";

// ============================================================
// Teste 1-4 (parcial, por par de lições internas) e Prova (cumulativa,
// todas as 8 lições) de uma matéria (lesson_id) — decisão de
// 11-12/09/2026: sempre 20 questões sorteadas de um pool maior, nunca
// lista fixa, rótulo visível ao aluno sempre "Teste 1/2/3/4" ou
// "Prova" (nunca "Teste Geral"). Espelha o fluxo de
// portal/avaliacoes/actions.ts (SIMULADO/PROVA por curso inteiro,
// só múltipla escolha), mas por matéria e com os 4 formatos do
// banco novo (avaliacoes_banco_questoes_licao).
//
// Diferente do SIMULADO/PROVA por curso: aqui não há gate de "100%
// das aulas concluídas" (essas matérias não têm vídeo cadastrado,
// video_type = 'none' — o progress_percent é do curso inteiro, com
// 10 disciplinas, não dá pra usar como sinal de conclusão desta
// matéria específica). Fica só a exigência de matrícula em andamento
// e, na Prova, a confirmação de tentativa única.
// ============================================================

const NOTA_MINIMA = 6.0;

function fail(lessonId: string, message: string): never {
  redirect(`/portal/testes/${lessonId}?error=` + encodeURIComponent(message));
}

async function carregarContexto(lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) fail(lessonId, "Matéria não encontrada.");

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!aluno) fail(lessonId, "Você não tem ficha de aluno oficial vinculada a este login.");

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, status")
    .eq("aluno_id", aluno.id)
    .eq("course_id", lesson!.course_id)
    .maybeSingle();
  if (!matricula) fail(lessonId, "Você não tem matrícula no curso desta matéria.");

  return { userId: user!.id, lesson: lesson!, matricula };
}

export async function iniciarTesteLicaoAction(formData: FormData) {
  const lessonId = (formData.get("lesson_id") as string) || "";
  const tipo = formData.get("tipo") as TipoAvaliacaoLicao;
  const numeroTesteRaw = formData.get("numero_teste") as string | null;
  const numeroTeste = numeroTesteRaw ? Number(numeroTesteRaw) : undefined;
  const confirmou = formData.get("confirmo_prova") === "on";

  if (!lessonId || !["TESTE_LICAO", "PROVA"].includes(tipo)) {
    fail(lessonId, "Dados inválidos.");
  }
  if (tipo === "TESTE_LICAO" && (!numeroTeste || numeroTeste < 1 || numeroTeste > TOTAL_TESTES_POR_MATERIA)) {
    fail(lessonId, "Número de teste inválido.");
  }

  const { matricula } = await carregarContexto(lessonId);

  if (matricula.status !== "EM_ANDAMENTO") {
    fail(lessonId, "Esta matrícula não está em andamento — não é possível fazer teste/prova.");
  }
  if (tipo === "PROVA" && !confirmou) {
    fail(lessonId, "Confirme que está ciente de que a prova só pode ser feita uma vez, sem possibilidade de refazer.");
  }

  const admin = createAdminClient();

  // Regra de 1 tentativa por Teste/Prova desta matéria — também
  // garantida por índice único no banco (migration 099), esta checagem
  // aqui é só pra dar uma mensagem amigável em vez de erro de SQL.
  let existenteQuery = admin
    .from("avaliacoes")
    .select("id")
    .eq("matricula_id", matricula.id)
    .eq("lesson_id", lessonId)
    .eq("tipo", tipo);
  if (tipo === "TESTE_LICAO") {
    existenteQuery = existenteQuery.eq("numero_teste", numeroTeste!);
  }
  const { data: jaExistente } = await existenteQuery.maybeSingle();
  if (jaExistente) {
    fail(
      lessonId,
      tipo === "PROVA" ? "Você já fez a prova desta matéria." : `Você já fez o Teste ${numeroTeste} desta matéria.`
    );
  }

  const questoes = await gerarQuestoesLicao({ lessonId, tipo, numeroTeste });
  if (questoes.length === 0) {
    fail(lessonId, "Ainda não há questões suficientes cadastradas para esta matéria. Fale com a secretaria.");
  }

  const { data: avaliacao, error } = await admin
    .from("avaliacoes")
    .insert({
      matricula_id: matricula.id,
      lesson_id: lessonId,
      tipo,
      numero_teste: tipo === "TESTE_LICAO" ? numeroTeste : null,
      num_questoes: questoes.length,
    })
    .select("id")
    .single();

  if (error || !avaliacao) {
    fail(lessonId, "Erro ao iniciar avaliação: " + (error?.message ?? "desconhecido"));
  }

  const { error: questoesError } = await admin.from("avaliacao_questoes").insert(
    questoes.map((q, i) => ({
      avaliacao_id: avaliacao!.id,
      ordem: i + 1,
      enunciado: q.enunciado,
      opcoes: q.opcoes,
      formato: q.formato,
      resposta_correta: q.resposta_correta,
    }))
  );

  if (questoesError) {
    fail(lessonId, "Erro ao gerar questões: " + questoesError.message);
  }

  redirect(`/portal/testes/${lessonId}/${avaliacao!.id}`);
}

export async function submeterTesteLicaoAction(formData: FormData) {
  const lessonId = (formData.get("lesson_id") as string) || "";
  const avaliacaoId = formData.get("avaliacao_id") as string;
  if (!avaliacaoId) fail(lessonId, "Avaliação inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: avaliacao } = await admin
    .from("avaliacoes")
    .select("id, tipo, status, matricula_id, lesson_id, ead_matriculas(ead_alunos(user_id))")
    .eq("id", avaliacaoId)
    .single();

  const matriculaInfo = avaliacao?.ead_matriculas as unknown as
    | { ead_alunos: { user_id: string | null } | null }
    | null;

  if (!avaliacao || matriculaInfo?.ead_alunos?.user_id !== user!.id) {
    redirect(`/portal/testes/${lessonId}?error=` + encodeURIComponent("Avaliação não encontrada."));
  }
  if (avaliacao!.status !== "EM_ANDAMENTO") {
    redirect(
      `/portal/testes/${lessonId}/${avaliacaoId}?error=` +
        encodeURIComponent("Esta avaliação já foi finalizada.")
    );
  }

  const { data: questoes } = await admin
    .from("avaliacao_questoes")
    .select("id, ordem, formato, resposta_correta")
    .eq("avaliacao_id", avaliacaoId)
    .order("ordem");

  if (!questoes || questoes.length === 0) {
    redirect(
      `/portal/testes/${lessonId}/${avaliacaoId}?error=` + encodeURIComponent("Nenhuma questão encontrada.")
    );
  }

  let acertos = 0;
  for (const q of questoes!) {
    const respostaAluno = (formData.get(`questao_${q.id}`) as string | null) ?? null;
    const formato = q.formato as FormatoQuestaoLicao;
    const correta = respostaCorretaLicao(formato, q.resposta_correta as string, respostaAluno);
    if (correta) acertos++;

    await admin
      .from("avaliacao_questoes")
      .update({
        resposta_aluno: respostaAluno,
        correta,
        respondida_em: new Date().toISOString(),
      })
      .eq("id", q.id);
  }

  const nota = Number(((acertos / questoes!.length) * 10).toFixed(2));
  const aprovado = avaliacao!.tipo === "PROVA" ? nota >= NOTA_MINIMA : null;

  await admin
    .from("avaliacoes")
    .update({
      status: "FINALIZADA",
      acertos,
      nota,
      aprovado,
      finalizada_em: new Date().toISOString(),
    })
    .eq("id", avaliacaoId);

  revalidatePath(`/portal/testes/${lessonId}`);
  redirect(`/portal/testes/${lessonId}/${avaliacaoId}?msg=` + encodeURIComponent("Avaliação finalizada."));
}
