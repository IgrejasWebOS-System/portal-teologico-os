import { cpfVariantes } from "@/utils/cpf";
import type { QuestaoItem } from "@/components/provas/TestesProvasPainel";

// ============================================================
// Provas feitas pelo link público (/prova-publica/<slug>, CPF) de UM aluno,
// para mostrar no portal dele (Provas e Testes / Impressão > Testes e Prova).
// provas_publicas_respostas não tem policy para "authenticated" — leitura só
// via service_role (`admin`). O chamador já validou de quem é o aluno.
// `any` de propósito: ver utils/staff.ts.
// ============================================================

export interface ProvaPublicaDoAluno {
  provaId: string;
  titulo: string;
  materia: string;
  acertos: number;
  total: number;
  nota: number;
  aprovado: boolean;
  enviadoEm: string;
  // Só quando `comQuestoes` = true (telas com Visualizar/Imprimir).
  marcadas: Record<number, string>;
  questoes: QuestaoItem[];
}

export async function carregarProvasPublicasDoAluno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  aluno: { id: string; cpf: string | null },
  opcoes: { comQuestoes?: boolean } = {}
): Promise<ProvaPublicaDoAluno[]> {
  const comQuestoes = !!opcoes.comQuestoes;
  const selecao = `prova_id, cpf, ead_aluno_id, acertos, total, nota, aprovado, enviado_em${comQuestoes ? ", respostas" : ""}`;
  const [{ data: porVinculo }, { data: porCpf }] = await Promise.all([
    admin.from("provas_publicas_respostas").select(selecao).eq("ead_aluno_id", aluno.id),
    aluno.cpf
      ? admin.from("provas_publicas_respostas").select(selecao).in("cpf", cpfVariantes(aluno.cpf))
      : Promise.resolve({ data: [] }),
  ]);

  // Uma resposta por prova (a mais recente), sem duplicar vínculo + CPF.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const porProva = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of [...(porCpf ?? []), ...(porVinculo ?? [])] as any[]) {
    const atual = porProva.get(r.prova_id);
    if (!atual || new Date(r.enviado_em) > new Date(atual.enviado_em)) porProva.set(r.prova_id, r);
  }
  if (porProva.size === 0) return [];

  const provaIds = Array.from(porProva.keys());
  const { data: provas } = await admin
    .from("provas_publicas")
    .select("id, titulo, materia, numero_teste")
    .in("id", provaIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoProva = new Map<string, any>(((provas ?? []) as any[]).map((p) => [p.id, p]));

  const questoesPorProva: Record<string, QuestaoItem[]> = {};
  if (comQuestoes) {
    const { data: questoesRaw } = await admin
      .from("provas_publicas_questoes")
      .select("prova_id, ordem, formato, enunciado, opcoes, resposta_correta")
      .in("prova_id", provaIds)
      .order("ordem");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const q of (questoesRaw ?? []) as any[]) {
      (questoesPorProva[q.prova_id] ??= []).push({
        ordem: q.ordem,
        formato: q.formato,
        enunciado: q.enunciado,
        opcoes: Array.isArray(q.opcoes) ? (q.opcoes as string[]) : null,
        respostaCorreta: q.resposta_correta,
      });
    }
  }

  return Array.from(porProva.values())
    .map((r) => {
      const marcadas: Record<number, string> = {};
      if (comQuestoes && Array.isArray(r.respostas)) {
        for (const item of r.respostas as { ordem: number; resposta: string }[]) {
          marcadas[item.ordem] = item.resposta;
        }
      }
      return {
        provaId: r.prova_id as string,
        titulo: (infoProva.get(r.prova_id)?.titulo as string) ?? "Teste",
        materia: (infoProva.get(r.prova_id)?.materia as string) ?? "",
        acertos: r.acertos as number,
        total: r.total as number,
        nota: Number(r.nota),
        aprovado: !!r.aprovado,
        enviadoEm: r.enviado_em as string,
        marcadas,
        questoes: questoesPorProva[r.prova_id] ?? [],
      };
    })
    .sort((a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime());
}

// Prova final x teste por matéria: pelo título ("Prova ..." = prova).
export function ehProvaFinal(titulo: string) {
  return /^\s*prova/i.test(titulo);
}
