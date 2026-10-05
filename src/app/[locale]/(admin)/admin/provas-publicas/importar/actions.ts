"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { parseTesteProva } from "@/utils/provasPublicas/parseTesteProva";
import { parseGabaritoTestesParciais } from "@/utils/provasPublicas/parseGabaritoTestesParciais";
import { cruzarProvaComGabarito } from "@/utils/provasPublicas/cruzarProvaComGabarito";

// pdf-parse tem um `require` de debug no index.js principal que em
// alguns bundlers (webpack/Next.js) tenta ler um arquivo de teste que não
// existe no ambiente de produção. NÃO TESTADO nesta sessão (ambiente de
// execução indisponível) — se o build falhar com erro apontando pra
// "pdf-parse/test/data", trocar esta linha para:
//   const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
import pdfParse from "pdf-parse";

// ============================================================
// Importação automática de provas públicas a partir de PDF (02/10/2026,
// pedido do Joaquim: "transformar essa rotina em uma linha de código").
// Mesmo módulo de 123_provas_publicas_link_cpf.sql — só automatiza a
// extração que antes era feita manualmente (ler o PDF, montar o SQL).
//
// Fluxo em duas etapas, de propósito:
//   1. extrairPreviewAction  — só lê e organiza, NÃO grava nada no banco.
//   2. confirmarImportacaoAction — grava, só depois da secretaria
//      revisar/corrigir cada questão na tela de preview.
// Nunca pular a etapa 1: a extração por PDF é best-effort (ver avisos
// nos parsers), publicar sem revisão arrisca gabarito errado chegando
// pro aluno.
// ============================================================

async function exigirStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return checkIsStaff(supabase, user.id);
}

function slugify(materia: string, numeroTeste: number | null): string {
  const base = materia
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return numeroTeste != null ? `${base}-teste-${numeroTeste}` : `${base}-teste`;
}

export interface PreviewQuestao {
  ordem: number;
  enunciado: string;
  resposta: "C" | "E" | null;
}

export interface PreviewProva {
  arquivo: string;
  numeroTeste: number | null;
  titulo: string;
  slugSugerido: string;
  questoes: PreviewQuestao[];
  avisos: string[];
  /**
   * Texto bruto (primeiros ~1500 caracteres) extraído deste PDF de teste
   * pelo pdf-parse — diagnóstico pra ajustar as regras de extração quando
   * o resultado não bate com o esperado (03/10/2026).
   */
  amostraTexto: string;
}

export type ExtrairPreviewResultado =
  | { success: true; provas: PreviewProva[]; amostraTextoGabarito: string }
  | { success: false; message: string };

export async function extrairPreviewAction(formData: FormData): Promise<ExtrairPreviewResultado> {
  if (!(await exigirStaff())) {
    return { success: false, message: "Acesso restrito à secretaria do CETADP." };
  }

  const materia = (formData.get("materia") as string | null)?.trim();
  if (!materia) return { success: false, message: "Informe o nome da matéria." };

  const gabaritoFile = formData.get("gabarito") as File | null;
  if (!gabaritoFile || gabaritoFile.size === 0) {
    return { success: false, message: 'Envie o PDF do gabarito (o que tem a seção "TESTES PARCIAIS").' };
  }

  const testesEnviados = formData.getAll("testes").filter((f): f is File => f instanceof File && f.size > 0);
  if (testesEnviados.length === 0) {
    return { success: false, message: "Envie pelo menos um PDF de teste." };
  }

  let gabaritoTexto: string;
  try {
    const buffer = Buffer.from(await gabaritoFile.arrayBuffer());
    gabaritoTexto = (await pdfParse(buffer)).text;
  } catch (err) {
    console.error("[provas-publicas/importar] erro lendo PDF do gabarito:", err);
    return { success: false, message: "Não consegui ler o PDF do gabarito. Confira se o arquivo não está corrompido ou protegido por senha." };
  }

  const gabarito = parseGabaritoTestesParciais(gabaritoTexto);
  const provas: PreviewProva[] = [];

  for (const file of testesEnviados) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const texto = (await pdfParse(buffer)).text;
      const extraido = parseTesteProva(texto);
      const { questoes, avisos, amostraTexto } = cruzarProvaComGabarito(extraido, gabarito);

      const titulo =
        extraido.licaoInicio != null && extraido.licaoFim != null
          ? `Teste ${extraido.numeroTeste ?? "?"} - Lições ${extraido.licaoInicio} e ${extraido.licaoFim}`
          : `Teste ${extraido.numeroTeste ?? "?"} (confira o título)`;

      provas.push({
        arquivo: file.name,
        numeroTeste: extraido.numeroTeste,
        titulo,
        slugSugerido: slugify(materia, extraido.numeroTeste),
        questoes,
        avisos,
        amostraTexto,
      });
    } catch (err) {
      console.error("[provas-publicas/importar] erro lendo PDF de teste:", file.name, err);
      provas.push({
        arquivo: file.name,
        numeroTeste: null,
        titulo: `Erro ao ler "${file.name}"`,
        slugSugerido: "",
        questoes: [],
        avisos: [`Não consegui ler este PDF (${file.name}). Confira se o arquivo não está corrompido, protegido por senha, ou se é uma imagem escaneada (sem texto selecionável).`],
        amostraTexto: "",
      });
    }
  }

  provas.sort((a, b) => (a.numeroTeste ?? 999) - (b.numeroTeste ?? 999));

  return { success: true, provas, amostraTextoGabarito: gabarito.amostraTexto };
}

export interface ConfirmarImportacaoPayload {
  materia: string;
  lessonId: string | null;
  provas: {
    numeroTeste: number;
    titulo: string;
    slug: string;
    questoes: { ordem: number; enunciado: string; resposta: "C" | "E" }[];
  }[];
}

export type ConfirmarImportacaoResultado =
  | { success: true; criadas: number }
  | { success: false; message: string };

export async function confirmarImportacaoAction(
  payload: ConfirmarImportacaoPayload
): Promise<ConfirmarImportacaoResultado> {
  if (!(await exigirStaff())) {
    return { success: false, message: "Acesso restrito à secretaria do CETADP." };
  }

  const materia = payload.materia?.trim();
  if (!materia) return { success: false, message: "Matéria não informada." };
  if (!payload.provas?.length) return { success: false, message: "Nenhuma prova para criar." };

  for (const p of payload.provas) {
    if (!p.slug?.trim()) return { success: false, message: `Teste ${p.numeroTeste} sem slug — preencha antes de confirmar.` };
    if (!p.questoes?.length) return { success: false, message: `Teste ${p.numeroTeste} não tem nenhuma questão.` };
    if (p.questoes.some((q) => q.resposta !== "C" && q.resposta !== "E")) {
      return { success: false, message: `Teste ${p.numeroTeste} tem questão sem resposta C/E definida — volte e corrija antes de confirmar.` };
    }
  }

  const admin = createAdminClient();
  let criadas = 0;

  for (const p of payload.provas) {
    const { data: prova, error: erroProva } = await admin
      .from("provas_publicas")
      .upsert(
        {
          materia,
          titulo: p.titulo,
          numero_teste: p.numeroTeste,
          slug: p.slug.trim(),
          lesson_id: payload.lessonId,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (erroProva || !prova) {
      console.error("[provas-publicas/importar] erro criando prova:", erroProva);
      return {
        success: false,
        message: `Erro ao criar o Teste ${p.numeroTeste} (slug "${p.slug}"). Se o slug já existe de outra prova, troque antes de confirmar.`,
      };
    }

    // Substitui as questões -- permite reimportar o mesmo teste depois de
    // corrigir algo no PDF original, sem duplicar linha.
    const { error: erroDelete } = await admin.from("provas_publicas_questoes").delete().eq("prova_id", prova.id);
    if (erroDelete) {
      console.error("[provas-publicas/importar] erro limpando questões antigas:", erroDelete);
    }

    const { error: erroQuestoes } = await admin.from("provas_publicas_questoes").insert(
      p.questoes.map((q) => ({
        prova_id: prova.id,
        ordem: q.ordem,
        formato: "CERTO_ERRADO" as const,
        enunciado: q.enunciado,
        resposta_correta: q.resposta,
      }))
    );

    if (erroQuestoes) {
      console.error("[provas-publicas/importar] erro criando questões:", erroQuestoes);
      return { success: false, message: `A prova "${p.slug}" foi criada, mas houve erro gravando as questões. Tente importar este teste de novo.` };
    }

    criadas += 1;
  }

  return { success: true, criadas };
}
