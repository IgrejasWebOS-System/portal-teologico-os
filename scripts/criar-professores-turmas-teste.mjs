// ============================================================
// Módulo 1 (RBAC "Professor de turma") — 13/09/2026.
//
// Cria as contas de teste pedidas pelo Joaquim pra validar a Área do
// Professor antes de avançar pro Módulo 2:
//
//   professor1@cetadp.teo.br  -> Curso Teológico Básico
//     alunobasico1@cetadp.teo.br -> 45% do curso, 2 testes feitos, 4 parcelas pagas
//     alunobasico2@cetadp.teo.br -> 85% do curso, 4 testes feitos, em dia com o financeiro
//     alunobasico3@cetadp.teo.br -> 100% do curso, todos os testes/provas feitos
//                                   (apto a certificado), tudo pago
//
//   professor2@cetadp.teo.br  -> Curso Teológico Médio
//     alunomedio1@cetadp.teo.br  -> mesmo padrão de alunobasico1
//     alunomedio2@cetadp.teo.br  -> mesmo padrão de alunobasico2
//     alunomedio3@cetadp.teo.br  -> mesmo padrão de alunobasico3
//
// Interpretação assumida (documentar pro Joaquim revisar na validação):
//   - "4 parcelas pagas" = matrícula (R$25) + 3 mensalidades pagas, resto
//     em aberto, sem contar como atraso.
//   - "está em dia" = matrícula + 6 mensalidades pagas (meses já vencidos),
//     resto ainda não vencido.
//   - "completou/100%" = matrícula + 12/12 mensalidades pagas.
//   - "N testes feitos" = N linhas de avaliacoes (TESTE_LICAO, FINALIZADA)
//     preenchidas sequencialmente lição por lição, numero_teste 1..4.
//   - "todos os testes/provas feitos" (100%) = Testes 1-4 + Prova de TODAS
//     as 10 lições do curso, todos FINALIZADA com nota 7.0 (garante média
//     de certificado >= 6.1).
//
// Senha de todas as contas novas (professores e alunos): @Cetadp26
//
// NUNCA roda em producao: trava se NEXT_PUBLIC_SUPABASE_URL nao for o
// projeto de staging (cjxdroyyplpknygtcdgr).
//
// Uso (PowerShell, na pasta da staging):
//   node --env-file=.env.local scripts/criar-professores-turmas-teste.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados no .env.local.");
  process.exit(1);
}
if (!url.includes("cjxdroyyplpknygtcdgr")) {
  console.error(`ATENCAO: NEXT_PUBLIC_SUPABASE_URL atual (${url}) nao parece ser o projeto de staging.`);
  console.error("Cancelado por seguranca — este script e so pra staging (cjxdroyyplpknygtcdgr).");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const SENHA_PADRAO = "@Cetadp26";
const NOME_CAMPO_MINISTERIO = "Campo AD Brás Piracicaba";
const HOJE = new Date().toISOString().slice(0, 10);

function addMeses(dataISO, meses) {
  const d = new Date(dataISO + "T00:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

async function criarLogin(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: SENHA_PADRAO, email_confirm: true });
  if (error || !data?.user) throw new Error(`criar login ${email}: ${error?.message ?? "desconhecido"}`);
  return data.user.id;
}

async function obterOuCriarProfessor({ email, nomeCompleto }) {
  const { data: existente } = await admin.from("professores").select("id, user_id").eq("nome_completo", nomeCompleto).maybeSingle();
  const userId = await criarLogin(email);

  if (existente) {
    await admin.from("professores").update({ user_id: userId }).eq("id", existente.id);
    console.log(`  [OK] professor "${nomeCompleto}" reaproveitado, login vinculado (${email}).`);
    return existente.id;
  }

  const { data: criado, error } = await admin
    .from("professores")
    .insert({ nome_completo: nomeCompleto, user_id: userId, cargo: "Professor" })
    .select("id")
    .single();
  if (error || !criado) throw new Error(`criar professores ${nomeCompleto}: ${error?.message}`);
  console.log(`  [OK] professor "${nomeCompleto}" criado, login ${email}.`);
  return criado.id;
}

async function gerarParcelas({ alunoId, alunoUserId, matriculaId, cursoTitle, parcelasPagas, totalParcelas = 12 }) {
  const linhas = [
    {
      origem_tipo: "MATRICULA_DIRETA",
      origem_id: matriculaId,
      aluno_id: alunoId,
      aluno_user_id: alunoUserId,
      responsavel_pagamento: "ALUNO",
      descricao: `Matrícula — ${cursoTitle}`,
      numero_parcela: 1,
      total_parcelas: 1,
      valor_bruto_centavos: 2500,
      forma_pagamento_prevista: "PIX",
      data_vencimento: HOJE,
      status: parcelasPagas > 0 ? "PAGO" : "PENDENTE",
      pago_em: parcelasPagas > 0 ? new Date().toISOString() : null,
    },
  ];

  for (let i = 1; i <= totalParcelas; i++) {
    const paga = i <= parcelasPagas;
    linhas.push({
      origem_tipo: "MATRICULA_DIRETA",
      origem_id: matriculaId,
      aluno_id: alunoId,
      aluno_user_id: alunoUserId,
      responsavel_pagamento: "ALUNO",
      descricao: `Mensalidade — ${cursoTitle}`,
      numero_parcela: i,
      total_parcelas: totalParcelas,
      valor_bruto_centavos: 6500,
      forma_pagamento_prevista: "PIX",
      data_vencimento: addMeses(HOJE, i - parcelasPagas),
      status: paga ? "PAGO" : "PENDENTE",
      pago_em: paga ? new Date().toISOString() : null,
    });
  }

  const { error } = await admin.from("fin_contas_receber").insert(linhas);
  if (error) console.log(`    [ERRO] parcelas: ${error.message}`);
}

async function gerarTestes({ matriculaId, lessons, quantidade }) {
  let feitos = 0;
  for (const lesson of lessons) {
    for (let numeroTeste = 1; numeroTeste <= 4 && feitos < quantidade; numeroTeste++) {
      const { error } = await admin.from("avaliacoes").insert({
        matricula_id: matriculaId,
        tipo: "TESTE_LICAO",
        lesson_id: lesson.id,
        numero_teste: numeroTeste,
        status: "FINALIZADA",
        num_questoes: 10,
        acertos: 8,
        nota: 8.0,
        aprovado: true,
        iniciada_em: new Date().toISOString(),
        finalizada_em: new Date().toISOString(),
      });
      if (error) console.log(`    [ERRO] teste ${lesson.title} #${numeroTeste}: ${error.message}`);
      feitos++;
    }
    if (feitos >= quantidade) break;
  }
}

async function gerarCursoCompleto({ matriculaId, lessons }) {
  for (const lesson of lessons) {
    for (let numeroTeste = 1; numeroTeste <= 4; numeroTeste++) {
      await admin.from("avaliacoes").insert({
        matricula_id: matriculaId,
        tipo: "TESTE_LICAO",
        lesson_id: lesson.id,
        numero_teste: numeroTeste,
        status: "FINALIZADA",
        num_questoes: 10,
        acertos: 9,
        nota: 9.0,
        aprovado: true,
        iniciada_em: new Date().toISOString(),
        finalizada_em: new Date().toISOString(),
      });
    }
    await admin.from("avaliacoes").insert({
      matricula_id: matriculaId,
      tipo: "PROVA",
      lesson_id: lesson.id,
      status: "FINALIZADA",
      num_questoes: 10,
      acertos: 9,
      nota: 9.0,
      aprovado: true,
      iniciada_em: new Date().toISOString(),
      finalizada_em: new Date().toISOString(),
    });
  }
}

async function criarAluno({
  email,
  nomeCompleto,
  cpf,
  telefone,
  cursoTitle,
  cursoPretendido,
  professorId,
  progressoPercent,
  testesFeitos,
  parcelasPagas,
  cursoCompleto,
}) {
  const { data: curso } = await admin.from("courses").select("id").eq("title", cursoTitle).maybeSingle();
  if (!curso) {
    console.log(`  [AVISO] curso "${cursoTitle}" não encontrado — pulei ${email}.`);
    return;
  }
  const { data: lessons } = await admin
    .from("lessons")
    .select("id, title")
    .eq("course_id", curso.id)
    .order("order_index");

  const { data: campo } = await admin.from("ead_campos_ministerios").select("id").eq("nome", NOME_CAMPO_MINISTERIO).maybeSingle();

  const userId = await criarLogin(email);
  const matriculaNumero = `TESTE-PROF-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`;

  const { data: aluno, error: erroAluno } = await admin
    .from("ead_alunos")
    .insert({
      user_id: userId,
      nome_completo: nomeCompleto,
      cpf,
      email,
      telefone,
      campo_ministerio_id: campo?.id ?? null,
      campo_ministerio_nome: NOME_CAMPO_MINISTERIO,
      matricula: matriculaNumero,
      curso_pretendido: cursoPretendido,
      status: "ATIVO",
    })
    .select("id")
    .single();
  if (erroAluno || !aluno) {
    console.log(`  [ERRO] criar ead_alunos ${email}: ${erroAluno?.message}`);
    return;
  }

  const { data: matricula, error: erroMatricula } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno.id,
      course_id: curso.id,
      curso_nome_snapshot: cursoTitle,
      matricula: matriculaNumero,
      status: "EM_ANDAMENTO",
      origem: "MATRICULA_DIRETA",
      professor_id: professorId,
    })
    .select("id")
    .single();
  if (erroMatricula || !matricula) {
    console.log(`  [ERRO] criar ead_matriculas ${email}: ${erroMatricula?.message}`);
    return;
  }

  await admin.from("enrollments").insert({
    user_id: userId,
    course_id: curso.id,
    status: progressoPercent >= 100 ? "COMPLETED" : "ENROLLED",
    progress_percent: progressoPercent,
    completed_at: progressoPercent >= 100 ? new Date().toISOString() : null,
  });

  await gerarParcelas({
    alunoId: aluno.id,
    alunoUserId: userId,
    matriculaId: matricula.id,
    cursoTitle,
    parcelasPagas,
  });

  if (cursoCompleto) {
    await gerarCursoCompleto({ matriculaId: matricula.id, lessons: lessons ?? [] });
  } else {
    await gerarTestes({ matriculaId: matricula.id, lessons: lessons ?? [], quantidade: testesFeitos });
  }

  console.log(`  [OK] ${email} — ${cursoTitle}, ${progressoPercent}%, matrícula "${matriculaNumero}", professor vinculado.`);
}

console.log("Criando professores de teste:\n");
const professor1Id = await obterOuCriarProfessor({ email: "professor1@cetadp.teo.br", nomeCompleto: "Professor Teste Um" });
const professor2Id = await obterOuCriarProfessor({ email: "professor2@cetadp.teo.br", nomeCompleto: "Professor Teste Dois" });

console.log("\nCriando alunos do professor1 (Curso Teológico Básico):\n");
await criarAluno({
  email: "alunobasico1@cetadp.teo.br",
  nomeCompleto: "Aluno Basico Um",
  cpf: "222.333.444-50",
  telefone: "(19) 99800-0010",
  cursoTitle: "Curso Teológico Básico",
  cursoPretendido: "TEOLOGIA_BASICO",
  professorId: professor1Id,
  progressoPercent: 45,
  testesFeitos: 2,
  parcelasPagas: 3,
  cursoCompleto: false,
});
await criarAluno({
  email: "alunobasico2@cetadp.teo.br",
  nomeCompleto: "Aluno Basico Dois",
  cpf: "222.333.444-51",
  telefone: "(19) 99800-0011",
  cursoTitle: "Curso Teológico Básico",
  cursoPretendido: "TEOLOGIA_BASICO",
  professorId: professor1Id,
  progressoPercent: 85,
  testesFeitos: 4,
  parcelasPagas: 6,
  cursoCompleto: false,
});
await criarAluno({
  email: "alunobasico3@cetadp.teo.br",
  nomeCompleto: "Aluno Basico Tres",
  cpf: "222.333.444-52",
  telefone: "(19) 99800-0012",
  cursoTitle: "Curso Teológico Básico",
  cursoPretendido: "TEOLOGIA_BASICO",
  professorId: professor1Id,
  progressoPercent: 100,
  testesFeitos: 0,
  parcelasPagas: 12,
  cursoCompleto: true,
});

console.log("\nCriando alunos do professor2 (Curso Teológico Médio):\n");
await criarAluno({
  email: "alunomedio1@cetadp.teo.br",
  nomeCompleto: "Aluno Medio Um",
  cpf: "222.333.444-53",
  telefone: "(19) 99800-0013",
  cursoTitle: "Curso Teológico Médio",
  cursoPretendido: "TEOLOGIA_MEDIO",
  professorId: professor2Id,
  progressoPercent: 45,
  testesFeitos: 2,
  parcelasPagas: 3,
  cursoCompleto: false,
});
await criarAluno({
  email: "alunomedio2@cetadp.teo.br",
  nomeCompleto: "Aluno Medio Dois",
  cpf: "222.333.444-54",
  telefone: "(19) 99800-0014",
  cursoTitle: "Curso Teológico Médio",
  cursoPretendido: "TEOLOGIA_MEDIO",
  professorId: professor2Id,
  progressoPercent: 85,
  testesFeitos: 4,
  parcelasPagas: 6,
  cursoCompleto: false,
});
await criarAluno({
  email: "alunomedio3@cetadp.teo.br",
  nomeCompleto: "Aluno Medio Tres",
  cpf: "222.333.444-55",
  telefone: "(19) 99800-0015",
  cursoTitle: "Curso Teológico Médio",
  cursoPretendido: "TEOLOGIA_MEDIO",
  professorId: professor2Id,
  progressoPercent: 100,
  testesFeitos: 0,
  parcelasPagas: 12,
  cursoCompleto: true,
});

console.log("\nPronto. Senha de todas as contas novas: @Cetadp26");
