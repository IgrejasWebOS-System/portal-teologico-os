// ============================================================
// Zera os dados de TESTE do ambiente de STAGING — matriculas, alunos e
// contas a receber — preservando:
//   - qualquer conta com profiles.system_role = 'GLOBAL_ADMIN' (login de
//     staff usado pra acessar /admin em localhost, ex.:
//     teste.staff@cetadp.teo.br, criado por criar-usuario-teste-staff.mjs)
//   - professores e course_editions (turma) — pedido explicito do
//     Joaquim em 2026-09-06: sao dado de configuracao reaproveitavel
//     entre rodadas de teste, nao dado de teste descartavel. Se por
//     qualquer motivo essas tabelas ja estiverem vazias, o script recria
//     um professor e uma turma basicos pra nao deixar os dropdowns de
//     Nova Matricula vazios.
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

// Ordem importa: fin_contas_receber referencia ead_matriculas, que
// referencia ead_alunos. NAO inclui professores/course_editions —
// mantidos de propósito (ver comentario acima).
const TABELAS_TESTE = ["fin_contas_receber", "ead_matriculas", "ead_alunos"];

console.log("Zerando staging — tabelas de teste:\n");

for (const tabela of TABELAS_TESTE) {
  const { error, count } = await admin.from(tabela).delete({ count: "exact" }).not("id", "is", null);
  if (error) {
    console.error(`  [ERRO] ${tabela}: ${error.message}`);
  } else {
    console.log(`  [OK] ${tabela}: ${count ?? 0} linha(s) apagada(s).`);
  }
}

// Preserva qualquer conta GLOBAL_ADMIN (login de staff em staging) e apaga
// todo o resto de auth.users (alunos de teste, cascade de profiles junto).
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

// Garante que sempre sobra pelo menos 1 professor e 1 turma pros
// dropdowns de Nova Matricula (mantidos por pedido explicito, mas
// recriados aqui como rede de seguranca caso alguem apague na mao).
const { count: totalProfessores } = await admin.from("professores").select("id", { count: "exact", head: true });
if (!totalProfessores) {
  const { error } = await admin.from("professores").insert({ nome_completo: "Marcelo Teste" });
  console.log(error ? `  [ERRO] recriar professor: ${error.message}` : "  [OK] professor de referencia recriado (Marcelo Teste).");
}

const { count: totalTurmas } = await admin.from("course_editions").select("id", { count: "exact", head: true });
if (!totalTurmas) {
  const { data: curso } = await admin.from("courses").select("id").eq("title", "Curso Teológico Básico").maybeSingle();
  if (curso) {
    const { error } = await admin.from("course_editions").insert({
      course_id: curso.id,
      nome: "Edição 2026",
      ano: 2026,
      status: "ABERTA",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
    });
    console.log(error ? `  [ERRO] recriar turma: ${error.message}` : "  [OK] turma de referencia recriada (Edição 2026).");
  } else {
    console.log("  [AVISO] Curso 'Curso Teológico Básico' nao encontrado — nao foi possivel recriar a turma automaticamente.");
  }
}

console.log("\nStaging zerado (turma e professor mantidos).");
