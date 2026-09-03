// ============================================================
// Apaga (via Supabase Admin API) as contas de teste/desenvolvimento
// que sobraram no Auth de producao apos a limpeza de dados da
// migration 077 (que so limpou tabelas do banco, nunca auth.users).
//
// Lista revisada e confirmada com o Joaquim em 02/09/2026 — NAO
// adicione e-mails aqui sem confirmar de novo, e-mail por e-mail.
//
// Uso (PowerShell, na pasta do projeto):
//   node --env-file=.env.local scripts/limpar-usuarios-teste.mjs
//
// Pede confirmacao digitada (CONFIRMAR) antes de apagar qualquer
// coisa. Mostra a lista encontrada primeiro, sempre.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const EMAILS_PARA_APAGAR = [
  "aluno.basico@cetadp.teo.br",
  "aluno.medio@cetadp.teo.br",
  "alunoprova@cetadp.teo.br",
  "igrejaswebos@gmail.com",
  "portalteologicoos@gmail.com",
  "josiascardoso05@gmail.com",
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados.");
  console.error("Rode com: node --env-file=.env.local scripts/limpar-usuarios-teste.mjs");
  process.exit(1);
}

function perguntar(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pergunta, (resposta) => {
      rl.close();
      resolve(resposta);
    });
  });
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: usuarios, error: buscaError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (buscaError) {
  console.error("Erro ao buscar usuarios:", buscaError.message);
  process.exit(1);
}

const encontrados = EMAILS_PARA_APAGAR
  .map((email) => usuarios.users.find((u) => u.email === email))
  .filter(Boolean);

const naoEncontrados = EMAILS_PARA_APAGAR.filter(
  (email) => !usuarios.users.some((u) => u.email === email)
);

console.log("\nContas que serao apagadas:");
encontrados.forEach((u) => console.log(`  - ${u.email}  (${u.id})`));

if (naoEncontrados.length > 0) {
  console.log("\nJa nao existem (ignorando):");
  naoEncontrados.forEach((email) => console.log(`  - ${email}`));
}

if (encontrados.length === 0) {
  console.log("\nNenhuma conta da lista foi encontrada. Nada a fazer.");
  process.exit(0);
}

console.log(`\n${encontrados.length} conta(s) serao apagadas PERMANENTEMENTE do Auth de producao.`);
const resposta = await perguntar('Digite "CONFIRMAR" (em maiusculas) para prosseguir: ');

if (resposta.trim() !== "CONFIRMAR") {
  console.log("Cancelado — nada foi apagado.");
  process.exit(0);
}

for (const u of encontrados) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) {
    console.error(`Erro ao apagar ${u.email}:`, error.message);
  } else {
    console.log(`Apagado: ${u.email}`);
  }
}

console.log("\nConcluido.");
