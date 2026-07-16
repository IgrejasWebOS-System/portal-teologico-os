"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";

function centavosMatricula(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

// ============================================================
// Matrícula direta pelo staff — rotina paralela à inscrição
// pública (/inscricao): a secretaria cadastra o aluno (ficha
// completa) e já gera a matrícula na hora, sem passar pelo
// formulário público nem pelo pagamento online. Pensada para
// matrícula presencial/manual, onde o pagamento (se houver) já foi
// resolvido pessoalmente com a secretaria.
//
// Mesma identidade por CPF e mesma regra de "não repete o mesmo
// curso a não ser que tenha reprovado" da aprovação de inscrição
// (ver admin/inscricoes/actions.ts) — a regra em si é garantida
// pelo trigger `check_matricula_unica` no banco; aqui só damos uma
// mensagem de erro amigável antes de chegar lá.
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect(
      "/admin/matriculas?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return { supabase, userId: user.id };
}

function fail(message: string): never {
  redirect("/admin/matriculas/nova?error=" + encodeURIComponent(message));
}

export async function matricularDiretoAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();
  const admin = createAdminClient();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const course_id = (formData.get("course_id") as string) || "";
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const campo_ministerio_nome = (formData.get("campo_ministerio_nome") as string) || null;

  const rg = (formData.get("rg") as string)?.trim() || null;
  const rg_orgao_emissor = (formData.get("rg_orgao_emissor") as string)?.trim() || null;
  const rg_uf = (formData.get("rg_uf") as string)?.trim() || null;
  const data_nascimento = (formData.get("data_nascimento") as string) || null;
  const genero = (formData.get("genero") as string) || null;
  const estado_civil = (formData.get("estado_civil") as string) || null;
  const escolaridade = (formData.get("escolaridade") as string) || null;
  const profissao = (formData.get("profissao") as string) || null;
  const naturalidade_cidade = (formData.get("naturalidade_cidade") as string)?.trim() || null;
  const naturalidade_estado = (formData.get("naturalidade_estado") as string) || null;
  const nome_conjuge = (formData.get("nome_conjuge") as string)?.trim() || null;
  const nome_mae = (formData.get("nome_mae") as string)?.trim() || null;
  const nome_pai = (formData.get("nome_pai") as string)?.trim() || null;
  const cep = (formData.get("cep") as string)?.trim() || null;
  const endereco = (formData.get("endereco") as string)?.trim() || null;
  const endereco_numero = (formData.get("endereco_numero") as string)?.trim() || null;
  const endereco_complemento = (formData.get("endereco_complemento") as string)?.trim() || null;
  const bairro = (formData.get("bairro") as string)?.trim() || null;
  const cidade = (formData.get("cidade") as string)?.trim() || null;
  const estado = (formData.get("estado") as string) || null;

  if (!nome_completo || !cpf || !email || !course_id) {
    fail("Preencha nome completo, CPF, e-mail e o curso.");
  }

  const { data: curso } = await admin
    .from("courses")
    .select("id, title")
    .eq("id", course_id)
    .single();

  if (!curso) fail("Curso inválido.");

  // Identidade por CPF: reaproveita se a pessoa já existir
  let aluno: { id: string; user_id: string | null } | null = null;
  const { data: existente } = await admin
    .from("ead_alunos")
    .select("id, user_id")
    .eq("cpf", cpf)
    .maybeSingle();
  aluno = existente;

  if (aluno) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id")
      .eq("aluno_id", aluno.id)
      .eq("course_id", curso!.id)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (conflito) {
      fail(
        "Este CPF já possui matrícula em andamento ou aprovada neste curso. Só é possível matricular de novo se a tentativa anterior tiver sido reprovada."
      );
    }
  }

  const { data: matriculaNum, error: matriculaError } = await supabase.rpc(
    "get_next_matricula_ead"
  );
  if (matriculaError || !matriculaNum) {
    fail("Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido"));
  }

  if (!aluno) {
    const { data: novoAluno, error: alunoError } = await admin
      .from("ead_alunos")
      .insert({
        user_id: null,
        nome_completo,
        cpf,
        email,
        telefone,
        campo_ministerio_id,
        campo_ministerio_nome,
        matricula: matriculaNum,
        curso_pretendido: curso!.title,
        status: "ATIVO",
        rg,
        rg_orgao_emissor,
        rg_uf,
        data_nascimento,
        genero,
        estado_civil,
        escolaridade,
        profissao,
        naturalidade_cidade,
        naturalidade_estado,
        nome_conjuge,
        nome_mae,
        nome_pai,
        cep,
        endereco,
        endereco_numero,
        endereco_complemento,
        bairro,
        cidade,
        estado,
      })
      .select("id, user_id")
      .single();

    if (alunoError || !novoAluno) {
      fail("Erro ao cadastrar aluno: " + (alunoError?.message ?? "desconhecido"));
    }
    aluno = novoAluno;
  }

  if (!aluno.user_id) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: nome_completo },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
      });

    if (inviteError) {
      fail("Erro ao criar acesso do aluno: " + inviteError.message);
    }

    if (invited?.user?.id) {
      await admin
        .from("ead_alunos")
        .update({ user_id: invited.user.id })
        .eq("id", aluno.id);
      aluno = { ...aluno, user_id: invited.user.id };
    }
  }

  const { data: matriculaCriada, error: matriculaInsertError } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno.id,
      course_id: curso!.id,
      curso_nome_snapshot: curso!.title,
      matricula: matriculaNum,
      status: "EM_ANDAMENTO",
      origem: "MATRICULA_DIRETA",
      matriculado_por: userId,
    })
    .select("id")
    .single();

  if (matriculaInsertError || !matriculaCriada) {
    fail("Erro ao registrar matrícula: " + (matriculaInsertError?.message ?? "desconhecido"));
  }

  // Pagamento (opcional) — só gera parcelas em Contas a Receber se um
  // valor total foi informado. Não lança nada no Caixa Diário aqui:
  // isso só acontece quando a secretaria efetivamente der baixa em
  // cada parcela (dinheiro na mão, ali na hora ou depois).
  const valorTotalCentavos = centavosMatricula((formData.get("valor_total") as string) || "");
  if (valorTotalCentavos > 0) {
    const totalParcelas = Math.max(1, Number(formData.get("total_parcelas")) || 1);
    const dataVencimento = (formData.get("data_vencimento") as string) || new Date().toISOString().slice(0, 10);
    const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "DINHEIRO";
    const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
    const churchId = (formData.get("church_id") as string) || null;

    await gerarParcelasContasReceber(admin, {
      origemTipo: "MATRICULA_DIRETA",
      origemId: matriculaCriada!.id,
      alunoId: aluno.id,
      alunoUserId: aluno.user_id,
      responsavelPagamento: responsavel,
      churchId,
      descricaoBase: `Matrícula — ${curso!.title}`,
      valorTotalCentavos,
      totalParcelas,
      primeiroVencimento: dataVencimento,
      formaPagamentoPrevista: formaPagamento as "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA",
    });
  }

  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/financeiro/contas-a-receber");
  redirect(
    "/admin/matriculas?msg=" +
      encodeURIComponent(`Matrícula ${matriculaNum} criada para ${nome_completo}.`)
  );
}
