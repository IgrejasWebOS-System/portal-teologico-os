// ============================================================
// Cria (ou reaproveita) um usuario de teste com acesso de staff no
// ambiente de STAGING — util porque branches do Supabase nao
// herdam auth.users, entao os admins reais de producao nao existem
// aqui. NUNCA rode este script apontando pra producao (confira o
// NEXT_PUBLIC_SUPABASE_URL no .env.local antes).
//
// Da acesso duplo, cobrindo os dois sistemas de autorizacao que
// convivem no projeto:
//   - profiles.system_role = 'GLOBAL_ADMIN' (usado por checkIsStaff,
//     ex.: admin/matriculas/ficha-rapida)
//   - admin_roles nivel 0 / Super-Master (usado pelo painel /admin)
//
// Uso (PowerShell, na pasta da staging):
//   node --env-file=.env.local scripts/criar-usuario-teste-staff.mjs teste.staff@cetadp.teo.br
// ============================================================

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/criar-usuario-teste-staff.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados.");
  process.exit(1);
}

if (!url.includes("cjxdroyyplpknygtcdgr")) {
  console.error(`ATENCAO: NEXT_PUBLIC_SUPABASE_URL atual (${url}) nao parece ser o projeto de staging.`);
  console.error("Cancelado por seguranca — este script e so pra staging.");
  process.exit(1);
}

function perguntarSenhaOculta(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const originalWrite = rl._writeToOutput;
    let mostrarAsteriscos = false;
    rl._writeToOutput = function (stringToWrite) {
      if (mostrarAsteriscos && stringToWrite.charCodeAt(0) !== 13 && stringToWrite !== "\n") {
        rl.output.write("*");
      } else {
        originalWrite.call(rl, stringToWrite);
      }
    };
    rl.question(pergunta, (resposta) => {
      rl.history = rl.history.slice(1);
      rl.close();
      console.log("");
      resolve(resposta);
    });
    mostrarAsteriscos = true;
  });
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existentes } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
let usuario = existentes?.users.find((u) => u.email === email);

if (usuario) {
  console.log(`Usuario ${email} ja existe (${usuario.id}) — só vou garantir o acesso de staff.`);
} else {
  const senha = await perguntarSenhaOculta(`Digite a senha para criar ${email}: `);
  if (senha.length < 8) {
    console.error("Senha muito curta (minimo 8 caracteres). Nada foi criado.");
    process.exit(1);
  }
  const { data: novo, error: criarError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (criarError || !novo?.user) {
    console.error("Erro ao criar usuario:", criarError?.message ?? "desconhecido");
    process.exit(1);
  }
  usuario = novo.user;
  console.log(`Usuario criado: ${email} (${usuario.id})`);
}

const { error: profileError } = await admin
  .from("profiles")
  .update({ system_role: "GLOBAL_ADMIN" })
  .eq("id", usuario.id);
if (profileError) {
  console.error("Aviso: nao consegui atualizar profiles.system_role:", profileError.message);
} else {
  console.log("profiles.system_role definido como GLOBAL_ADMIN.");
}

const { data: adminRoleExistente } = await admin
  .from("admin_roles")
  .select("id")
  .eq("user_id", usuario.id)
  .eq("level", 0)
  .maybeSingle();

if (adminRoleExistente) {
  console.log("admin_roles nivel 0 (Super-Master) ja existia.");
} else {
  const { error: adminRoleError } = await admin
    .from("admin_roles")
    .insert({ user_id: usuario.id, level: 0, unit_id: null, role_title: "Staff de Teste (staging)" });
  if (adminRoleError) {
    console.error("Aviso: nao consegui gravar em admin_roles:", adminRoleError.message);
  } else {
    console.log("admin_roles nivel 0 (Super-Master) garantido.");
  }
}

console.log(`\nPronto — faca login em http://localhost:3000/login com ${email}.`);
