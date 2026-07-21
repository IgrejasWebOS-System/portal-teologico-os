import { createAdminClient } from "@/utils/supabase/admin";
import type {
  AlunoResumo,
  MatriculaResumo,
  ParcelaResumo,
  AvaliacaoResumo,
} from "@/components/aluno/AreaDoAlunoPainel";

export interface AlunoPainelData {
  aluno: AlunoResumo;
  matriculas: MatriculaResumo[];
  parcelas: ParcelaResumo[];
  avaliacoes: AvaliacaoResumo[];
}

// ============================================================
// Carrega tudo que o bloco "Minha Área" (embutido no Sidebar)
// precisa pra um usuário logado: ficha do aluno, matrículas
// oficiais, parcelas financeiras e histórico de avaliações.
// Retorna null se o usuário não tiver ficha de aluno oficial
// (ead_alunos) — usado tanto pra decidir o que renderizar quanto
// pra decidir se é "aluno oficial" (esconde Módulos no Sidebar).
// Reaproveitado pelos layouts de (escola), (cursos) e (ebd).
// ============================================================
export async function carregarAlunoPainelData(
  // `any` de propósito — ver o comentário em utils/staff.ts sobre
  // "Type instantiation is excessively deep" ao tipar estruturalmente
  // o SupabaseClient. Segurança fica por conta da RLS/query em runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<AlunoPainelData | null> {
  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id, nome_completo, cpf, email, telefone, campo_ministerio_nome, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aluno) return null;

  const { data: matriculasRaw } = await supabase
    .from("ead_matriculas")
    .select("id, curso_nome_snapshot, matricula, status, data_matricula")
    .eq("aluno_id", aluno.id)
    .order("data_matricula", { ascending: false });

  const matriculaIds =
    (matriculasRaw ?? []).length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (matriculasRaw ?? []).map((m: any) => m.id)
      : ["00000000-0000-0000-0000-000000000000"];

  // fin_contas_receber só tem policy de staff — usa o client admin
  // aqui, sempre filtrado pelo aluno_id já validado acima (a ficha
  // do próprio usuário logado, confirmada via RLS na consulta
  // anterior), então não vaza dado de outro aluno.
  const admin = createAdminClient();

  const [{ data: parcelasRaw }, { data: avaliacoesRaw }] = await Promise.all([
    admin
      .from("fin_contas_receber")
      .select("descricao, numero_parcela, total_parcelas, valor_bruto_centavos, status, data_vencimento, responsavel_pagamento")
      .eq("aluno_id", aluno.id)
      .order("data_vencimento", { ascending: true }),
    supabase
      .from("avaliacoes")
      .select("tipo, status, nota, aprovado, num_questoes, acertos, finalizada_em")
      .in("matricula_id", matriculaIds)
      .order("iniciada_em", { ascending: false }),
  ]);

  return {
    aluno: {
      nomeCompleto: aluno.nome_completo,
      cpf: aluno.cpf,
      email: aluno.email,
      telefone: aluno.telefone,
      campoMinisterioNome: aluno.campo_ministerio_nome,
      status: aluno.status,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matriculas: (matriculasRaw ?? []).map((m: any) => ({
      id: m.id,
      cursoNomeSnapshot: m.curso_nome_snapshot,
      matricula: m.matricula,
      status: m.status,
      dataMatricula: m.data_matricula,
    })),
    parcelas: (parcelasRaw ?? []).map((p) => ({
      descricao: p.descricao,
      numeroParcela: p.numero_parcela,
      totalParcelas: p.total_parcelas,
      valorBrutoCentavos: p.valor_bruto_centavos,
      status: p.status,
      dataVencimento: p.data_vencimento,
      responsavelPagamento: p.responsavel_pagamento,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    avaliacoes: (avaliacoesRaw ?? []).map((a: any) => ({
      tipo: a.tipo,
      status: a.status,
      nota: a.nota,
      aprovado: a.aprovado,
      numQuestoes: a.num_questoes,
      acertos: a.acertos,
      finalizadaEm: a.finalizada_em,
    })),
  };
}
