// ============================================================
// PROCEDIMENTO "Y" — limpar tentativas de Teste/Prova/Simulado dos
// alunos de teste (alunobasico@cetadp.teo.br, alunomedio@cetadp.teo.br)
// SEM apagar login, matrícula, progresso de aula ou financeiro.
//
// Use este script quando quiser refazer um Teste/Prova com a MESMA
// conta de teste (ex.: "quero fazer de novo o Teste 1 de Bibliologia").
// Os índices únicos do banco (avaliacoes_teste_licao_unica,
// avaliacoes_prova_unica_por_materia, e o limite de 2 SIMULADOs por
// matrícula) bloqueiam uma segunda tentativa enquanto a linha antiga
// de `avaliacoes` existir — este script apaga só essas linhas.
//
// Não use este script se quiser testar do zero (matrícula nova,
// aluno "recém-aprovado", etc.) — nesse caso use
// `node --env-file=.env.local scripts/zerar-staging.mjs` (procedimento
// "X"), que reseta e recria as contas de teste inteiras.
//
// NUNCA roda em produção: trava se NEXT_PUBLIC_SUPABASE_URL nao for o
// projeto de staging (cjxdroyyplpknygtcdgr) — mesma trava do
// zerar-staging.mjs.
//
// Uso (PowerShell, na pasta da staging):
//   node --env-file=.env.local scripts/limpar-tentativas-teste.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const EMAILS_TESTE = ["alunobasico@cetadp.teo.br", "alunomedio@cetadp.teo.br"];

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

console.log("Limpando tentativas de Teste/Prova/Simulado (mantendo login e matrícula):\n");

const { data: alunos, error: erroAlunos } = await admin
  .from("ead_alunos")
  .select("id, email")
  .in("email", EMAILS_TESTE);

if (erroAlunos) {
  console.error(`[ERRO] buscar ead_alunos: ${erroAlunos.message}`);
  process.exit(1);
}
if (!alunos || alunos.length === 0) {
  console.log("Nenhum dos e-mails de teste tem ficha de aluno (ead_alunos) — nada a limpar.");
  console.log("Se você esperava encontrá-los, rode o procedimento \"X\" (zerar-staging.mjs) pra recriá-los.");
  process.exit(0);
}

const alunoIds = alunos.map((a) => a.id);
const { data: matriculas, error: erroMatriculas } = await admin
  .from("ead_matriculas")
  .select("id, aluno_id, curso_nome_snapshot")
  .in("aluno_id", alunoIds);

if (erroMatriculas) {
  console.error(`[ERRO] buscar ead_matriculas: ${erroMatriculas.message}`);
  process.exit(1);
}
if (!matriculas || matriculas.length === 0) {
  console.log("Nenhuma matrícula encontrada pros alunos de teste — nada a limpar.");
  process.exit(0);
}

const matriculaIds = matriculas.map((m) => m.id);

// Apaga avaliacoes (SIMULADO/PROVA por curso E TESTE_LICAO/PROVA por
// matéria) — avaliacao_questoes cai junto via ON DELETE CASCADE
// (migration 025 e 099).
const { error: erroDelete, count } = await admin
  .from("avaliacoes")
  .delete({ count: "exact" })
  .in("matricula_id", matriculaIds);

if (erroDelete) {
  console.error(`[ERRO] apagar avaliacoes: ${erroDelete.message}`);
  process.exit(1);
}

console.log(`[OK] ${count ?? 0} avaliação(ões) apagada(s) (Simulado, Prova, Teste 1-4 e Prova por matéria).`);
for (const m of matriculas) {
  const aluno = alunos.find((a) => a.id === m.aluno_id);
  console.log(`  - ${aluno?.email ?? "?"} — ${m.curso_nome_snapshot}`);
}

console.log("\nLogin, matrícula, progresso de aula (enrollments/lesson_completions) e financeiro NÃO foram tocados.");
console.log("Pode fazer login de novo com as mesmas contas e refazer qualquer Teste/Prova/Simulado.");
