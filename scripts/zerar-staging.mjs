// ============================================================
// PROCEDIMENTO "X" — zera TODOS os dados de TESTE do ambiente de STAGING:
// financeiro, matrículas, alunos, vínculo professor/turma e professores.
//
// 26/09/2026 — MUDANÇA DE REGRA (Joaquim): até aqui este script preservava
// `professores` e `course_editions` de propósito (decisão de 06/09/2026,
// pra sempre sobrar 1 professor/turma nos dropdowns). O Joaquim pediu
// explicitamente pra reverter isso: "quero que zerar professores, alunos,
// financeiro" — ele quer testar o fluxo de cadastro de professor
// (/cadastro-professor) do ZERO, sem nenhuma conta pré-existente sobrando.
// A regra de 06/09 foi revogada — não recriar mais nada automaticamente
// (nem professor de referência, nem turma, nem alunos de teste). Ver
// AGENTS.md, seção "Zerar staging agora zera literalmente tudo".
//
// Ordem das deleções respeita as dependências (filhos antes dos pais):
//   financeiro -> matrículas -> alunos -> vínculo professor/turma -> professores
// Depois, apaga também os logins em auth.users (exceto GLOBAL_ADMIN) —
// sem isso, e-mails de teste ficam "presos" (não dá pra recadastrar o
// mesmo e-mail) mesmo com os dados já apagados.
//
// NUNCA roda em producao: trava se NEXT_PUBLIC_SUPABASE_URL nao for o
// projeto de staging (cjxdroyyplpknygtcdgr).
//
// Uso (PowerShell, na pasta da staging):
//   node --env-file=.env.local scripts/zerar-staging.mjs
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

// Ordem importa: filhos antes dos pais.
const TABELAS = [
  "fin_contas_receber",
  "fin_contas_pagar",
  "fin_lancamentos",
  "fin_caixa_diario",
  "ead_matriculas",
  "ead_alunos",
  "professor_turmas",
  "professores",
];

console.log("Zerando staging — TODOS os dados de teste (professores, alunos, financeiro):\n");

for (const tabela of TABELAS) {
  const { error, count } = await admin.from(tabela).delete({ count: "exact" }).not("id", "is", null);
  if (error) {
    console.error(`  [ERRO] ${tabela}: ${error.message}`);
  } else {
    console.log(`  [OK] ${tabela}: ${count ?? 0} linha(s) apagada(s).`);
  }
}

// Preserva qualquer conta GLOBAL_ADMIN (login de staff em staging) e apaga
// todo o resto de auth.users — sem isso, e-mails de teste ficam presos.
const { data: profilesAdmin } = await admin.from("profiles").select("id, email").eq("system_role", "GLOBAL_ADMIN");
const idsPreservados = new Set((profilesAdmin ?? []).map((p) => p.id));

const { data: usuarios, error: erroListar } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (erroListar) {
  console.error(`\n[ERRO] Nao consegui listar usuarios: ${erroListar.message}`);
  process.exit(1);
}

let apagados = 0;
for (const u of usuarios?.users ?? []) {
  if (idsPreservados.has(u.id)) continue;
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) {
    console.error(`  [ERRO] usuario ${u.email}: ${error.message}`);
  } else {
    apagados++;
  }
}

console.log(`\nUsuarios de teste apagados: ${apagados}.`);
console.log(`Contas GLOBAL_ADMIN preservadas: ${(profilesAdmin ?? []).map((p) => p.email).join(", ") || "(nenhuma encontrada)"}.`);

console.log("\nStaging zerado por completo — nenhum professor, turma, aluno ou e-mail de teste sobrou.");
console.log("Pra testar de novo: use /cadastro-professor (ou /inscricao) pra recriar tudo do zero.");
