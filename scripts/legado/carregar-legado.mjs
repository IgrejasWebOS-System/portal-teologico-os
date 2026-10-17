// carregar-legado.mjs - Fase 1 da migracao do sistema antigo.
// Le os CSVs do sistema antigo e grava SOMENTE nas tabelas legado_* do STAGING.
//
// SEGURANCA:
//  - Recusa rodar se a URL do Supabase nao for o staging (cjxdroyyplpknygtcdgr).
//  - Por padrao e DRY-RUN (nao grava nada). Para gravar: --apply
//  - So escreve em tabelas legado_* (lista fixa abaixo). Nunca toca ead_*, profiles, auth.
//  - Campos sensiveis (saude, militar, titulo, certidoes, medico) nem sao lidos do CSV.
//  - Idempotente: usa upsert com ignore-duplicates (rodar de novo nao duplica).
//
// Uso (PowerShell, a partir de C:\Projetos\portal-teologico-os-staging):
//   node scripts\legado\carregar-legado.mjs                 (dry-run, todas as tabelas)
//   node scripts\legado\carregar-legado.mjs --apply alunos  (grava so alunos)
//   node scripts\legado\carregar-legado.mjs --apply         (grava todas)

import fs from "node:fs";
import path from "node:path";

const STAGING_REF = "cjxdroyyplpknygtcdgr";
const PROD_REF = "toduvwtzklntyptcodkf";
const CSV_DIR = process.env.LEGADO_CSV_DIR || "C:\\Projetos\\portal-teologico-os-documentos\\SistemaAntigo";
// 17/10/2026: alvo PRODUCAO so com --alvo=producao + --confirmo-producao e a chave num
// arquivo proprio (.env.producao.local, ignorado pelo git). Sem a flag, continua staging-only.
const ALVO_PROD = process.argv.includes("--alvo=producao");
const ENV_FILE = path.resolve(ALVO_PROD ? ".env.producao.local" : ".env.local");
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (ALVO_PROD && APPLY && !process.argv.includes("--confirmo-producao")) {
  console.error("ERRO: para gravar em PRODUCAO use --alvo=producao --apply --confirmo-producao (so apos backup).");
  process.exit(1);
}
const BATCH = 1000;

// ---------- env ----------
function lerEnv(file) {
  const out = {};
  for (const linha of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
if (!fs.existsSync(ENV_FILE)) {
  console.error("ERRO: " + ENV_FILE + " nao encontrado. Rode a partir da pasta portal-teologico-os-staging.");
  process.exit(1);
}
const env = lerEnv(ENV_FILE);
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const REF_ESPERADO = ALVO_PROD ? PROD_REF : STAGING_REF;
if (!URL_BASE.includes(REF_ESPERADO)) {
  console.error("ERRO DE SEGURANCA: a URL de " + path.basename(ENV_FILE) + " (" + URL_BASE + ") NAO e o alvo esperado (" + REF_ESPERADO + "). Abortando sem fazer nada.");
  process.exit(1);
}
if (!KEY) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY ausente em " + path.basename(ENV_FILE) + ".");
  process.exit(1);
}
console.log("ALVO: " + (ALVO_PROD ? "PRODUCAO" : "STAGING") + " (" + URL_BASE + ")");

// ---------- CSV ----------
function parseCsv(texto) {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c === "\r") { /* ignora */ }
    else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i] ?? ""])));
}
const v = (x) => { const s = (x ?? "").trim(); return s === "" ? null : s; };

// ---------- mapeamentos (lista branca de colunas) ----------
const TABELAS = {
  alunos: {
    arquivo: "aluno.csv", tabela: "legado_alunos", pk: "matricula_antiga",
    map: (r) => ({
      matricula_antiga: v(r.Matricula), nome: v(r.Nome), nome_social: v(r.nome_social),
      data_cadastro: v(r.DataCadastro), data_nascimento: v(r.DataNascimento),
      nacionalidade: v(r.Nacionalidade), profissao: v(r.Profissao), cargo: v(r.Cargo),
      sexo: v(r.Sexo), estado_civil: v(r.EstadoCivil), telefone: v(r.Telefone), celular: v(r.Celular),
      email: v(r.Email), logradouro: v(r.Logradouro), num_logradouro: v(r.NumLogradouro),
      complemento: v(r.Complemento), cod_bairro: v(r.CodBairro), cod_municipio: v(r.CodMunicipio),
      cep: v(r.CEP), rg: v(r.RG), orgao_expedidor: v(r.OrgaoExpedidor), cpf: v(r.CPF),
      observacoes: v(r.Observacoes), nome_mae: v(r.NomeDaMae), nome_pai: v(r.NomeDoPai),
    }),
  },
  matriculas: {
    arquivo: "aluno_turma.csv", tabela: "legado_matriculas", pk: "codigo",
    map: (r) => ({
      codigo: v(r.Codigo), mat_aluno: v(r.MatAluno), cod_turma: v(r.CodTurma),
      data_cadastro: v(r.DataCadastro), data_matricula: v(r.DataMatricula), situacao: v(r.Situacao),
      situacao_antiga: v(r.SituacaoAntiga), cod_motivo_inativacao: v(r.CodMotivoInativacao),
      data_inativacao: v(r.DataInativacao), observacoes: v(r.Observacoes),
    }),
  },
  notas: {
    arquivo: "nota.csv", tabela: "legado_notas", pk: "codigo",
    map: (r) => ({
      codigo: v(r.Codigo), cod_disciplina: v(r.CodDisciplina), cod_matricula: v(r.CodMatricula),
      cod_serie_avaliacao: v(r.CodSerieAvaliacao), valor: v(r.Valor), data_cadastro: v(r.DataCadastro),
    }),
  },
  frequencia: {
    arquivo: "presenca.csv", tabela: "legado_frequencia", pk: "codigo",
    map: (r) => ({ codigo: v(r.Codigo), cod_aula: v(r.CodAula), cod_matricula: v(r.CodMatricula), situacao: v(r.Situacao) }),
  },
  aulas: {
    arquivo: "aula.csv", tabela: "legado_aulas", pk: "codigo",
    map: (r) => ({ codigo: v(r.Codigo), bruto: Object.fromEntries(Object.entries(r).map(([k, x]) => [k, v(x)])) }),
  },
  avaliacoes: {
    arquivo: "serie_avaliacao.csv", tabela: "legado_avaliacoes", pk: "codigo",
    map: (r) => ({ codigo: v(r.Codigo), bruto: Object.fromEntries(Object.entries(r).map(([k, x]) => [k, v(x)])) }),
  },
};

// ---------- execucao ----------
async function enviar(tabela, pk, linhas) {
  const res = await fetch(`${URL_BASE}/rest/v1/${tabela}?on_conflict=${pk}`, {
    method: "POST",
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(linhas),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${tabela}: ${await res.text()}`);
}

const nomes = ONLY.length ? ONLY : Object.keys(TABELAS);
for (const n of nomes) {
  const t = TABELAS[n];
  if (!t) { console.error("Tabela desconhecida: " + n + " (validas: " + Object.keys(TABELAS).join(", ") + ")"); process.exit(1); }
  if (!t.tabela.startsWith("legado_")) { console.error("Bloqueado: so legado_*"); process.exit(1); }
  const arq = path.join(CSV_DIR, t.arquivo);
  if (!fs.existsSync(arq)) { console.error(`Arquivo nao encontrado: ${arq}`); process.exit(1); }
  const linhas = parseCsv(fs.readFileSync(arq, "utf8")).map(t.map).filter((l) => l[t.pk]);
  const unicos = new Set(linhas.map((l) => l[t.pk]));
  console.log(`[${n}] ${t.arquivo}: ${linhas.length} linhas validas, ${unicos.size} chaves unicas -> ${t.tabela}`);
  if (!APPLY) continue;
  for (let i = 0; i < linhas.length; i += BATCH) {
    await enviar(t.tabela, t.pk, linhas.slice(i, i + BATCH));
    process.stdout.write(`  enviado ${Math.min(i + BATCH, linhas.length)}/${linhas.length}\r`);
  }
  console.log(`\n  ${n}: OK`);
}
console.log(APPLY ? "FINALIZADO (gravado no " + (ALVO_PROD ? "PRODUCAO" : "STAGING") + ")." :"DRY-RUN: nada foi gravado. Use --apply para gravar.");
