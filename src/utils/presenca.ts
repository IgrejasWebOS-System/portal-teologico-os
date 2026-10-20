// ============================================================
// Controle de presença (migration 140, 17/10/2026) — lógica server-only
// compartilhada entre a tela do professor e a da secretaria.
// Toda escrita passa pelas funções SECURITY DEFINER (só service_role) e
// grava também em auditoria_acoes. `db` é `any` de propósito (mesmo motivo
// de utils/staff.ts).
// ============================================================

import { registrarAuditoria, type PapelAuditoria } from "@/utils/auditoria";

export type PapelPresenca = "PROFESSOR" | "SECRETARIA";

export interface EntradaChamada {
  editionId: string;
  lessonId: string;
  data: string; // YYYY-MM-DD
  presentes: Set<string>; // matriculas marcadas como PRESENTE
  justificadas?: Set<string>; // depende da matriz de permissões
  fechar: boolean;
  motivo: string;
  atorUserId: string;
  professorId: string | null; // professor responsável (ou quem lançou)
  papel: PapelPresenca;
}

export interface ResultadoChamada {
  ok: boolean;
  mensagem: string;
}

function limpaErro(msg: string): string {
  // Funções do banco lançam mensagens em português sem acento — repassa como estão.
  return msg.replace(/^.*?(Nao |O professor|Data |Esta |Somente |Informe |Prazo |A aula |Turma )/, "$1");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registrarChamada(db: any, e: EntradaChamada): Promise<ResultadoChamada> {
  const papelAud: PapelAuditoria = e.papel;

  const { data: encontroId, error: errAbrir } = await db.rpc("presenca_abrir_encontro", {
    p_edition: e.editionId,
    p_lesson: e.lessonId,
    p_data: e.data,
    p_ator: e.atorUserId,
    p_professor: e.professorId,
    p_papel: e.papel,
  });
  if (errAbrir || !encontroId) {
    return { ok: false, mensagem: limpaErro(errAbrir?.message ?? "Não foi possível abrir a chamada.") };
  }

  const { data: encontro } = await db
    .from("aula_encontros")
    .select("id, status")
    .eq("id", encontroId)
    .single();
  const fechada = encontro?.status === "FECHADA";

  if (fechada && e.motivo.trim().length < 5) {
    return { ok: false, mensagem: "Esta chamada já foi fechada. Para corrigir, informe o motivo (mínimo 5 caracteres)." };
  }
  if (fechada && e.fechar) {
    return { ok: false, mensagem: "Esta chamada já foi fechada." };
  }

  // Lista oficial de quem entra na chamada: matrículas em andamento da turma.
  const { data: matriculas } = await db
    .from("ead_matriculas")
    .select("id")
    .eq("course_edition_id", e.editionId)
    .eq("status", "EM_ANDAMENTO");
  const idsTurma = new Set<string>((matriculas ?? []).map((m: { id: string }) => m.id));

  const { data: existentes } = await db
    .from("aula_presencas")
    .select("matricula_id, situacao")
    .eq("encontro_id", encontroId);
  const atual = new Map<string, string>((existentes ?? []).map((p: { matricula_id: string; situacao: string }) => [p.matricula_id, p.situacao]));

  // Quem pode justificar é decidido pela matriz de permissões no banco (presenca_permite).
  const justificadas = e.justificadas ?? new Set<string>();
  // Em chamada aberta, quem não foi marcado fica sem registro (vira FALTA ao fechar).
  // Se já tinha PRESENTE e foi desmarcado, vira FALTA na hora (fica no histórico).
  const alvo = new Map<string, string | null>();
  for (const id of idsTurma) {
    if (e.presentes.has(id)) alvo.set(id, "PRESENTE");
    else if (justificadas.has(id)) alvo.set(id, "JUSTIFICADA");
    else if (fechada || atual.has(id)) alvo.set(id, "FALTA");
    else alvo.set(id, null);
  }

  let alteracoes = 0;
  for (const [matriculaId, situacao] of alvo) {
    if (!situacao || atual.get(matriculaId) === situacao) continue;
    const { error } = await db.rpc("presenca_marcar", {
      p_encontro: encontroId,
      p_matricula: matriculaId,
      p_situacao: situacao,
      p_ator: e.atorUserId,
      p_papel: e.papel,
      p_motivo: fechada ? e.motivo : null,
    });
    if (error) return { ok: false, mensagem: limpaErro(error.message) };
    alteracoes++;
  }

  let faltas = 0;
  if (e.fechar && !fechada) {
    const { data: n, error } = await db.rpc("presenca_fechar_chamada", {
      p_encontro: encontroId,
      p_ator: e.atorUserId,
      p_papel: e.papel,
    });
    if (error) return { ok: false, mensagem: limpaErro(error.message) };
    faltas = Number(n ?? 0);
  }

  await registrarAuditoria(db, {
    ator: { userId: e.atorUserId, professorId: e.papel === "PROFESSOR" ? e.professorId : null },
    papel: papelAud,
    acao: fechada ? "CORRIGIR_CHAMADA" : e.fechar ? "FECHAR_CHAMADA" : "SALVAR_CHAMADA",
    entidade: "aula_encontros",
    entidadeId: String(encontroId),
    detalhe: {
      course_edition_id: e.editionId,
      lesson_id: e.lessonId,
      data: e.data,
      alteracoes,
      faltas_geradas: faltas,
      motivo: fechada ? e.motivo.trim() : null,
    },
  });

  if (fechada) return { ok: true, mensagem: `Correção registrada (${alteracoes} alteração(ões)) e gravada no histórico.` };
  if (e.fechar) return { ok: true, mensagem: `Chamada fechada. ${faltas} falta(s) registrada(s) para quem não foi marcado.` };
  return { ok: true, mensagem: "Chamada salva. Ela continua aberta: feche a chamada ao terminar para registrar as faltas." };
}
