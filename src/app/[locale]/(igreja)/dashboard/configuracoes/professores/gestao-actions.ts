"use server";

// ============================================================
// Gestão de professor SEM excluir nada (17/11/2026, pedido do Joaquim:
// "não vamos excluir nada; transfere turma, desabilita e habilita professor,
// mantendo o histórico"):
//   - listarTurmasDoProfessorAction  -> dados para a tela "Transferir turma"
//   - transferirTurmaProfessorAction -> move vínculos (professor_turmas) e os
//                                       alunos em andamento (ead_matriculas)
//   - desativarProfessorAction       -> tira o acesso, exige zero turmas/alunos
//   - reativarProfessorAction        -> devolve o acesso
// Só staff (secretaria/admin). Escritas via service_role depois da checagem
// do papel; tudo registrado em auditoria_acoes. Migration 145 (professores.ativo).
// ============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { registrarAuditoria, type PapelAuditoria } from "@/utils/auditoria";

// Matrículas que "seguem" o professor quando a turma muda de mãos.
// APROVADO/REPROVADO/CANCELADO ficam com o professor que as acompanhou
// (histórico).
const STATUS_EM_CURSO = ["EM_ANDAMENTO", "PAUSADA"];

// 100 anos: o Auth do Supabase não tem "banir para sempre", só duração.
const BAN_LONGO = "876000h";

type Ator = { userId: string; papel: PapelAuditoria };

async function exigirStaff(): Promise<{ ator: Ator } | { erro: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Não autenticado." };
  if (!(await checkIsStaff(supabase, user.id))) {
    return { erro: "Acesso restrito à secretaria." };
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    ator: {
      userId: user.id,
      papel: perfil?.system_role === "GLOBAL_ADMIN" ? "ADMIN_GLOBAL" : "SECRETARIA",
    },
  };
}

// ── Dados da tela "Transferir turma" ─────────────────────────────

export interface TurmaDoProfessor {
  course_edition_id: string;
  titulo: string; // "Curso — Turma (Classe) · Igreja · ano"
  vinculos: string[]; // ex.: ["SEGUNDA · NOITE"]
  alunos_em_curso: number;
}

export async function listarTurmasDoProfessorAction(
  professorId: string
): Promise<{ success: boolean; message?: string; turmas?: TurmaDoProfessor[] }> {
  const auth = await exigirStaff();
  if ("erro" in auth) return { success: false, message: auth.erro };

  const admin = createAdminClient();

  const { data: vinculos, error } = await admin
    .from("professor_turmas")
    .select("id, course_edition_id, turno, dia_semana, course_editions(nome, classe, ano, units(name), courses(title))")
    .eq("professor_id", professorId);
  if (error) {
    console.error("[gestao-actions] listarTurmas", error);
    return { success: false, message: "Erro ao buscar as turmas do professor." };
  }

  const porTurma = new Map<string, TurmaDoProfessor>();
  for (const v of (vinculos ?? []) as unknown as {
    course_edition_id: string;
    turno: string;
    dia_semana: string;
    course_editions: {
      nome: string;
      classe: string | null;
      ano: number | null;
      units: { name: string } | null;
      courses: { title: string } | null;
    } | null;
  }[]) {
    const ed = v.course_editions;
    const partes = [
      ed?.courses?.title,
      [ed?.nome, ed?.classe ? `(${ed.classe})` : null].filter(Boolean).join(" "),
      ed?.units?.name,
      ed?.ano ? String(ed.ano) : null,
    ].filter(Boolean);
    const atual =
      porTurma.get(v.course_edition_id) ??
      ({
        course_edition_id: v.course_edition_id,
        titulo: partes.join(" · ") || "Turma",
        vinculos: [],
        alunos_em_curso: 0,
      } as TurmaDoProfessor);
    atual.vinculos.push(`${v.dia_semana} · ${v.turno}`);
    porTurma.set(v.course_edition_id, atual);
  }

  const editionIds = Array.from(porTurma.keys());
  if (editionIds.length > 0) {
    const { data: matriculas } = await admin
      .from("ead_matriculas")
      .select("course_edition_id")
      .eq("professor_id", professorId)
      .in("course_edition_id", editionIds)
      .in("status", STATUS_EM_CURSO);
    for (const m of (matriculas ?? []) as { course_edition_id: string }[]) {
      const t = porTurma.get(m.course_edition_id);
      if (t) t.alunos_em_curso += 1;
    }
  }

  return { success: true, turmas: Array.from(porTurma.values()) };
}

// ── Transferir turma de um professor para outro ──────────────────

export async function transferirTurmaProfessorAction(input: {
  deProfessorId: string;
  paraProfessorId: string;
  courseEditionIds: string[];
  // true = o usuário confirmou reativar o destino, se ele estiver desativado.
  reativarDestino?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const auth = await exigirStaff();
  if ("erro" in auth) return { success: false, message: auth.erro };

  const { deProfessorId, paraProfessorId, courseEditionIds } = input;
  if (!deProfessorId || !paraProfessorId) {
    return { success: false, message: "Escolha o professor de origem e o de destino." };
  }
  if (deProfessorId === paraProfessorId) {
    return { success: false, message: "O professor de destino precisa ser diferente do de origem." };
  }
  if (!courseEditionIds || courseEditionIds.length === 0) {
    return { success: false, message: "Selecione ao menos uma turma para transferir." };
  }

  const admin = createAdminClient();

  const { data: destino } = await admin
    .from("professores")
    .select("id, nome_completo, ativo, user_id")
    .eq("id", paraProfessorId)
    .maybeSingle();
  if (!destino) return { success: false, message: "Professor de destino não encontrado." };

  // Destino desativado: só segue se quem pediu confirmou a reativação
  // (ex.: devolver a turma ao professor que tinha sido desativado). A
  // reativação acontece ANTES de mover qualquer coisa.
  let destinoReativado = false;
  if (destino.ativo === false) {
    if (!input.reativarDestino) {
      return {
        success: false,
        message: "O professor de destino está desativado. Confirme a reativação dele para transferir.",
      };
    }
    const { error: errReativar } = await admin
      .from("professores")
      .update({ ativo: true, desativado_em: null, desativado_por: null, motivo_desativacao: null })
      .eq("id", paraProfessorId);
    if (errReativar) {
      console.error("[gestao-actions] transferir: reativar destino", errReativar);
      return { success: false, message: "Não foi possível reativar o professor de destino. Nada foi alterado." };
    }
    if (destino.user_id) {
      const { error: banError } = await admin.auth.admin.updateUserById(destino.user_id, { ban_duration: "none" });
      if (banError) console.error("[gestao-actions] transferir: liberar login do destino", banError);
    }
    destinoReativado = true;
  }

  const { data: origem } = await admin
    .from("professores")
    .select("id, nome_completo")
    .eq("id", deProfessorId)
    .maybeSingle();
  if (!origem) return { success: false, message: "Professor de origem não encontrado." };

  // Vínculos da origem nas turmas escolhidas.
  const { data: vinculosOrigem, error: errVinc } = await admin
    .from("professor_turmas")
    .select("id, course_edition_id, turno, dia_semana")
    .eq("professor_id", deProfessorId)
    .in("course_edition_id", courseEditionIds);
  if (errVinc) {
    console.error("[gestao-actions] transferir: vínculos", errVinc);
    return { success: false, message: "Erro ao ler os vínculos do professor de origem." };
  }
  const vincs = (vinculosOrigem ?? []) as {
    id: string;
    course_edition_id: string;
    turno: string;
    dia_semana: string;
  }[];
  if (vincs.length === 0) {
    return { success: false, message: "O professor de origem não tem vínculo com as turmas escolhidas." };
  }

  // Vínculos que o destino já tem (mesma turma + turno + dia): não pode
  // duplicar (unique). Nesses casos o vínculo da origem só é desligado.
  const { data: vinculosDestino } = await admin
    .from("professor_turmas")
    .select("course_edition_id, turno, dia_semana")
    .eq("professor_id", paraProfessorId)
    .in("course_edition_id", courseEditionIds);
  const chave = (v: { course_edition_id: string; turno: string; dia_semana: string }) =>
    `${v.course_edition_id}|${v.turno}|${v.dia_semana}`;
  const jaNoDestino = new Set(
    ((vinculosDestino ?? []) as { course_edition_id: string; turno: string; dia_semana: string }[]).map(chave)
  );

  const idsMover = vincs.filter((v) => !jaNoDestino.has(chave(v))).map((v) => v.id);
  const idsDuplicados = vincs.filter((v) => jaNoDestino.has(chave(v))).map((v) => v.id);

  if (idsMover.length > 0) {
    const { error } = await admin
      .from("professor_turmas")
      .update({ professor_id: paraProfessorId })
      .in("id", idsMover);
    if (error) {
      console.error("[gestao-actions] transferir: mover vínculos", error);
      return { success: false, message: "Erro ao mover os vínculos da turma. Nada foi alterado nos alunos." };
    }
  }
  if (idsDuplicados.length > 0) {
    const { error } = await admin.from("professor_turmas").delete().in("id", idsDuplicados);
    if (error) {
      console.error("[gestao-actions] transferir: vínculos duplicados", error);
      return { success: false, message: "Vínculos movidos, mas houve erro ao ajustar vínculos repetidos. Confira a tela do professor." };
    }
  }

  // Alunos em curso nessas turmas passam a ser do professor de destino.
  const { data: movidas, error: errMat } = await admin
    .from("ead_matriculas")
    .update({ professor_id: paraProfessorId })
    .eq("professor_id", deProfessorId)
    .in("course_edition_id", courseEditionIds)
    .in("status", STATUS_EM_CURSO)
    .select("id, aluno_id");
  if (errMat) {
    console.error("[gestao-actions] transferir: matrículas", errMat);
    return {
      success: false,
      message:
        "Vínculos da turma movidos, mas houve erro ao atualizar os alunos. Repita a transferência: ela é segura de repetir.",
    };
  }

  await registrarAuditoria(admin, {
    ator: { userId: auth.ator.userId },
    papel: auth.ator.papel,
    acao: "TRANSFERIR_TURMA_PROFESSOR",
    entidade: "professores",
    entidadeId: deProfessorId,
    detalhe: {
      de: { id: origem.id, nome: origem.nome_completo },
      para: { id: destino.id, nome: destino.nome_completo },
      turmas: courseEditionIds,
      vinculos_movidos: idsMover.length,
      vinculos_ja_existentes_no_destino: idsDuplicados.length,
      alunos_transferidos: (movidas ?? []).length,
      destino_reativado: destinoReativado,
    },
  });
  if (destinoReativado) {
    await registrarAuditoria(admin, {
      ator: { userId: auth.ator.userId },
      papel: auth.ator.papel,
      acao: "REATIVAR_PROFESSOR",
      entidade: "professores",
      entidadeId: paraProfessorId,
      detalhe: { nome: destino.nome_completo, origem: "transferencia de turma" },
    });
  }

  revalidatePath("/dashboard/configuracoes/professores");
  return {
    success: true,
    message: `Turma transferida de ${origem.nome_completo} para ${destino.nome_completo}${destinoReativado ? " (professor reativado)" : ""}: ${idsMover.length + idsDuplicados.length} vínculo(s) e ${(movidas ?? []).length} aluno(s) em curso.`,
  };
}

// ── Desativar professor ──────────────────────────────────────────

export async function desativarProfessorAction(
  professorId: string,
  motivo: string
): Promise<{ success: boolean; message?: string }> {
  const auth = await exigirStaff();
  if ("erro" in auth) return { success: false, message: auth.erro };

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("professores")
    .select("id, nome_completo, user_id, ativo")
    .eq("id", professorId)
    .maybeSingle();
  if (!prof) return { success: false, message: "Professor não encontrado." };
  if (prof.ativo === false) return { success: false, message: "Este professor já está desativado." };

  // Trava: só desativa quem não tem mais turma nem aluno em curso. Isso
  // obriga a transferir antes, em vez de deixar turmas "órfãs".
  const [{ count: qtdTurmas }, { count: qtdAlunos }] = await Promise.all([
    admin.from("professor_turmas").select("id", { count: "exact", head: true }).eq("professor_id", professorId),
    admin
      .from("ead_matriculas")
      .select("id", { count: "exact", head: true })
      .eq("professor_id", professorId)
      .in("status", STATUS_EM_CURSO),
  ]);
  if ((qtdTurmas ?? 0) > 0 || (qtdAlunos ?? 0) > 0) {
    return {
      success: false,
      message: `Antes de desativar, transfira as turmas deste professor (${qtdTurmas ?? 0} turma(s)/vínculo(s) e ${qtdAlunos ?? 0} aluno(s) em curso) para outro professor.`,
    };
  }

  const { error } = await admin
    .from("professores")
    .update({
      ativo: false,
      desativado_em: new Date().toISOString(),
      desativado_por: auth.ator.userId,
      motivo_desativacao: motivo.trim() || null,
    })
    .eq("id", professorId);
  if (error) {
    console.error("[gestao-actions] desativar", error);
    return { success: false, message: "Erro ao desativar o professor. Tente novamente." };
  }

  // Bloqueia o LOGIN só quando ele serve exclusivamente para ser professor.
  // Se a mesma conta é admin/secretaria ou aluno, bloquear tiraria esses
  // acessos também — nesse caso só o acesso de professor é removido.
  let loginBloqueado = false;
  let motivoNaoBloqueou: string | null = null;
  if (prof.user_id) {
    const [{ data: perfil }, { data: papeis }, { data: aluno }] = await Promise.all([
      admin.from("profiles").select("system_role").eq("id", prof.user_id).maybeSingle(),
      admin.from("admin_roles").select("level").eq("user_id", prof.user_id),
      admin.from("ead_alunos").select("id").eq("user_id", prof.user_id).limit(1),
    ]);
    const ehStaff = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"].includes(perfil?.system_role ?? "");
    const temPapelMaior = ((papeis ?? []) as { level: number }[]).some((p) => p.level < 4);
    const ehAluno = (aluno ?? []).length > 0;

    if (ehStaff || temPapelMaior) {
      motivoNaoBloqueou = "a conta também é de administração/secretaria";
    } else if (ehAluno) {
      motivoNaoBloqueou = "a conta também é de aluno";
    } else {
      const { error: banError } = await admin.auth.admin.updateUserById(prof.user_id, {
        ban_duration: BAN_LONGO,
      });
      if (banError) {
        console.error("[gestao-actions] desativar: bloquear login", banError);
        motivoNaoBloqueou = "não foi possível bloquear o login agora";
      } else {
        loginBloqueado = true;
      }
    }
  }

  await registrarAuditoria(admin, {
    ator: { userId: auth.ator.userId },
    papel: auth.ator.papel,
    acao: "DESATIVAR_PROFESSOR",
    entidade: "professores",
    entidadeId: professorId,
    detalhe: {
      nome: prof.nome_completo,
      motivo: motivo.trim() || null,
      login_bloqueado: loginBloqueado,
      motivo_nao_bloqueou: motivoNaoBloqueou,
    },
  });

  revalidatePath("/dashboard/configuracoes/professores");
  return {
    success: true,
    message: loginBloqueado
      ? `${prof.nome_completo} foi desativado e o login foi bloqueado. O histórico foi mantido.`
      : motivoNaoBloqueou
        ? `${prof.nome_completo} foi desativado e perdeu o acesso de professor. O login não foi bloqueado porque ${motivoNaoBloqueou}. O histórico foi mantido.`
        : `${prof.nome_completo} foi desativado. O histórico foi mantido.`,
  };
}

// ── Reativar professor ───────────────────────────────────────────

export async function reativarProfessorAction(
  professorId: string
): Promise<{ success: boolean; message?: string }> {
  const auth = await exigirStaff();
  if ("erro" in auth) return { success: false, message: auth.erro };

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("professores")
    .select("id, nome_completo, user_id, ativo")
    .eq("id", professorId)
    .maybeSingle();
  if (!prof) return { success: false, message: "Professor não encontrado." };
  if (prof.ativo !== false) return { success: false, message: "Este professor já está ativo." };

  const { error } = await admin
    .from("professores")
    .update({
      ativo: true,
      desativado_em: null,
      desativado_por: null,
      motivo_desativacao: null,
    })
    .eq("id", professorId);
  if (error) {
    console.error("[gestao-actions] reativar", error);
    return { success: false, message: "Erro ao reativar o professor. Tente novamente." };
  }

  // Desfaz o bloqueio de login (se houve). "none" remove o ban.
  if (prof.user_id) {
    const { error: banError } = await admin.auth.admin.updateUserById(prof.user_id, {
      ban_duration: "none",
    });
    if (banError) console.error("[gestao-actions] reativar: liberar login", banError);
  }

  await registrarAuditoria(admin, {
    ator: { userId: auth.ator.userId },
    papel: auth.ator.papel,
    acao: "REATIVAR_PROFESSOR",
    entidade: "professores",
    entidadeId: professorId,
    detalhe: { nome: prof.nome_completo },
  });

  revalidatePath("/dashboard/configuracoes/professores");
  return { success: true, message: `${prof.nome_completo} foi reativado e voltou a ter acesso.` };
}
