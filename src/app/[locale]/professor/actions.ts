"use server";

// ============================================================
// Ações da Área do Professor — Módulo 1 (RBAC "Professor de turma"),
// expandido em 14/09/2026: professor não é só leitura, ele "gerencia sua
// turma" — dar baixa em parcela do próprio aluno, matricular aluno novo
// já vinculado a ele, e reaproveitar as páginas de Impressão do aluno.
//
// Escopo de permissão: sempre autentica com o client normal, resolve o
// professor com checkIsProfessor(), e só DEPOIS lê/grava com o client
// admin (service_role) — mesmo padrão de utils/aluno/matriculaAtiva.ts e
// da própria página /professor. Toda ação confere a posse da matrícula
// (ead_matriculas.professor_id) antes de tocar em qualquer dado.
// ============================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";

async function requireProfessor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  return { userId: user.id, professor, admin: createAdminClient() };
}

function erro(msg: string) {
  redirect("/professor?error=" + encodeURIComponent(msg));
}

// ── AÇÃO 1: DAR BAIXA EM PARCELA (só forma não-dinheiro) ────────
// Dinheiro fica de fora de propósito: exige Caixa Diário aberto, que é
// um controle de secretaria (fin_lancamentos) — professor não abre caixa.
export async function professorBaixarParcelaAction(formData: FormData) {
  const { userId, professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;
  const forma_pagamento = formData.get("forma_pagamento") as string;

  if (!id || !forma_pagamento) erro("Dados incompletos.");
  if (forma_pagamento === "DINHEIRO") {
    erro("Pagamento em dinheiro só pode ser baixado pela secretaria (Caixa Diário).");
  }

  const { data: conta } = await admin
    .from("fin_contas_receber")
    .select("id, status, origem_id, origem_tipo, valor_bruto_centavos")
    .eq("id", id)
    .single();

  if (!conta) erro("Parcela não encontrada.");
  if (conta!.status === "PAGO") erro("Essa parcela já foi baixada.");
  if (conta!.origem_tipo !== "MATRICULA_DIRETA") erro("Parcela fora do escopo do professor.");

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, professor_id")
    .eq("id", conta!.origem_id)
    .single();

  if (!matricula || matricula.professor_id !== professor.id) {
    erro("Essa parcela não pertence a um aluno seu.");
  }

  const { error } = await admin
    .from("fin_contas_receber")
    .update({
      status: "PAGO",
      forma_pagamento_prevista: forma_pagamento,
      valor_liquido_centavos: conta!.valor_bruto_centavos,
      pago_em: new Date().toISOString(),
      baixado_por: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[professor/actions] baixar parcela", error);
    erro("Erro ao dar baixa. Tente novamente.");
  }

  revalidatePath("/professor");
  redirect("/professor?msg=" + encodeURIComponent("Parcela baixada com sucesso."));
}

// ── AÇÃO 2: NOVA MATRÍCULA (aluno novo, já vinculado a este professor) ──
export async function professorCriarMatriculaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const course_id = formData.get("course_id") as string;

  if (!nome_completo || !email || !course_id) {
    erro("Nome, e-mail e curso são obrigatórios.");
  }

  // Professor só matricula em curso que ele já leciona (evita course_id
  // arbitrário vindo de um form manipulado no client).
  const { data: cursosDoProfessor } = await admin
    .from("ead_matriculas")
    .select("course_id")
    .eq("professor_id", professor.id);

  const cursosPermitidos = new Set((cursosDoProfessor ?? []).map((m) => m.course_id));
  if (!cursosPermitidos.has(course_id)) {
    erro("Você só pode matricular alunos no(s) curso(s) que já leciona.");
  }

  const { data: curso } = await admin.from("courses").select("id, title").eq("id", course_id).single();
  if (!curso) erro("Curso não encontrado.");

  if (cpf) {
    const { data: cpfExiste } = await admin.from("ead_alunos").select("id").eq("cpf", cpf).maybeSingle();
    if (cpfExiste) erro("Já existe um aluno cadastrado com esse CPF.");
  }

  const { data: matriculaNumero } = await admin.rpc("get_next_matricula_ead");
  const numero = matriculaNumero ?? `TESTE-${Date.now()}`;

  const { data: aluno, error: erroAluno } = await admin
    .from("ead_alunos")
    .insert({
      nome_completo,
      cpf,
      email,
      telefone,
      matricula: numero,
      curso_pretendido: curso!.title,
      status: "ATIVO",
    })
    .select("id, user_id")
    .single();

  if (erroAluno || !aluno) {
    console.error("[professor/actions] criar aluno", erroAluno);
    erro("Erro ao cadastrar aluno — verifique se o CPF já não está em uso.");
  }

  const { data: matricula, error: erroMatricula } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno!.id,
      course_id,
      curso_nome_snapshot: curso!.title,
      matricula: numero,
      status: "EM_ANDAMENTO",
      origem: "MATRICULA_DIRETA",
      professor_id: professor.id,
    })
    .select("id")
    .single();

  if (erroMatricula || !matricula) {
    console.error("[professor/actions] criar matrícula", erroMatricula);
    erro("Erro ao criar matrícula.");
  }

  // Parcelamento é opcional aqui — só matrícula (R$25, curso básico) por
  // enquanto; "Informar pagamentos" completo (Módulo 3) entra depois.
  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_matricula_centavos")
    .eq("course_id", course_id)
    .maybeSingle();

  if (preco?.valor_matricula_centavos) {
    await gerarParcelasContasReceber(admin, {
      origemTipo: "MATRICULA_DIRETA",
      origemId: matricula!.id,
      alunoId: aluno!.id,
      alunoUserId: aluno!.user_id,
      responsavelPagamento: "ALUNO",
      descricaoBase: `Matrícula — ${curso!.title}`,
      valorTotalCentavos: preco.valor_matricula_centavos,
      totalParcelas: 1,
      primeiroVencimento: new Date().toISOString().slice(0, 10),
      formaPagamentoPrevista: "PIX",
    });
  }

  revalidatePath("/professor");
  redirect("/professor?msg=" + encodeURIComponent(`${nome_completo} matriculado(a) com sucesso.`));
}
