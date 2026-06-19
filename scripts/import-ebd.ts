/**
 * Script de import EBD — WordPress REST API → Supabase
 * Portal Teológico · CETADP
 *
 * Audiências importadas: ADULTOS e JOVENS (CPAD)
 * Período: 2024-2026
 *
 * Como executar:
 *   npx tsx scripts/import-ebd.ts
 *
 * Dependências (instalar uma vez):
 *   npm install tsx cheerio @supabase/supabase-js --save-dev
 */

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ── Carrega .env.local automaticamente ─────────────────────────────────────

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✅  .env.local carregado.");
}

// ── Configuração ────────────────────────────────────────────────────────────

const WP_BASE     = "https://escolabiblicadominical.org/wp-json/wp/v2";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  .env.local não encontrado ou chaves ausentes.");
  console.error("    Certifique-se de que o arquivo .env.local existe na raiz do projeto.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Throttle: pausa entre requisições para não sobrecarregar o servidor externo
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Tipos internos ──────────────────────────────────────────────────────────

interface WpPost {
  id:       number;
  slug:     string;
  date:     string;
  link:     string;
  title:    { rendered: string };
  content:  { rendered: string };
  categories: number[];
}

interface WpCategory {
  id:   number;
  name: string;
  slug: string;
}

interface ParsedTitle {
  lessonNumber: number;
  lessonTitle:  string;
  quarter:      number;
  year:         number;
  audience:     "ADULTOS" | "JOVENS";
}

// ── Funções auxiliares ──────────────────────────────────────────────────────

/** Obtém todas as categorias e mapeia nome → id */
async function fetchCategories(): Promise<Map<string, number>> {
  const res  = await fetch(`${WP_BASE}/categories?per_page=100`);
  const cats = (await res.json()) as WpCategory[];
  const map  = new Map<string, number>();
  for (const c of cats) {
    map.set(c.slug, c.id);
    map.set(c.name.toLowerCase(), c.id);
  }
  return map;
}

/** Faz paginação completa de posts de uma categoria */
async function fetchAllPosts(
  categoryId: number,
  afterDate:  string
): Promise<WpPost[]> {
  const all: WpPost[] = [];
  let page = 1;

  while (true) {
    const url = `${WP_BASE}/posts?categories=${categoryId}&per_page=100&page=${page}&after=${afterDate}&_fields=id,slug,date,link,title,content,categories`;
    console.log(`  → página ${page}…`);

    const res = await fetch(url);
    if (!res.ok) break;

    const posts = (await res.json()) as WpPost[];
    if (!Array.isArray(posts) || posts.length === 0) break;

    all.push(...posts);
    page++;
    await sleep(800); // ~1 req/s
  }

  return all;
}

/**
 * Parseia o título do post no formato:
 * "Lição 01: Título | 2° Trimestre de 2026 | EBD ADULTOS"
 */
function parseTitle(raw: string): ParsedTitle | null {
  // Remove tags HTML residuais
  const text = raw.replace(/<[^>]+>/g, "").trim();

  // Regex: "Lição N: Título | Xo Trimestre de YYYY | EBD AUDIÊNCIA"
  const m = text.match(
    /Liç[aã]o\s+(\d+)\s*:\s*(.+?)\s*\|\s*(\d)[ºo°]\s*Trimestre\s+de\s+(\d{4})\s*\|\s*EBD\s+(\w+)/i
  );

  if (!m) return null;

  const audience = m[5].toUpperCase() as "ADULTOS" | "JOVENS";
  if (!["ADULTOS", "JOVENS"].includes(audience)) return null;

  return {
    lessonNumber: parseInt(m[1], 10),
    lessonTitle:  m[2].trim(),
    quarter:      parseInt(m[3], 10),
    year:         parseInt(m[4], 10),
    audience,
  };
}

/** Extrai texto limpo de um bloco HTML */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText($: cheerio.CheerioAPI, el: any): string {
  if (!el) return "";
  return $(el).text().replace(/\s+/g, " ").trim();
}

/**
 * Parseia o HTML da lição em campos estruturados.
 * O conteúdo do WordPress usa headings e bold para separar seções.
 */
function parseContent(html: string) {
  const $ = cheerio.load(html);

  // ── Texto Áureo ──
  let aureoText      = "";
  let aureoReference = "";
  const aureoMatch = html.match(/TEXTO\s+ÁUREO[\s\S]*?"([^"]+)"\s*\(([^)]+)\)/i);
  if (aureoMatch) {
    aureoText      = aureoMatch[1].trim();
    aureoReference = aureoMatch[2].trim();
  }

  // ── Verdade Prática ──
  let practicalTruth = "";
  const vtMatch = html.match(/VERDADE\s+(PRÁTICA|APLICADA)[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (vtMatch) {
    practicalTruth = cheerio.load(vtMatch[2]).text().trim();
  }

  // ── Hinos Sugeridos ──
  let suggestedHymns = "";
  const hinosMatch = html.match(/HINOS\s+SUGERIDOS[^:]*:\s*([^\n<.]+)/i);
  if (hinosMatch) {
    suggestedHymns = hinosMatch[1].trim();
  }

  // ── Leitura Diária ──
  const dailyReadings: Array<{ day: string; reference: string; description: string }> = [];
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  for (const day of days) {
    const regex = new RegExp(day + "\\s+[—–-]+?\\s+([\\w\\d.]+)\\s+([^\\n\\r<]+)", "i");
    const m = html.match(regex);
    if (m) {
      dailyReadings.push({
        day,
        reference:   m[1].trim(),
        description: m[2].replace(/<[^>]+>/g, "").trim(),
      });
    }
  }

  // ── Leitura Bíblica em Classe ──
  let classReadingRef  = "";
  let classReadingText = "";
  const lbMatch = html.match(
    /LEITURA\s+BÍBLICA\s+EM\s+CLASSE\s*[\s\S]*?([A-ZÀ-Ú][a-zà-ú]+\s+\d+\.\d+[–\-\d,\s]*)\.\s*([\s\S]*?)(?=PLANO\s+DE\s+AULA|INTRODUÇÃO|<h[2-4])/i
  );
  if (lbMatch) {
    classReadingRef  = lbMatch[1].trim();
    classReadingText = cheerio.load(lbMatch[2]).text().replace(/\s+/g, " ").trim();
  }

  // ── Introdução ──
  let introduction = "";
  const introMatch = html.match(/INTRODUÇÃO[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (introMatch) {
    introduction = cheerio.load(introMatch[1]).text().replace(/\s+/g, " ").trim();
  }

  // ── Conclusão ──
  let conclusion = "";
  const concMatch = html.match(/CONCLUSÃO[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (concMatch) {
    conclusion = cheerio.load(concMatch[1]).text().replace(/\s+/g, " ").trim();
  }

  // ── Tópicos (I-, II-, III-) ──
  const topics: Array<{
    number: number;
    title: string;
    subtopics: Array<{ number: number; title: string; content: string }>;
    synopsis: string | null;
    bibliological_aid: string | null;
    knowledge_expansion: string | null;
  }> = [];

  const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  const topicRegex = /(I{1,3}V?|IV|VI{0,3})[–—-]\s+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][^\n<]+)/g;
  let topicMatch: RegExpExecArray | null;

  // Divide o HTML em blocos por tópico
  const topicBlocks: Array<{ roman: string; title: string; html: string }> = [];
  const topicSplitRegex = /(?=<(?:h[2-5]|p|strong)[^>]*>(?:I{1,3}V?|IV|VI{0,3})[–—-]\s+[A-Z])/g;
  const topicHtmlBlocks = html.split(topicSplitRegex).filter(
    (b) => /^<(?:h[2-5]|p|strong)[^>]*>(?:I{1,3}V?|IV|VI{0,3})[–—-]/i.test(b)
  );

  // Fallback: parseia usando regex simples no texto completo
  const fullText = $.text();
  while ((topicMatch = topicRegex.exec(fullText)) !== null) {
    const roman   = topicMatch[1];
    const topicTitle = topicMatch[2].trim();
    if (romanMap[roman] && !topics.find((t) => t.number === romanMap[roman])) {
      // Extrai subtópicos pela numeração "1-" ou "1."
      const subtopics: Array<{ number: number; title: string; content: string }> = [];
      const subtopicRegex = new RegExp(
        roman + "[–—-]\\s+" + topicTitle.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "[\\s\\S]*?(?=(?:I{1,3}V?|IV|VI{0,3})[–—-]|SINOPSE|CONCLUSÃO)",
        "i"
      );
      const blockMatch = fullText.match(subtopicRegex);
      if (blockMatch) {
        const subReg = /(\d+)[–—-]\s+([^\n]+)\n([\s\S]*?)(?=\d+[–—-]|\nSINOPSE|\nAUXÍLIO|$)/g;
        let subM: RegExpExecArray | null;
        while ((subM = subReg.exec(blockMatch[0])) !== null) {
          subtopics.push({
            number:  parseInt(subM[1], 10),
            title:   subM[2].trim(),
            content: subM[3].replace(/\s+/g, " ").trim(),
          });
        }
      }

      // Sinopse
      let synopsis: string | null = null;
      const synopsisReg = new RegExp(
        "SINOPSE\\s+" + (romanMap[roman] === 1 ? "I" : romanMap[roman] === 2 ? "II" : "III") +
        "\\s*([^\\n]+)",
        "i"
      );
      const synM = fullText.match(synopsisReg);
      if (synM) synopsis = synM[1].trim();

      topics.push({
        number:              romanMap[roman],
        title:               topicTitle,
        subtopics,
        synopsis,
        bibliological_aid:   null,
        knowledge_expansion: null,
      });
    }
  }

  // ── Revisando o Conteúdo ──
  const reviewQuestions: Array<{ number: number; question: string; answer: string }> = [];
  const revisandoMatch = fullText.match(/REVISANDO\s+O\s+CONTEÚDO([\s\S]*?)$/i);
  if (revisandoMatch) {
    const block = revisandoMatch[1];
    const qReg  = /(\d+)[–—-]\s*([^\n?]+\?)\s*([\s\S]*?)(?=\d+[–—-]|$)/g;
    let qM: RegExpExecArray | null;
    while ((qM = qReg.exec(block)) !== null) {
      reviewQuestions.push({
        number:   parseInt(qM[1], 10),
        question: qM[2].trim(),
        answer:   qM[3].replace(/\s+/g, " ").trim(),
      });
    }
  }

  return {
    aureoText,
    aureoReference,
    practicalTruth,
    suggestedHymns,
    dailyReadings,
    classReadingRef,
    classReadingText,
    introduction,
    conclusion,
    topics,
    reviewQuestions,
  };
}

// ── Import por audiência ────────────────────────────────────────────────────

async function importAudience(
  categoryId: number,
  audience:   "ADULTOS" | "JOVENS",
  publisher:  "CPAD",
  afterDate:  string
) {
  console.log(`\n📖  Buscando posts para ${audience}...`);
  const posts = await fetchAllPosts(categoryId, afterDate);
  console.log(`   ${posts.length} posts encontrados.`);

  // Agrupa por trimestre/ano para criar os quarters
  const quarterMap = new Map<string, { year: number; quarter: number; posts: WpPost[] }>();

  for (const post of posts) {
    const parsed = parseTitle(post.title.rendered);
    if (!parsed || parsed.audience !== audience) continue;

    const key = `${parsed.year}-${parsed.quarter}`;
    if (!quarterMap.has(key)) {
      quarterMap.set(key, { year: parsed.year, quarter: parsed.quarter, posts: [] });
    }
    quarterMap.get(key)!.posts.push(post);
  }

  console.log(`   ${quarterMap.size} trimestres identificados.`);

  for (const [, { year, quarter, posts: qPosts }] of quarterMap) {
    // 1. Upsert do trimestre
    const { data: quarterRow, error: qErr } = await supabase
      .from("ebd_quarters")
      .upsert(
        { year, quarter, audience, publisher, lesson_count: qPosts.length },
        { onConflict: "year,quarter,audience,publisher" }
      )
      .select("id")
      .single();

    if (qErr || !quarterRow) {
      console.error(`   ❌  Erro ao criar trimestre ${year}-Q${quarter}:`, qErr?.message);
      continue;
    }

    console.log(`\n   📅  ${year} — ${quarter}° Trimestre (${qPosts.length} lições)`);

    // 2. Para cada lição do trimestre
    for (const post of qPosts) {
      const parsed = parseTitle(post.title.rendered);
      if (!parsed) continue;

      const parsed2 = parseContent(post.content.rendered);

      const { error: lErr } = await supabase
        .from("ebd_lessons")
        .upsert(
          {
            quarter_id:        quarterRow.id,
            lesson_number:     parsed.lessonNumber,
            title:             parsed.lessonTitle,
            aureo_text:        parsed2.aureoText      || null,
            aureo_reference:   parsed2.aureoReference || null,
            practical_truth:   parsed2.practicalTruth || null,
            suggested_hymns:   parsed2.suggestedHymns || null,
            class_reading_ref: parsed2.classReadingRef  || null,
            class_reading_text: parsed2.classReadingText || null,
            introduction:      parsed2.introduction || null,
            conclusion:        parsed2.conclusion   || null,
            daily_readings:    parsed2.dailyReadings,
            topics:            parsed2.topics,
            review_questions:  parsed2.reviewQuestions,
            source_url:        post.link,
            imported_at:       new Date().toISOString(),
          },
          { onConflict: "quarter_id,lesson_number" }
        );

      if (lErr) {
        console.error(`     ❌  Lição ${parsed.lessonNumber}: ${lErr.message}`);
      } else {
        console.log(`     ✅  Lição ${String(parsed.lessonNumber).padStart(2, "0")}: ${parsed.lessonTitle}`);
      }

      await sleep(300);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Import EBD — Escola Bíblica Dominical");
  console.log(`    URL Supabase: ${SUPABASE_URL}`);
  console.log(`    Período:      2024-2026\n`);

  // Busca os IDs das categorias no WordPress
  console.log("📂  Buscando categorias do WordPress...");
  const catMap = await fetchCategories();

  // Tenta múltiplos slugs para ADULTOS
  const adultosId =
    catMap.get("ebd-adultos") ??
    catMap.get("ebd-adultos-cpad") ??
    catMap.get("ebd | adultos");

  // Tenta múltiplos slugs para JOVENS
  const jovensId =
    catMap.get("ebd-jovens") ??
    catMap.get("ebd-jovens-cpad") ??
    catMap.get("ebd | jovens");

  if (!adultosId) {
    console.error("❌  Categoria EBD Adultos não encontrada. Categorias disponíveis:");
    console.log([...catMap.entries()].map(([k, v]) => `   ${v}: ${k}`).join("\n"));
    process.exit(1);
  }

  if (!jovensId) {
    console.error("❌  Categoria EBD Jovens não encontrada.");
    process.exit(1);
  }

  console.log(`   ✅  ADULTOS → categoria ${adultosId}`);
  console.log(`   ✅  JOVENS  → categoria ${jovensId}`);

  const afterDate = "2024-01-01T00:00:00";

  await importAudience(adultosId, "ADULTOS", "CPAD", afterDate);
  await importAudience(jovensId,  "JOVENS",  "CPAD", afterDate);

  console.log("\n🎉  Import concluído!");
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
