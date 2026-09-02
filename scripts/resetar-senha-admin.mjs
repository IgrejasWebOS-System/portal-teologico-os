// ============================================================
// Define/redefine a senha de uma conta admin diretamente via
// Supabase Admin API — sem passar por e-mail de recuperacao (util
// para as contas cetadp@/marcelo@/pandolfo@/josias@/joaquim@/admin@
// cetadp.teo.br, que nao tem caixa de e-mail real monitorada).
//
// A senha e digitada NA HORA, no seu proprio terminal, e nunca fica
// salva em arquivo nem em historico de comando.
//
// Uso (PowerShell, na pasta do projeto):
//   node --env-file=.env.local scripts/resetar-senha-admin.mjs cetadp@cetadp.teo.br
//
// Se o Node for mais antigo e nao aceitar --env-file, use:
//   $env:NEXT_PUBLIC_SUPABASE_URL="<copie do .env.local>"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<copie do .env.local>"
//   node scripts/resetar-senha-admin.mjs cetadp@cetadp.teo.br
// ============================================================

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/resetar-senha-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados.");
  console.error("Rode com: node --env-file=.env.local scripts/resetar-senha-admin.mjs " + email);
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

const { data: usuarios, error: buscaError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (buscaError) {
  console.error("Erro ao buscar usuarios:", buscaError.message);
  process.exit(1);
}

const usuario = usuarios.users.find((u) => u.email === email);
if (!usuario) {
  console.error(`Nenhuma conta encontrada com o e-mail ${email}.`);
  process.exit(1);
}

const novaSenha = await perguntarSenhaOculta(`Digite a nova senha para ${email}: `);
const confirmacao = await perguntarSenhaOculta("Confirme a nova senha: ");

if (novaSenha !== confirmacao) {
  console.error("As senhas nao coincidem. Nada foi alterado.");
  process.exit(1);
}
if (novaSenha.length < 8) {
  console.error("Senha muito curta (minimo 8 caracteres). Nada foi alterado.");
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(usuario.id, { password: novaSenha });
if (updateError) {
  console.error("Erro ao definir a senha:", updateError.message);
  process.exit(1);
}

console.log(`Senha atualizada com sucesso para ${email}.`);
