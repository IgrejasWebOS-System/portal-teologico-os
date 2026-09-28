// ============================================================
// ⚠️  PERIGO — APAGA LOGINS REAIS (auth.users) ⚠️
// ============================================================
//
// Apaga TODOS os logins de auth.users, EXCETO contas com
// system_role = 'GLOBAL_ADMIN' em `profiles`. Isso é IRREVERSÍVEL: uma
// vez apagado, o usuário perde acesso e o e-mail fica livre pra
// recadastro (é esse o efeito que se busca ao "zerar" pra testar de
// novo) — mas se for gente de verdade (professor/aluno real), a conta
// dela é apagada de verdade, sem volta.
//
// Isso é a mesma lógica que `zerar-staging.mjs` já faz em staging, mas
// aqui roda contra QUALQUER projeto apontado no .env.local que você
// carregar — inclusive produção, se for isso que você apontar. Por
// causa disso este script:
//   1. Não tem trava fixa de "só roda em staging" (diferente do
//      zerar-staging.mjs) — ele mostra qual projeto vai afetar e exige
//      confirmação digitada antes de continuar.
//   2. NÃO apaga nenhuma linha de tabela de dado (financeiro, alunos,
//      matrículas, professores) — só `auth.users`. Se você também quer
//      limpar essas tabelas, rode primeiro
//      staging/governance/PERIGO-zerar-dados-producao.sql.
//
// CHECKLIST OBRIGATÓRIO ANTES DE RODAR:
//   [ ] Fiz backup do banco antes (Supabase → Database → Backups).
//   [ ] Já rodei (ou decidi que não precisava) o
//       PERIGO-zerar-dados-producao.sql nesse mesmo ambiente.
//   [ ] Confirmei que o .env.local carregado aponta pro projeto certo
//       (o script abaixo mostra a URL antes de pedir confirmação).
//   [ ] Depois de rodar, vou preencher a entrada de log em
//       staging/governance/ERROS-COMUNS-IA.md.
//
// Uso (PowerShell, na pasta que tiver o .env.local do ambiente-alvo):
//   node --env-file=.env.local scripts/PERIGO-apagar-logins-nao-admin.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados no .env.local.");
  process.exit(1);
}

const PRODUCAO_ID = "toduvwtzklntyptcodkf";
const STAGING_ID = "cjxdroyyplpknygtcdgr";
const ambiente = url.includes(PRODUCAO_ID) ? "PRODUCAO" : url.includes(STAGING_ID) ? "staging" : "DESCONHECIDO";

console.log("============================================================");
console.log(`Projeto detectado no .env.local: ${url}`);
console.log(`Ambiente: ${ambiente}`);
console.log("Isso vai apagar TODOS os logins de auth.users, exceto contas GLOBAL_ADMIN.");
console.log("Essa acao NAO tem volta.");
console.log("============================================================\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const resposta = await rl.question(
  `Digite exatamente "APAGAR LOGINS ${ambiente}" pra confirmar (qualquer outra coisa cancela): `
);
rl.close();

if (resposta.trim() !== `APAGAR LOGINS ${ambiente}`) {
  console.log("\nCancelado — texto de confirmacao nao bateu. Nada foi apagado.");
  process.exit(0);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: profilesAdmin, error: erroProfiles } = await admin
  .from("profiles")
  .select("id, email")
  .eq("system_role", "GLOBAL_ADMIN");

if (erroProfiles) {
  console.error(`\n[ERRO] Nao consegui listar contas GLOBAL_ADMIN: ${erroProfiles.message}`);
  process.exit(1);
}

const idsPreservados = new Set((profilesAdmin ?? []).map((p) => p.id));

console.log(
  `\nContas GLOBAL_ADMIN que serao preservadas: ${(profilesAdmin ?? []).map((p) => p.email).join(", ") || "(nenhuma encontrada — confirme se isso e esperado!)"}`
);

let pagina = 1;
let apagados = 0;
let erros = 0;

while (true) {
  const { data: usuarios, error: erroListar } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
  if (erroListar) {
    console.error(`\n[ERRO] Nao consegui listar usuarios (pagina ${pagina}): ${erroListar.message}`);
    process.exit(1);
  }
  if (!usuarios?.users?.length) break;

  for (const u of usuarios.users) {
    if (idsPreservados.has(u.id)) continue;
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) {
      console.error(`  [ERRO] usuario ${u.email}: ${error.message}`);
      erros++;
    } else {
      console.log(`  [OK] apagado: ${u.email}`);
      apagados++;
    }
  }

  if (usuarios.users.length < 200) break;
  pagina++;
}

console.log(`\nLogins apagados: ${apagados}. Erros: ${erros}.`);
console.log(`Contas GLOBAL_ADMIN preservadas: ${(profilesAdmin ?? []).map((p) => p.email).join(", ") || "(nenhuma encontrada)"}.`);
console.log("\nLembre-se de registrar essa execucao em staging/governance/ERROS-COMUNS-IA.md.");
