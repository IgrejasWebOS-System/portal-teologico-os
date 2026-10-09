import { cpfVariantes } from "@/utils/cpf";
import type {
  ProvaItem,
  QuestaoItem,
  AlunoItem,
  ResultadoItem,
} from "@/components/provas/TestesProvasPainel";

// ============================================================
// Dados da tela "Testes e Provas" (professor e secretaria). O chamador já
// resolveu o ESCOPO (quais alunos/matrículas essa pessoa pode ver) e passa
// só esses; aqui só se leem provas públicas e respostas desses alunos.
// provas_publicas_respostas/questoes não têm policy para "authenticated"
// (só service_role) — por isso o `admin`. `any` de propósito: ver
// utils/staff.ts ("Type instantiation is excessively deep").
// ============================================================

export interface DadosTestesProvas {
  provas: ProvaItem[];
  alunos: AlunoItem[];
  resultados: ResultadoItem[];
  questoesPorProva: Record<string, QuestaoItem[]>;
}

export async function carregarDadosTestesProvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  alunosBase: { id: string; nome_completo: string; cpf: string | null; matricula?: string | null }[],
  matriculas: {
    aluno_id: string;
    course_edition_id: string | null;
    turma_nome: string | null;
    curso_nome?: string | null;
  }[]
): Promise<DadosTestesProvas> {
  const alunoIds = alunosBase.map((a) => a.id);

  const cpfsBusca = Array.from(
    new Set(alunosBase.filter((a) => a.cpf).flatMap((a) => cpfVariantes(a.cpf as string)))
  );

  const [{ data: provasRaw }, { data: porVinculo }, { data: porCpf }] = await Promise.all([
    admin
      .from("provas_publicas")
      .select("id, materia, titulo, slug, numero_teste")
      .eq("ativo", true)
      .order("materia")
      .order("numero_teste"),
    alunoIds.length
      ? admin
          .from("provas_publicas_respostas")
          .select("prova_id, cpf, ead_aluno_id, acertos, total, nota, aprovado, enviado_em, respostas")
          .in("ead_aluno_id", alunoIds)
      : Promise.resolve({ data: [] }),
    cpfsBusca.length
      ? admin
          .from("provas_publicas_respostas")
          .select("prova_id, cpf, ead_aluno_id, acertos, total, nota, aprovado, enviado_em, respostas")
          .in("cpf", cpfsBusca)
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provas: ProvaItem[] = ((provasRaw ?? []) as any[]).map((p) => ({
    id: p.id,
    materia: p.materia,
    titulo: p.titulo,
    slug: p.slug,
    numeroTeste: p.numero_teste,
  }));

  // CPF só-dígitos -> alunos (ead_alunos.cpf pode estar com ou sem máscara)
  const alunoPorCpf = new Map<string, string>();
  for (const a of alunosBase) {
    if (a.cpf) alunoPorCpf.set(a.cpf.replace(/\D/g, ""), a.id);
  }

  const resultadoPorChave = new Map<string, ResultadoItem>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of [...(porCpf ?? []), ...(porVinculo ?? [])] as any[]) {
    const alunoId: string | undefined = r.ead_aluno_id ?? alunoPorCpf.get(String(r.cpf).replace(/\D/g, ""));
    if (!alunoId) continue;
    const marcadas: Record<number, string> = {};
    if (Array.isArray(r.respostas)) {
      for (const item of r.respostas as { ordem: number; resposta: string }[]) {
        marcadas[item.ordem] = item.resposta;
      }
    }
    resultadoPorChave.set(`${alunoId}:${r.prova_id}`, {
      alunoId,
      provaId: r.prova_id,
      acertos: r.acertos,
      total: r.total,
      nota: Number(r.nota),
      aprovado: !!r.aprovado,
      enviadoEm: r.enviado_em,
      marcadas,
    });
  }
  const resultados = Array.from(resultadoPorChave.values());

  // Questões só das provas que alguém do escopo já fez (visualizar/imprimir).
  const provaIdsComResultado = Array.from(new Set(resultados.map((r) => r.provaId)));
  const questoesPorProva: Record<string, QuestaoItem[]> = {};
  if (provaIdsComResultado.length) {
    const { data: questoesRaw } = await admin
      .from("provas_publicas_questoes")
      .select("prova_id, ordem, formato, enunciado, opcoes, resposta_correta")
      .in("prova_id", provaIdsComResultado)
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

  const turmasPorAluno = new Map<string, Map<string, string>>();
  for (const m of matriculas) {
    if (!m.course_edition_id || !m.turma_nome) continue;
    const mapa = turmasPorAluno.get(m.aluno_id) ?? new Map<string, string>();
    mapa.set(m.course_edition_id, m.turma_nome);
    turmasPorAluno.set(m.aluno_id, mapa);
  }

  const cursosPorAluno = new Map<string, Set<string>>();
  for (const m of matriculas) {
    if (!m.curso_nome) continue;
    const set = cursosPorAluno.get(m.aluno_id) ?? new Set<string>();
    set.add(m.curso_nome);
    cursosPorAluno.set(m.aluno_id, set);
  }

  const alunos: AlunoItem[] = alunosBase
    .map((a) => ({
      id: a.id,
      nome: a.nome_completo,
      cpf: a.cpf ?? "",
      matricula: a.matricula ?? "",
      cursos: Array.from(cursosPorAluno.get(a.id) ?? []),
      turmas: Array.from(turmasPorAluno.get(a.id)?.entries() ?? []).map(([id, nome]) => ({ id, nome })),
    }))
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  return { provas, alunos, resultados, questoesPorProva };
}
