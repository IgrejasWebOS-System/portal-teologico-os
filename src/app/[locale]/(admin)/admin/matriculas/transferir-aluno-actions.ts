"use server";

// ============================================================
// Transferência de ALUNO entre turmas/núcleos (17/11/2026, pedido do
// Joaquim). Nada é apagado: a MATRÍCULA continua a mesma (provas, parcelas e
// presença seguem nela) e só a turma (course_edition_id) e o professor
// mudam. Cada troca vira uma linha em matricula_transferencias (migration
// 146) e um registro em auditoria_acoes.
//
// Regras:
//  - Destino: outra turma do MESMO curso (mudar de curso não é transferência:
//    é outra matrícula). Presença acompanha sozinha: a frequência já soma as
//    aulas assistidas em qualquer turma do mesmo curso (migration 142).
//  - Só matrícula EM_ANDAMENTO ou PAUSADA pode ser transferida.
//  - Professor de destino: o professor ATIVO vinculado à turma de destino
//    (professor_turmas). Se houver mais de um, quem transfere escolhe.
//  - Parcelas: não são tocadas — pertencem à matrícula/aluno e acompanham
//    o aluno para a nova turma.
// Quem pode: staff, secretário (dentro do escopo lido pela RLS) e o professor
// DONO da matrícula (ead_matriculas.professor_id = ele). Escritas via service_role.
// ============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";
import { checkIsProfessor } from "@/utils/professor";
import { registrarAuditoria, type PapelAuditoria } from "@/utils/auditoria";

const STATUS_TRANSFERIVEL = ["EM_ANDAMENTO", "PAUSADA"];

type Autorizado = {
  userId: string;
  papel: PapelAuditoria;
  professorId: string | null;
};

type MatriculaBase = {
  id: string;
  aluno_id: string;
  status: string;
  course_edition_id: string | null;
  professor_id: string | null;
};

async function autorizar(
  matriculaId: string
): Promise<{ ator: Autorizado; matricula: MatriculaBase } | { erro: string }> {
  if (!matriculaId) return { erro: "Matrícula não informada." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Não autenticado." };

  const [staff, secretario, professor] = await Promise.all([
    checkIsStaff(supabase, user.id),
    checkIsSecretario(supabase, user.id),
    checkIsProfessor(supabase, user.id),
  ]);
  if (!staff && !secretario && !professor) {
    return { erro: "Acesso restrito a admin, secretaria e professores do CETADP." };
  }

  const admin = createAdminClient();
  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, status, course_edition_id, professor_id")
    .eq("id", matriculaId)
    .maybeSingle();
  if (!matricula) return { erro: "Matrícula não encontrada." };

  // Escopo: staff/secretário só mexem no que a RLS deixa LER; o professor
  // só nas matrículas em que ele é o professor responsável.
  if (staff || secretario) {
    const { data: visivel } = await supabase.from("ead_matriculas").select("id").eq("id", matriculaId).maybeSingle();
    if (!visivel) return { erro: "Matrícula fora do seu escopo." };
  } else if (!professor || matricula.professor_id !== professor.id) {
    return { erro: "Você só pode transferir alunos das suas próprias turmas." };
  }

  let papel: PapelAuditoria = "PROFESSOR";
  if (staff) {
    const { data: perfil } = await supabase.from("profiles").select("system_role").eq("id", user.id).maybeSingle();
    papel = perfil?.system_role === "GLOBAL_ADMIN" ? "ADMIN_GLOBAL" : "SECRETARIA";
  } else if (secretario) {
    papel = "SECRETARIA";
  }

  return {
    ator: { userId: user.id, papel, professorId: !staff && !secretario ? professor?.id ?? null : null },
    matricula: matricula as MatriculaBase,
  };
}

// ── Dados da tela ────────────────────────────────────────────────

export interface DestinoTransferencia {
  turma_id: string;
  titulo: string; // "Turma · Núcleo · ano"
  professores: { id: string; nome: string }[];
}

export interface DadosTransferencia {
  podeTransferir: boolean;
  motivoBloqueio: string | null;
  turmaAtual: string | null;
  professorAtual: string | null;
  destinos: DestinoTransferencia[];
}

export async function listarDestinosTransferenciaAction(
  matriculaId: string
): Promise<{ success: boolean; message?: string; dados?: DadosTransferencia }> {
  const auth = await autorizar(matriculaId);
  if ("erro" in auth) return { success: false, message: auth.erro };
  const { matricula } = auth;

  const admin = createAdminClient();

  const vazio = (motivo: string): DadosTransferencia => ({
    podeTransferir: false,
    motivoBloqueio: motivo,
    turmaAtual: null,
    professorAtual: null,
    destinos: [],
  });

  if (!STATUS_TRANSFERIVEL.includes(matricula.status)) {
    return { success: true, dados: vazio("Só é possível transferir matrículas em andamento ou pausadas.") };
  }
  if (!matricula.course_edition_id) {
    return { success: true, dados: vazio("Esta matrícula ainda não tem turma. Defina a turma na ficha primeiro.") };
  }

  const { data: atual } = await admin
    .from("course_editions")
    .select("id, nome, classe, ano, course_id, units(name)")
    .eq("id", matricula.course_edition_id)
    .maybeSingle();
  if (!atual) return { success: false, message: "Turma atual não encontrada." };

  type Ed = { id: string; nome: string; classe: string | null; ano: number | null; units: { name: string } | null };
  const titulo = (e: Ed) =>
    [[e.nome, e.classe ? `(${e.classe})` : null].filter(Boolean).join(" "), e.units?.name, e.ano ? String(e.ano) : null]
      .filter(Boolean)
      .join(" · ");

  const { data: edicoes } = await admin
    .from("course_editions")
    .select("id, nome, classe, ano, status, units(name)")
    .eq("course_id", (atual as { course_id: string }).course_id)
    .neq("id", matricula.course_edition_id)
    .neq("status", "ENCERRADA")
    .order("nome");
  const lista = (edicoes ?? []) as unknown as Ed[];

  const ids = lista.map((e) => e.id);
  const professoresPorTurma = new Map<string, Map<string, string>>();
  if (ids.length > 0) {
    const { data: vinculos } = await admin
      .from("professor_turmas")
      .select("course_edition_id, professores(id, nome_completo, ativo)")
      .in("course_edition_id", ids);
    for (const v of (vinculos ?? []) as unknown as {
      course_edition_id: string;
      professores: { id: string; nome_completo: string; ativo: boolean } | null;
    }[]) {
      if (!v.professores || v.professores.ativo === false) continue;
      if (!professoresPorTurma.has(v.course_edition_id)) professoresPorTurma.set(v.course_edition_id, new Map());
      professoresPorTurma.get(v.course_edition_id)!.set(v.professores.id, v.professores.nome_completo);
    }
  }

  let professorAtual: string | null = null;
  if (matricula.professor_id) {
    const { data: p } = await admin.from("professores").select("nome_completo").eq("id", matricula.professor_id).maybeSingle();
    professorAtual = p?.nome_completo ?? null;
  }

  return {
    success: true,
    dados: {
      podeTransferir: true,
      motivoBloqueio: null,
      turmaAtual: titulo(atual as unknown as Ed),
      professorAtual,
      destinos: lista.map((e) => ({
        turma_id: e.id,
        titulo: titulo(e),
        professores: Array.from(professoresPorTurma.get(e.id)?.entries() ?? []).map(([id, nome]) => ({ id, nome })),
      })),
    },
  };
}

// ── Transferir ───────────────────────────────────────────────────

export async function transferirAlunoAction(input: {
  matriculaId: string;
  turmaDestinoId: string;
  professorDestinoId: string | null;
  motivo: string;
}): Promise<{ success: boolean; message?: string }> {
  const auth = await autorizar(input.matriculaId);
  if ("erro" in auth) return { success: false, message: auth.erro };
  const { ator, matricula } = auth;

  const motivo = (input.motivo ?? "").trim();
  if (motivo.length < 5) {
    return { success: false, message: "Informe o motivo da transferência (mínimo 5 caracteres)." };
  }
  if (!input.turmaDestinoId) return { success: false, message: "Escolha a turma de destino." };
  if (!STATUS_TRANSFERIVEL.includes(matricula.status)) {
    return { success: false, message: "Só é possível transferir matrículas em andamento ou pausadas." };
  }
  if (!matricula.course_edition_id) {
    return { success: false, message: "Esta matrícula ainda não tem turma de origem." };
  }
  if (input.turmaDestinoId === matricula.course_edition_id) {
    return { success: false, message: "O aluno já está nesta turma." };
  }

  const admin = createAdminClient();

  const [{ data: origem }, { data: destino }] = await Promise.all([
    admin.from("course_editions").select("id, nome, course_id").eq("id", matricula.course_edition_id).maybeSingle(),
    admin.from("course_editions").select("id, nome, course_id, status").eq("id", input.turmaDestinoId).maybeSingle(),
  ]);
  if (!origem || !destino) return { success: false, message: "Turma de origem ou de destino não encontrada." };
  if (origem.course_id !== destino.course_id) {
    return {
      success: false,
      message: "A turma de destino precisa ser do mesmo curso. Para mudar de curso, faça uma nova matrícula.",
    };
  }
  if (destino.status === "ENCERRADA") {
    return { success: false, message: "A turma de destino está encerrada." };
  }

  // Professor de destino: precisa estar ATIVO e vinculado à turma de destino.
  let professorDestinoId: string | null = null;
  let professorDestinoNome: string | null = null;
  const { data: vinculos } = await admin
    .from("professor_turmas")
    .select("professores(id, nome_completo, ativo)")
    .eq("course_edition_id", input.turmaDestinoId);
  const elegiveis = new Map<string, string>();
  for (const v of (vinculos ?? []) as unknown as {
    professores: { id: string; nome_completo: string; ativo: boolean } | null;
  }[]) {
    if (v.professores && v.professores.ativo !== false) elegiveis.set(v.professores.id, v.professores.nome_completo);
  }
  if (elegiveis.size === 1) {
    [professorDestinoId, professorDestinoNome] = Array.from(elegiveis.entries())[0];
  } else if (elegiveis.size > 1) {
    if (!input.professorDestinoId || !elegiveis.has(input.professorDestinoId)) {
      return { success: false, message: "A turma de destino tem mais de um professor. Escolha o professor do aluno." };
    }
    professorDestinoId = input.professorDestinoId;
    professorDestinoNome = elegiveis.get(input.professorDestinoId) ?? null;
  }

  // Nomes de origem (para o histórico).
  let professorOrigemNome: string | null = null;
  if (matricula.professor_id) {
    const { data: p } = await admin.from("professores").select("nome_completo").eq("id", matricula.professor_id).maybeSingle();
    professorOrigemNome = p?.nome_completo ?? null;
  }

  const { error: errUpdate } = await admin
    .from("ead_matriculas")
    .update({ course_edition_id: input.turmaDestinoId, professor_id: professorDestinoId })
    .eq("id", matricula.id);
  if (errUpdate) {
    console.error("[transferir-aluno] update matrícula", errUpdate);
    return { success: false, message: "Erro ao transferir o aluno. Nada foi alterado." };
  }

  const { error: errHist } = await admin.from("matricula_transferencias").insert({
    matricula_id: matricula.id,
    aluno_id: matricula.aluno_id,
    turma_origem_id: origem.id,
    turma_origem_nome: origem.nome,
    turma_destino_id: destino.id,
    turma_destino_nome: destino.nome,
    professor_origem_id: matricula.professor_id,
    professor_origem_nome: professorOrigemNome,
    professor_destino_id: professorDestinoId,
    professor_destino_nome: professorDestinoNome,
    motivo,
    transferido_por: ator.userId,
    papel: ator.papel,
  });
  if (errHist) console.error("[transferir-aluno] histórico", errHist);

  await registrarAuditoria(admin, {
    ator: { userId: ator.userId, professorId: ator.professorId },
    papel: ator.papel,
    acao: "TRANSFERIR_ALUNO",
    entidade: "ead_matriculas",
    entidadeId: matricula.id,
    alunoId: matricula.aluno_id,
    detalhe: {
      de: { turma: origem.nome, professor: professorOrigemNome },
      para: { turma: destino.nome, professor: professorDestinoNome },
      motivo,
    },
  });

  revalidatePath(`/admin/matriculas/${matricula.id}`);
  return {
    success: true,
    message:
      `Aluno transferido para ${destino.nome}` +
      (professorDestinoNome ? ` (professor ${professorDestinoNome})` : " (a turma ainda não tem professor ativo vinculado)") +
      ". Parcelas, provas e presença continuam na mesma matrícula." +
      (errHist ? " Atenção: não foi possível gravar o histórico da transferência." : ""),
  };
}

// ── Histórico ────────────────────────────────────────────────────

export interface TransferenciaHistorico {
  quando: string;
  de: string | null;
  para: string | null;
  professorDe: string | null;
  professorPara: string | null;
  motivo: string | null;
  papel: string | null;
}

export async function buscarTransferenciasAction(matriculaId: string): Promise<TransferenciaHistorico[]> {
  const auth = await autorizar(matriculaId);
  if ("erro" in auth) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("matricula_transferencias")
    .select("created_at, turma_origem_nome, turma_destino_nome, professor_origem_nome, professor_destino_nome, motivo, papel")
    .eq("matricula_id", matriculaId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as {
    created_at: string;
    turma_origem_nome: string | null;
    turma_destino_nome: string | null;
    professor_origem_nome: string | null;
    professor_destino_nome: string | null;
    motivo: string | null;
    papel: string | null;
  }[]).map((r) => ({
    quando: r.created_at,
    de: r.turma_origem_nome,
    para: r.turma_destino_nome,
    professorDe: r.professor_origem_nome,
    professorPara: r.professor_destino_nome,
    motivo: r.motivo,
    papel: r.papel,
  }));
}
