"use server";

// Ações do controle de presença (professor, secretaria de núcleo/setor e secretaria geral).
// Cada ação re-resolve QUEM é o operador e se a turma está no escopo dele; só depois
// escreve, via funções SECURITY DEFINER (service_role). Tudo grava em auditoria_acoes.

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { registrarAuditoria } from "@/utils/auditoria";
import { registrarChamada } from "@/utils/presenca";
import { ehModo, resolverContexto, turmasDoEscopo } from "@/utils/presenca-contexto";

const BASE: Record<string, string> = {
  professor: "/professor/presenca",
  secretaria: "/secretaria/presenca",
  admin: "/admin/presenca",
};

function limpa(msg: string): string {
  return msg.replace(/^.*?(Nao |Este |Informe |Prazo |Somente |O professor|Data |A aula |Turma )/, "$1");
}

async function entrar(formData: FormData) {
  const modoRaw = formData.get("modo");
  if (!ehModo(modoRaw)) redirect("/");
  const modo = modoRaw;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = await resolverContexto(supabase, user.id, modo);
  if (!ctx) redirect("/");
  const admin = createAdminClient();
  const volta = (qs: Record<string, string>, tipo: "msg" | "error", texto: string): never => {
    const p = new URLSearchParams({ ...qs, [tipo]: texto });
    return redirect(`${BASE[modo]}?${p.toString()}`);
  };
  return { ctx, supabase, admin, volta };
}

function qsBase(formData: FormData): Record<string, string> {
  const q: Record<string, string> = {};
  for (const k of ["turma", "aula", "data", "aba"]) {
    const v = formData.get(k);
    if (typeof v === "string" && v) q[k] = v;
  }
  return q;
}

export async function presencaSalvarChamadaAction(formData: FormData) {
  const { ctx, supabase, admin, volta } = await entrar(formData);
  const qs = qsBase(formData);
  const editionId = qs.turma ?? "";
  const lessonId = qs.aula ?? "";
  const data = qs.data ?? "";
  if (!editionId || !lessonId || !/^\d{4}-\d{2}-\d{2}$/.test(data)) volta(qs, "error", "Selecione turma, aula e data.");

  const turmas = await turmasDoEscopo(supabase, admin, ctx);
  if (!turmas.some((t) => t.id === editionId)) volta(qs, "error", "Esta turma não está no seu escopo.");

  const r = await registrarChamada(admin, {
    editionId,
    lessonId,
    data,
    presentes: new Set(formData.getAll("presente").map(String)),
    justificadas: new Set(formData.getAll("justificada").map(String)),
    fechar: formData.get("acao") === "fechar",
    motivo: ((formData.get("motivo") as string) || "").trim(),
    atorUserId: ctx.userId,
    professorId: ctx.professorId,
    papel: ctx.papel,
    turmasPermitidas: turmas.map((t) => t.id),
  });
  volta(qs, r.ok ? "msg" : "error", r.mensagem);
}

export async function presencaLiberarProvaAction(formData: FormData) {
  const { ctx, supabase, admin, volta } = await entrar(formData);
  const qs = qsBase(formData);
  const matriculaId = (formData.get("matricula_id") as string) || "";
  const motivo = ((formData.get("motivo") as string) || "").trim();

  const { data: m } = await admin.from("ead_matriculas").select("id, aluno_id, course_edition_id").eq("id", matriculaId).maybeSingle();
  if (!m) volta(qs, "error", "Matrícula não encontrada.");
  const turmas = await turmasDoEscopo(supabase, admin, ctx);
  if (!turmas.some((t) => t.id === m!.course_edition_id)) volta(qs, "error", "Esta matrícula não está no seu escopo.");

  const { error } = await admin.rpc("presenca_liberar_prova", {
    p_matricula: matriculaId,
    p_ator: ctx.userId,
    p_papel: ctx.papelAuditoria,
    p_motivo: motivo,
  });
  if (error) volta(qs, "error", limpa(error.message));

  await registrarAuditoria(admin, {
    ator: { userId: ctx.userId, professorId: ctx.professorId },
    papel: ctx.papelAuditoria,
    acao: "LIBERAR_PROVA_FREQUENCIA",
    entidade: "ead_matriculas",
    entidadeId: matriculaId,
    alunoId: m!.aluno_id,
    detalhe: { motivo },
  });
  volta(qs, "msg", "Prova liberada para este aluno. A justificativa ficou registrada.");
}

export async function presencaSalvarRegrasAction(formData: FormData) {
  const { ctx, admin, volta } = await entrar(formData);
  const qs = qsBase(formData);
  if (!ctx.global) volta(qs, "error", "Somente a secretaria geral altera as regras.");

  const minima = Number(String(formData.get("frequencia_minima") ?? "").replace(",", "."));
  const prazo = Number(formData.get("prazo_dias"));
  if (!(minima >= 0 && minima <= 100) || !Number.isInteger(prazo) || prazo < 0 || prazo > 60) {
    volta(qs, "error", "Informe frequência de 0 a 100 e prazo de 0 a 60 dias.");
  }
  const perm = (papel: string, acao: string) => formData.get(`perm_${papel}_${acao}`) === "on";
  const permissoes = Object.fromEntries(
    ["PROFESSOR", "SECRETARIA"].map((p) => [
      p,
      Object.fromEntries(["corrigir_fora_prazo", "justificar", "liberar_prova"].map((a) => [a, perm(p, a)])),
    ])
  );
  const bloqueio = formData.get("bloqueio") === "on";

  const { data: antes } = await admin
    .from("presenca_config")
    .select("frequencia_minima, prazo_correcao_professor_dias, bloqueio_prova_ativo, permissoes")
    .eq("id", true)
    .maybeSingle();

  const { error } = await admin.rpc("presenca_atualizar_config", {
    p_minima: minima,
    p_prazo: prazo,
    p_bloqueio: bloqueio,
    p_permissoes: permissoes,
    p_ator: ctx.userId,
  });
  if (error) volta(qs, "error", limpa(error.message));

  await registrarAuditoria(admin, {
    ator: { userId: ctx.userId },
    papel: "ADMIN_GLOBAL",
    acao: "ALTERAR_REGRAS_PRESENCA",
    entidade: "presenca_config",
    entidadeId: "true",
    detalhe: { antes, depois: { frequencia_minima: minima, prazo_correcao_professor_dias: prazo, bloqueio_prova_ativo: bloqueio, permissoes } },
  });
  volta(qs, "msg", "Regras salvas.");
}
