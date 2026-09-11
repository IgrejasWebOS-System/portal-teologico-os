"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { gerarQuestoes, carregarTesteLicao } from "@/utils/avaliacoes/gerador";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ============================================================
// Simulados e provas do aluno. Regras (decididas com o CETADP em
// 15/07/2026, ajustadas em 17/07/2026):
// - Simulado: opcional, múltipla escolha, mínimo 10 questões (com
//   seletor para mais), no máximo 2 tentativas por matrícula
//   (garantido também por trigger no banco, ver migration 039).
//   Não conta para aprovação/reprovação da matrícula, mas fica no
//   histórico.
// - Prova: só pode ser feita 1 vez por matrícula (garantido também
//   por índice único no banco), e só fica disponível depois que o
//   aluno concluir 100% das aulas do curso (enrollments.progress_percent).
//   Aviso de "sem volta" confirmado no formulário antes de gerar a
//   primeira questão. Nota mínima 6,0. Ao finalizar, atualiza o
//   status da matrícula (ead_matriculas) para APROVADO/REPROVADO —
//   REPROVADO libera nova matrícula no mesmo curso, conforme a
//   regra de CPF já aplicada na aprovação.
// ============================================================

const NOTA_MINIMA = 6.0;
const LIMITE_SIMULADOS = 2;

function fail(message: string): never {
  redirect("/portal/avaliacoes?error=" + encodeURIComponent(message));
}

async function carregarMatriculaDoAluno(matriculaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, course_id, status, aluno_id, curso_nome_snapshot, ead_alunos(user_id)")
    .eq("id", matriculaId)
    .single();

  const alunoInfo = matricula?.ead_alunos as unknown as { user_id: string | null } | null;

  if (!matricula || alunoInfo?.user_id !== user!.id) {
    fail("Matrícula não encontrada ou não pertence a você.");
  }

  return { matricula: matricula!, userId: user!.id };
}

export async function iniciarAvaliacaoAction(formData: FormData) {
  const matriculaId = formData.get("matricula_id") as string;
  const tipo = formData.get("tipo") as string;
  const numQuestoesForm = Number(formData.get("num_questoes") || 10);
  const confirmou = formData.get("confirmo_prova") === "on";

  if (!matriculaId || !["SIMULADO", "PROVA"].includes(tipo)) fail("Dados inválidos.");

  const { matricula, userId } = await carregarMatriculaDoAluno(matriculaId);

  if (matricula.status !== "EM_ANDAMENTO") {
    fail("Esta matrícula não está em andamento — não é possível fazer simulado/prova.");
  }
  if (!matricula.course_id) {
    fail("Este curso ainda não tem avaliações configuradas.");
  }
  if (tipo === "PROVA" && !confirmou) {
    fail("Confirme que está ciente de que a prova só pode ser feita uma vez, sem possibilidade de refazer.");
  }

  const admin = createAdminClient();

  if (tipo === "SIMULADO") {
    const { count: totalSimulados } = await admin
      .from("avaliacoes")
      .select("id", { count: "exact", head: true })
      .eq("matricula_id", matriculaId)
      .eq("tipo", "SIMULADO");
    if ((totalSimulados ?? 0) >= LIMITE_SIMULADOS) {
      fail(`Você já utilizou os ${LIMITE_SIMULADOS} simulados disponíveis para este curso.`);
    }
  }

  if (tipo === "PROVA") {
    const { data: provaExistente } = await admin
      .from("avaliacoes")
      .select("id")
      .eq("matricula_id", matriculaId)
      .eq("tipo", "PROVA")
      .maybeSingle();
    if (provaExistente) fail("Você já fez a prova deste curso — só é permitida uma tentativa por matrícula.");

    const { data: enrollment } = await admin
      .from("enrollments")
      .select("progress_percent")
      .eq("user_id", userId)
      .eq("course_id", matricula.course_id)
      .maybeSingle();
    if (!enrollment || enrollment.progress_percent !== 100) {
      fail("Você precisa concluir 100% das aulas do curso antes de fazer a prova.");
    }
  }

  const numQuestoes = tipo === "PROVA" ? 10 : Math.max(10, numQuestoesForm);

  const questoes = await gerarQuestoes(matricula.course_id, numQuestoes);
  if (questoes.length === 0) {
    fail("Ainda não há banco de questões cadastrado para este curso. Fale com a secretaria.");
  }

  const { data: avaliacao, error } = await admin
    .from("avaliacoes")
    .insert({
      matricula_id: matriculaId,
      tipo,
      num_questoes: questoes.length,
    })
    .select("id")
    .single();

  if (error || !avaliacao) {
    fail("Erro ao iniciar avaliação: " + (error?.message ?? "desconhecido"));
  }

  const { error: questoesError } = await admin.from("avaliacao_questoes").insert(
    questoes.map((q, i) => ({
      avaliacao_id: avaliacao!.id,
      ordem: i + 1,
      enunciado: q.enunciado,
      opcoes: q.opcoes,
      resposta_correta_index: q.resposta_correta_index,
    }))
  );

  if (questoesError) {
    fail("Erro ao gerar questões: " + questoesError.message);
  }

  redirect(`/portal/avaliacoes/${avaliacao!.id}`);
}

// Teste de Certo/Errado por par de lições (Teste 1: Lições 1 e 2 etc.)
// — mesma engrenagem do simulado/prova, mas sem embaralhar (ordem fixa
// igual ao papel) e sem as regras de "1 tentativa"/"2 tentativas"/
// "só libera com 100%": é formativo, o aluno pode refazer. Copia
// gabarito_provisorio do banco pra avaliacao no momento da criação,
// pra tela de resultado mostrar o aviso mesmo que o banco seja
// corrigido depois de já existirem tentativas antigas.
export async function iniciarTesteLicaoAction(formData: FormData) {
  const matriculaId = formData.get("matricula_id") as string;
  const lessonId = formData.get("lesson_id") as string;
  const numeroTeste = Number(formData.get("numero_teste"));

  if (!matriculaId || !lessonId || !numeroTeste) fail("Dados inválidos.");

  const { matricula } = await carregarMatriculaDoAluno(matriculaId);

  if (matricula.status !== "EM_ANDAMENTO") {
    fail("Esta matrícula não está em andamento — não é possível fazer o teste.");
  }

  const { questoes } = await carregarTesteLicao(lessonId, numeroTeste);
  if (questoes.length === 0) {
    fail("Não há questões cadastradas para este teste ainda.");
  }

  const gabaritoProvisorio = questoes.some((q) => q.gabaritoProvisorio);
  const admin = createAdminClient();

  const { data: avaliacao, error } = await admin
    .from("avaliacoes")
    .insert({
      matricula_id: matriculaId,
      tipo: "TESTE_LICAO",
      lesson_id: lessonId,
      numero_teste: numeroTeste,
      num_questoes: questoes.length,
      gabarito_provisorio: gabaritoProvisorio,
    })
    .select("id")
    .single();

  if (error || !avaliacao) {
    fail("Erro ao iniciar teste: " + (error?.message ?? "desconhecido"));
  }

  const { error: questoesError } = await admin.from("avaliacao_questoes").insert(
    questoes.map((q, i) => ({
      avaliacao_id: avaliacao!.id,
      ordem: i + 1,
      enunciado: q.enunciado,
      opcoes: q.opcoes,
      resposta_correta_index: q.resposta_correta_index,
    }))
  );

  if (questoesError) {
    fail("Erro ao gerar questões: " + questoesError.message);
  }

  redirect(`/portal/avaliacoes/${avaliacao!.id}`);
}

export async function submeterAvaliacaoAction(formData: FormData) {
  const avaliacaoId = formData.get("avaliacao_id") as string;
  if (!avaliacaoId) fail("Avaliação inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: avaliacao } = await admin
    .from("avaliacoes")
    .select("id, tipo, status, matricula_id, ead_matriculas(ead_alunos(user_id))")
    .eq("id", avaliacaoId)
    .single();

  const matriculaInfo = avaliacao?.ead_matriculas as unknown as
    | { ead_alunos: { user_id: string | null } | null }
    | null;

  if (!avaliacao || matriculaInfo?.ead_alunos?.user_id !== user!.id) {
    redirect("/portal/avaliacoes?error=" + encodeURIComponent("Avaliação não encontrada."));
  }
  if (avaliacao!.status !== "EM_ANDAMENTO") {
    redirect(
      `/portal/avaliacoes/${avaliacaoId}?error=` +
        encodeURIComponent("Esta avaliação já foi finalizada.")
    );
  }

  const { data: questoes } = await admin
    .from("avaliacao_questoes")
    .select("id, ordem, resposta_correta_index")
    .eq("avaliacao_id", avaliacaoId)
    .order("ordem");

  if (!questoes || questoes.length === 0) {
    redirect(
      `/portal/avaliacoes/${avaliacaoId}?error=` + encodeURIComponent("Nenhuma questão encontrada.")
    );
  }

  let acertos = 0;
  for (const q of questoes!) {
    const respostaStr = formData.get(`questao_${q.id}`) as string | null;
    const respostaIndex = respostaStr != null && respostaStr !== "" ? Number(respostaStr) : null;
    const correta = respostaIndex != null && respostaIndex === q.resposta_correta_index;
    if (correta) acertos++;

    await admin
      .from("avaliacao_questoes")
      .update({
        resposta_aluno_index: respostaIndex,
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

  if (avaliacao!.tipo === "PROVA") {
    await admin
      .from("ead_matriculas")
      .update({
        status: aprovado ? "APROVADO" : "REPROVADO",
        nota_final: nota,
        data_conclusao: new Date().toISOString(),
      })
      .eq("id", avaliacao!.matricula_id);
  }

  revalidatePath("/portal/avaliacoes");
  redirect(`/portal/avaliacoes/${avaliacaoId}?msg=` + encodeURIComponent("Avaliação finalizada."));
}
