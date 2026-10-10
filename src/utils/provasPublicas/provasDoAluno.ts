import { cpfVariantes } from "@/utils/cpf";

// ============================================================
// Provas feitas pelo link público (/prova-publica/<slug>, CPF) de UM aluno,
// para mostrar no portal dele (Provas e Testes / Impressão > Testes).
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
}

export async function carregarProvasPublicasDoAluno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  aluno: { id: string; cpf: string | null }
): Promise<ProvaPublicaDoAluno[]> {
  const selecao = "prova_id, cpf, ead_aluno_id, acertos, total, nota, aprovado, enviado_em";
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

  const { data: provas } = await admin
    .from("provas_publicas")
    .select("id, titulo, materia, numero_teste")
    .in("id", Array.from(porProva.keys()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoProva = new Map<string, any>(((provas ?? []) as any[]).map((p) => [p.id, p]));

  return Array.from(porProva.values())
    .map((r) => ({
      provaId: r.prova_id as string,
      titulo: (infoProva.get(r.prova_id)?.titulo as string) ?? "Teste",
      materia: (infoProva.get(r.prova_id)?.materia as string) ?? "",
      acertos: r.acertos as number,
      total: r.total as number,
      nota: Number(r.nota),
      aprovado: !!r.aprovado,
      enviadoEm: r.enviado_em as string,
    }))
    .sort((a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime());
}
