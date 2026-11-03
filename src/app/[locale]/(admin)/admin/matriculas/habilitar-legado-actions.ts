"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";
import { checkIsProfessor } from "@/utils/professor";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { registrarAuditoria, type PapelAuditoria } from "@/utils/auditoria";

const ACAO_HABILITAR_LEGADO = "HABILITAR_ALUNO_LEGADO";

export interface HabilitacaoLegadoInfo {
  quando: string;
  quem: string | null;
  papel: string;
  curso: string | null;
  primeiroVencimento: string | null;
  parcelasGeradas: number;
  matriculaCriada: boolean;
  aviso: string | null;
}

// Último registro de habilitação do aluno (para o cartão "Aluno habilitado"). Mesma regra de
// escopo: só quem é staff/secretário/professor e consegue LER o aluno pela RLS.
export async function buscarHabilitacaoLegadoAction(alunoId: string): Promise<HabilitacaoLegadoInfo | null> {
  if (!alunoId) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [staff, secretario, professor] = await Promise.all([
    checkIsStaff(supabase, user.id),
    checkIsSecretario(supabase, user.id),
    checkIsProfessor(supabase, user.id),
  ]);
  if (!staff && !secretario && !professor) return null;
  const { data: visivel } = await supabase.from("ead_alunos").select("id").eq("id", alunoId).maybeSingle();
  if (!visivel) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("auditoria_acoes")
    .select("created_at, ator_nome, papel, detalhe")
    .eq("aluno_id", alunoId)
    .eq("acao", ACAO_HABILITAR_LEGADO)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (data.detalhe ?? {}) as any;
  return {
    quando: data.created_at,
    quem: data.ator_nome ?? null,
    papel: data.papel,
    curso: d.curso ?? null,
    primeiroVencimento: d.primeiro_vencimento ?? null,
    parcelasGeradas: Number(d.parcelas_geradas ?? 0),
    matriculaCriada: !!d.matricula_criada,
    aviso: d.aviso ?? null,
  };
}

// ============================================================
// Habilitar aluno do legado (03/11/2026, pedido do Joaquim): aluno que veio
// do ano anterior (matrícula CETADP-LEG-*, status INATIVO, sem curso
// pretendido) mas está cursando. Admin, secretaria ou professor escolhem
// Básico ou Médio, na tela de edição da matrícula (acima de "Cancelar matrícula"):
//   1. ead_alunos.status -> ATIVO e curso_pretendido -> título do curso
//      (mesmo texto que os demais alunos têm, ex.: "Curso Teológico Básico").
//   2. Se ele NÃO tem matrícula EM_ANDAMENTO/PAUSADA nesse curso, cria uma
//      (EM_ANDAMENTO, origem MATRICULA_DIRETA, sem turma/professor — turma e
//      professor se ajustam na própria ficha).
// Nunca apaga nem altera matrícula existente (histórico APROVADO/CANCELADO
// fica como está).
// Autorização: ser staff, secretário ou professor E conseguir LER o aluno com o
// client normal (a RLS limita ao escopo de cada um); a escrita usa service_role.
// ============================================================

const TITULO_CURSO = {
  BASICO: "Curso Teológico Básico",
  MEDIO: "Curso Teológico Médio",
} as const;

export type HabilitarLegadoResultado = { ok: true; mensagem: string } | { ok: false; erro: string };

export async function habilitarAlunoLegadoAction(
  alunoId: string,
  curso: "BASICO" | "MEDIO",
  // yyyy-mm-dd: vencimento da 1ª parcela; as demais saem mês a mês a partir dela.
  primeiroVencimento: string
): Promise<HabilitarLegadoResultado> {
  const titulo = TITULO_CURSO[curso];
  if (!alunoId || !titulo) return { ok: false, erro: "Dados inválidos." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento ?? "") || Number.isNaN(Date.parse(primeiroVencimento))) {
    return { ok: false, erro: "Informe a data do primeiro vencimento." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const [staff, secretario, professor] = await Promise.all([
    checkIsStaff(supabase, user.id),
    checkIsSecretario(supabase, user.id),
    checkIsProfessor(supabase, user.id),
  ]);
  if (!staff && !secretario && !professor) {
    return { ok: false, erro: "Acesso restrito a admin, secretaria e professores do CETADP." };
  }

  // Escopo: se a RLS não deixa esta pessoa ler o aluno, ela não pode habilitá-lo.
  const { data: visivel } = await supabase.from("ead_alunos").select("id").eq("id", alunoId).maybeSingle();
  if (!visivel) return { ok: false, erro: "Aluno fora do seu escopo ou não encontrado." };

  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, user_id, status")
    .eq("id", alunoId)
    .maybeSingle();
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  // Produção: título exato. Staging: cursos SEED ("Curso Básico de Teologia (SEED)") — cai no que contém
  // "basico"/"medio" (mesmo critério da tela Testes e Provas).
  const { data: cursosRaw } = await admin.from("courses").select("id, title");
  const semAcento = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const chave = curso === "BASICO" ? "basico" : "medio";
  const cursosLista = (cursosRaw ?? []) as { id: string; title: string | null }[];
  const cursoRow =
    cursosLista.find((c) => c.title === titulo) ??
    cursosLista.find((c) => semAcento(c.title ?? "").includes(chave));
  if (!cursoRow) return { ok: false, erro: `Curso "${titulo}" não encontrado no sistema.` };

  const { data: existente } = await admin
    .from("ead_matriculas")
    .select("id, curso_nome_snapshot")
    .eq("aluno_id", alunoId)
    .eq("course_id", cursoRow.id)
    .in("status", ["EM_ANDAMENTO", "PAUSADA"])
    .limit(1)
    .maybeSingle();

  let criouMatricula = false;
  let matriculaId: string | null = existente?.id ?? null;
  const snapshotCurso: string = existente?.curso_nome_snapshot ?? titulo;
  if (!existente) {
    const { data: numero, error: numeroErro } = await admin.rpc("get_next_matricula_ead");
    if (numeroErro || !numero) {
      return { ok: false, erro: "Erro ao gerar o número de matrícula: " + (numeroErro?.message ?? "desconhecido") };
    }
    const { data: novaMatricula, error: insErro } = await admin.from("ead_matriculas").insert({
      aluno_id: alunoId,
      course_id: cursoRow.id,
      curso_nome_snapshot: titulo,
      matricula: numero,
      status: "EM_ANDAMENTO",
      origem: "MATRICULA_DIRETA",
      matriculado_por: user.id,
      // Professor que habilita fica como professor da nova matrícula.
      ...(professor && !staff && !secretario ? { professor_id: professor.id } : {}),
    }).select("id").single();
    if (insErro || !novaMatricula) return { ok: false, erro: "Erro ao criar a matrícula: " + (insErro?.message ?? "desconhecido") };
    criouMatricula = true;
    matriculaId = novaMatricula.id;

    // Mesmo vínculo que matricularAlunoEmCurso faz para o player de aulas.
    if (aluno.user_id) {
      await admin
        .from("enrollments")
        .upsert(
          { user_id: aluno.user_id, course_id: cursoRow.id, status: "ENROLLED" },
          { onConflict: "user_id,course_id", ignoreDuplicates: true }
        );
    }
  }

  const { error: updErro } = await admin
    .from("ead_alunos")
    .update({ status: "ATIVO", curso_pretendido: titulo })
    .eq("id", alunoId);
  if (updErro) return { ok: false, erro: "Erro ao atualizar o aluno: " + updErro.message };

  // Parcelas de mensalidade a partir da data informada (mesma regra e mesmo gerador da
  // "Gerar parcelas de mensalidade": valor/nº de parcelas de course_pricing). Nunca duplica:
  // se a matrícula já tem "Mensalidade —", não gera de novo. Falha aqui não desfaz a habilitação.
  let avisoParcelas = "";
  let parcelasGeradas = 0;
  if (matriculaId) {
    const { count: jaTem } = await admin
      .from("fin_contas_receber")
      .select("id", { count: "exact", head: true })
      .eq("origem_id", matriculaId)
      .ilike("descricao", "Mensalidade —%");
    if (jaTem && jaTem > 0) {
      avisoParcelas = " Esta matrícula já tinha mensalidade lançada: nenhuma parcela nova foi gerada.";
    } else {
      const { data: preco } = await admin
        .from("course_pricing")
        .select("valor_parcela_centavos, numero_parcelas")
        .eq("course_id", cursoRow.id)
        .maybeSingle();
      if (!preco || preco.valor_parcela_centavos <= 0) {
        avisoParcelas =
          " Parcelas NÃO geradas: o curso não tem valor de mensalidade cadastrado (Financeiro > Preços dos Cursos).";
      } else {
        const { error: parcErro } = await gerarParcelasContasReceber(admin, {
          origemTipo: "MATRICULA_DIRETA",
          origemId: matriculaId,
          alunoId,
          responsavelPagamento: "ALUNO",
          descricaoBase: `Mensalidade — ${snapshotCurso}`,
          valorTotalCentavos: preco.valor_parcela_centavos * preco.numero_parcelas,
          totalParcelas: preco.numero_parcelas,
          primeiroVencimento,
          formaPagamentoPrevista: "PIX",
        });
        if (!parcErro) parcelasGeradas = preco.numero_parcelas;
        avisoParcelas = parcErro
          ? " Aluno habilitado, mas deu erro ao gerar as parcelas: " + parcErro.message
          : ` ${preco.numero_parcelas} parcelas geradas a partir de ${primeiroVencimento.split("-").reverse().join("/")}.`;
      }
    }
  }

  // Registro do processo (aparece no cartão "Aluno habilitado" depois): quem, quando, curso, data, parcelas.
  const papel: PapelAuditoria = staff
    ? (await admin.from("profiles").select("system_role").eq("id", user.id).maybeSingle()).data?.system_role ===
      "GLOBAL_ADMIN"
      ? "ADMIN_GLOBAL"
      : "SECRETARIA"
    : secretario
      ? "SECRETARIA"
      : "PROFESSOR";
  await registrarAuditoria(admin, {
    ator: { userId: user.id, professorId: papel === "PROFESSOR" ? professor?.id ?? null : null },
    papel,
    acao: ACAO_HABILITAR_LEGADO,
    entidade: "ead_matriculas",
    entidadeId: matriculaId,
    alunoId,
    detalhe: {
      curso: titulo,
      primeiro_vencimento: primeiroVencimento,
      parcelas_geradas: parcelasGeradas,
      matricula_criada: criouMatricula,
      // Só guarda como aviso quando algo deu errado/faltou (sucesso já aparece em "Parcelas geradas").
      aviso: parcelasGeradas > 0 ? null : avisoParcelas.trim() || null,
    },
  });

  revalidatePath("/dashboard/configuracoes/persona/alunos");
  revalidatePath(`/dashboard/configuracoes/persona/alunos/${alunoId}`);
  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/financeiro/contas-a-receber");
  revalidatePath("/professor/alunos");
  revalidatePath("/secretaria/alunos");

  return {
    ok: true,
    mensagem:
      (criouMatricula
        ? `Aluno habilitado no ${titulo}. Matrícula criada (sem turma): ajuste turma e professor na ficha.`
        : `Aluno habilitado no ${titulo} (já tinha matrícula em andamento neste curso).`) + avisoParcelas,
  };
}
