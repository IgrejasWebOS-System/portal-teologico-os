// ============================================================
// backup-storage.mjs (21/10/2026) - copia os arquivos do Supabase Storage de PRODUCAO.
// SOMENTE LEITURA: lista e baixa. Nunca grava, move nem apaga nada no Supabase.
//
// Uso (normalmente chamado por scripts\backup-storage.ps1):
//   node scripts\backup-storage.mjs <pasta-destino> [--dry-run]
//
// Variaveis de ambiente (usuario, NAO ficam no repositorio):
//   PORTAL_TEOLOGICO_PROD_SUPABASE_URL      https://toduvwtzklntyptcodkf.supabase.co
//   PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY  chave service_role de PRODUCAO
// Trava de seguranca: aborta se a URL nao for de producao ou se for a de staging.
//
// Saida: <destino>\<bucket>\<caminho do objeto>, mais MANIFEST.json (tamanho e SHA256
// de cada arquivo). Ao final compara o que foi listado com o que foi gravado.
// Ultima linha impressa: DEST=<pasta-destino> (usada pelo .ps1). Codigo de saida 1 se
// houver qualquer falha.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const REF_PROD = "toduvwtzklntyptcodkf";
const REF_STAGING = "cjxdroyyplpknygtcdgr";

const destRaw = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!destRaw) {
  console.error("Uso: node scripts\\backup-storage.mjs <pasta-destino> [--dry-run]");
  process.exit(2);
}
const dest = path.resolve(destRaw);

const url = process.env.PORTAL_TEOLOGICO_PROD_SUPABASE_URL;
const key = process.env.PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina PORTAL_TEOLOGICO_PROD_SUPABASE_URL e PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY (variaveis de usuario).");
  process.exit(2);
}
if (url.includes(REF_STAGING) || !url.includes(REF_PROD)) {
  console.error("ABORTADO: a URL nao e a de PRODUCAO (" + REF_PROD + "). Nada foi baixado.");
  process.exit(2);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PAGINA = 1000;

// Lista recursivamente todos os objetos de um bucket (pastas aparecem com id nulo).
async function listarBucket(bucket, prefixo = "") {
  const arquivos = [];
  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await sb.storage.from(bucket).list(prefixo, {
      limit: PAGINA,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("listar " + bucket + "/" + prefixo + ": " + error.message);
    const itens = data ?? [];
    for (const it of itens) {
      const caminho = prefixo ? prefixo + "/" + it.name : it.name;
      if (it.id === null) arquivos.push(...(await listarBucket(bucket, caminho)));
      else arquivos.push({ caminho, tamanho: Number(it.metadata?.size ?? 0) });
    }
    if (itens.length < PAGINA) break;
  }
  return arquivos;
}

// Nome seguro para o Windows (mantem o caminho original no manifesto).
function nomeLocal(caminho) {
  return caminho
    .split("/")
    .map((p) => p.replace(/[<>:"\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/, "_"))
    .filter((p) => p !== "" && p !== "." && p !== "..")
    .join(path.sep);
}

async function baixar(bucket, obj) {
  let ultimo;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const { data, error } = await sb.storage.from(bucket).download(obj.caminho);
    if (!error && data) {
      const buf = Buffer.from(await data.arrayBuffer());
      const rel = path.join(bucket, nomeLocal(obj.caminho));
      const alvo = path.join(dest, rel);
      if (!path.resolve(alvo).startsWith(dest + path.sep)) throw new Error("caminho fora do destino: " + obj.caminho);
      await mkdir(path.dirname(alvo), { recursive: true });
      await writeFile(alvo, buf);
      return { bucket, objeto: obj.caminho, arquivo: rel, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
    }
    ultimo = error?.message ?? "sem dados";
    await new Promise((r) => setTimeout(r, 500 * tentativa));
  }
  throw new Error(bucket + "/" + obj.caminho + ": " + ultimo);
}

async function main() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error("listBuckets: " + error.message);

  const plano = [];
  for (const b of buckets ?? []) {
    const objs = await listarBucket(b.name);
    plano.push({ bucket: b.name, objs });
    const total = objs.reduce((s, o) => s + o.tamanho, 0);
    console.log("[INFO] bucket " + b.name + ": " + objs.length + " arquivo(s), " + (total / 1048576).toFixed(1) + " MB");
  }
  const totalArq = plano.reduce((s, p) => s + p.objs.length, 0);
  const totalMb = plano.reduce((s, p) => s + p.objs.reduce((a, o) => a + o.tamanho, 0), 0) / 1048576;
  console.log("[INFO] Total a copiar: " + totalArq + " arquivo(s), " + totalMb.toFixed(1) + " MB");

  if (dryRun) {
    console.log("[INFO] --dry-run: nada foi baixado.");
    console.log("DEST=" + dest);
    return;
  }

  await mkdir(dest, { recursive: true });
  const manifesto = [];
  const falhas = [];
  const fila = plano.flatMap((p) => p.objs.map((o) => ({ bucket: p.bucket, obj: o })));
  let feitos = 0;
  const trabalhadores = Array.from({ length: 4 }, async () => {
    while (fila.length > 0) {
      const t = fila.shift();
      try {
        manifesto.push(await baixar(t.bucket, t.obj));
      } catch (e) {
        falhas.push(String(e.message ?? e));
      }
      feitos++;
      if (feitos % 50 === 0) console.log("[INFO] " + feitos + "/" + totalArq + " arquivo(s)...");
    }
  });
  await Promise.all(trabalhadores);

  manifesto.sort((a, b) => (a.arquivo < b.arquivo ? -1 : 1));
  await writeFile(
    path.join(dest, "MANIFEST.json"),
    JSON.stringify({ gerado_em: new Date().toISOString(), projeto: REF_PROD, arquivos: manifesto, falhas }, null, 2)
  );

  // Verificacao: tudo que foi listado precisa existir no disco com o mesmo tamanho.
  let divergencias = 0;
  for (const m of manifesto) {
    const s = await stat(path.join(dest, m.arquivo)).catch(() => null);
    if (!s || s.size !== m.bytes) divergencias++;
  }
  const bytesTotal = manifesto.reduce((s, m) => s + m.bytes, 0);
  console.log("[INFO] Gravados: " + manifesto.length + "/" + totalArq + " arquivo(s), " + (bytesTotal / 1048576).toFixed(1) + " MB, divergencias=" + divergencias + ", falhas=" + falhas.length);
  for (const f of falhas.slice(0, 20)) console.error("[ERRO] " + f);

  console.log("DEST=" + dest);
  if (falhas.length > 0 || divergencias > 0 || manifesto.length !== totalArq) process.exit(1);
}

main().catch((e) => {
  console.error("[ERRO] " + (e?.message ?? e));
  process.exit(1);
});
