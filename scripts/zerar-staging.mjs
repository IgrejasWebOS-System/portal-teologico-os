// ============================================================
// PROCEDIMENTO "X" — zera os dados de TESTE do ambiente de STAGING
// (matriculas, alunos, contas a receber, avaliacoes via cascade) E
// RECRIA do zero as contas de teste padrão, prontas pra logar — preserva:
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
// A partir de 12/09/2026 este script TAMBEM recria, ao final, as duas
// contas de aluno de teste com matrícula ativa:
//   - alunobasico@cetadp.teo.br  -> Curso Teológico Básico (Bibliologia)
//   - alunomedio@cetadp.teo.br   -> Curso Teológico Médio  (Homilética)
// (senha padrão @Cetadp26 pra ambas). Antes desta mudança, o script
// apagava essas contas junto com o resto de auth.users mas NAO as
// recriava — era preciso recriar na mão. Ver
// staging/governance/ERROS-COMUNS-IA.md, incidente de 12/09/2026.
//
// Se você só quer refazer um Teste/Prova/Simulado com a MESMA conta
// (sem recriar do zero), use o procedimento "Y" em vez deste:
//   node --env-file=.env.local scripts/limpar-tentativas-teste.mjs
// Ver staging/governance/QA-PROCEDIMENTO-TESTES.md pra saber qual usar.
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

// ============================================================
// Recria as 2 contas de aluno de teste padrão, cada uma na matéria
// certa (Bibliologia -> Básico, Homilética -> Médio — não são o mesmo
// curso, checar antes de "consertar" isso).
// ============================================================
const SENHA_PADRAO_ALUNOS = "@Cetadp26";
const NOME_CAMPO_MINISTERIO = "Campo Piracicaba Sede";

async function recriarAlunoTeste({ email, nomeCompleto, cpf, telefone, cursoTitle, cursoPretendido }) {
  const { data: curso } = await admin.from("courses").select("id").eq("title", cursoTitle).maybeSingle();
  if (!curso) {
    console.log(`  [AVISO] curso "${cursoTitle}" não encontrado — não deu pra recriar ${email}.`);
    return;
  }

  const { data: campo } = await admin
    .from("ead_campos_ministerios")
    .select("id")
    .eq("nome", NOME_CAMPO_MINISTERIO)
    .maybeSingle();

  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: SENHA_PADRAO_ALUNOS,
    email_confirm: true,
  });
  if (erroCriar || !criado?.user) {
    console.log(`  [ERRO] criar login ${email}: ${erroCriar?.message ?? "desconhecido"}`);
    return;
  }
  const userId = criado.user.id;

  const matriculaNumero = `TESTE-${Date.now().toString().slice(-8)}`;

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
    console.log(`  [ERRO] criar ead_alunos ${email}: ${erroAluno?.message ?? "desconhecido"}`);
    return;
  }

  const { error: erroMatricula } = await admin.from("ead_matriculas").insert({
    aluno_id: aluno.id,
    course_id: curso.id,
    curso_nome_snapshot: cursoTitle,
    matricula: matriculaNumero,
    status: "EM_ANDAMENTO",
    origem: "MATRICULA_DIRETA",
  });
  if (erroMatricula) {
    console.log(`  [ERRO] criar ead_matriculas ${email}: ${erroMatricula.message}`);
    return;
  }

  await admin.from("enrollments").insert({ user_id: userId, course_id: curso.id, status: "ENROLLED", progress_percent: 0 });

  console.log(`  [OK] ${email} recriado — matrícula "${matriculaNumero}" em "${cursoTitle}", senha ${SENHA_PADRAO_ALUNOS}.`);
}

console.log("\nRecriando contas de aluno de teste:\n");
await recriarAlunoTeste({
  email: "alunobasico@cetadp.teo.br",
  nomeCompleto: "Aluno Teste Basico",
  cpf: "111.222.333-40",
  telefone: "(19) 99800-0001",
  cursoTitle: "Curso Teológico Básico",
  cursoPretendido: "TEOLOGIA_BASICO",
});
await recriarAlunoTeste({
  email: "alunomedio@cetadp.teo.br",
  nomeCompleto: "Aluno Teste Medio",
  cpf: "111.222.333-41",
  telefone: "(19) 99800-0002",
  cursoTitle: "Curso Teológico Médio",
  cursoPretendido: "TEOLOGIA_MEDIO",
});

console.log("\nStaging pronto pra testar do zero.");
