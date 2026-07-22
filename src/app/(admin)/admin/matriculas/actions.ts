"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";

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

// ── Turma (course_editions) — cadastro rápido, sem sair do formulário
export async function addTurmaAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const courseId = (formData.get("course_id") as string) || "";
  const nome = (formData.get("nome") as string)?.trim();
  const mesAnoInicio = (formData.get("data_inicio") as string) || ""; // "YYYY-MM"
  const mesAnoFim = (formData.get("data_fim") as string) || ""; // "YYYY-MM"

  if (!courseId) return { success: false, message: "Selecione o curso antes de criar a turma." };
  if (!nome) return { success: false, message: "Nome da turma é obrigatório." };

  const dataInicio = mesAnoInicio ? `${mesAnoInicio}-01` : null;
  const ano = mesAnoInicio ? Number(mesAnoInicio.slice(0, 4)) : new Date().getFullYear();

  let dataFim: string | null = null;
  if (mesAnoFim) {
    const [anoFim, mesFim] = mesAnoFim.split("-").map(Number);
    // Último dia do mês de término.
    dataFim = new Date(anoFim, mesFim, 0).toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from("course_editions")
    .insert({ course_id: courseId, nome, ano, data_inicio: dataInicio, data_fim: dataFim, status: "ABERTA" })
    .select("id, nome")
    .single();

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/matriculas/nova");
  return { success: true, data };
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
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id_aluno = (formData.get("church_id_aluno") as string) || null;
  const course_edition_id = (formData.get("course_edition_id") as string) || null;
  const professor_id = (formData.get("professor_id") as string) || null;

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
  const nacionalidade = (formData.get("nacionalidade") as string)?.trim() || "Brasileira";
  const consentimentoLgpdAceito = (formData.get("consentimento_lgpd_aceito") as string) === "true";

  if (!nome_completo || !cpf || !email || !course_id) {
    fail("Preencha nome completo, CPF, e-mail e o curso.");
  }

  if (!consentimentoLgpdAceito) {
    fail("É necessário confirmar o consentimento LGPD para gerar a matrícula.");
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
        sector_id,
        church_id: church_id_aluno,
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
        nacionalidade,
        consentimento_lgpd_aceito: consentimentoLgpdAceito,
        consentimento_lgpd_data: consentimentoLgpdAceito ? new Date().toISOString() : null,
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
      course_edition_id,
      professor_id,
    })
    .select("id")
    .single();

  if (matriculaInsertError || !matriculaCriada) {
    fail("Erro ao registrar matrícula: " + (matriculaInsertError?.message ?? "desconhecido"));
  }

  // Pagamento (opcional) — só gera cobrança em Contas a Receber se um
  // valor total foi informado. Duas formas: parcelamento manual (linhas
  // PENDENTE, baixadas uma a uma pela secretaria — não toca no Caixa
  // Diário) ou cobrança única via Mercado Pago (mesmo padrão da Loja):
  // gera um link de pagamento e a linha em Contas a Receber só vira PAGO
  // quando o webhook confirmar o pagamento de verdade.
  const valorTotalCentavos = centavosMatricula((formData.get("valor_total") as string) || "");
  const formaCobranca = (formData.get("forma_cobranca") as string) === "MERCADOPAGO" ? "MERCADOPAGO" : "MANUAL";
  const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const churchId = (formData.get("church_id") as string) || null;

  let linkPagamento: string | null = null;

  if (valorTotalCentavos > 0 && formaCobranca === "MANUAL") {
    const totalParcelas = Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || 1));
    const dataVencimento = (formData.get("data_vencimento") as string) || new Date().toISOString().slice(0, 10);
    const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "DINHEIRO";

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
  } else if (valorTotalCentavos > 0 && formaCobranca === "MERCADOPAGO") {
    const { data: contaReceber, error: erroContaReceber } = await admin
      .from("fin_contas_receber")
      .insert({
        origem_tipo: "MATRICULA_DIRETA",
        origem_id: matriculaCriada!.id,
        aluno_id: aluno.id,
        aluno_user_id: aluno.user_id,
        responsavel_pagamento: responsavel,
        church_id: responsavel === "IGREJA" ? churchId : null,
        descricao: `Matrícula — ${curso!.title}`,
        numero_parcela: 1,
        total_parcelas: 1,
        valor_bruto_centavos: valorTotalCentavos,
        forma_pagamento_prevista: "CARTAO",
        data_vencimento: new Date().toISOString().slice(0, 10),
        status: "PENDENTE",
      })
      .select("id")
      .single();

    if (erroContaReceber || !contaReceber) {
      console.error("[matricula direta] Falha ao criar conta a receber para link Mercado Pago:", erroContaReceber);
    } else {
      try {
        const preferencia = await criarPreferenciaCheckout({
          orderId: contaReceber.id,
          itens: [{ titulo: `Matrícula — ${curso!.title}`, quantidade: 1, precoUnitarioCentavos: valorTotalCentavos }],
          emailComprador: email,
          backUrlPath: "/matricula/pagamento",
        });

        await admin
          .from("fin_contas_receber")
          .update({ mercadopago_preference_id: preferencia.id })
          .eq("id", contaReceber.id);

        linkPagamento = preferencia.sandbox_init_point || preferencia.init_point;
      } catch (e) {
        console.error("[matricula direta] Falha ao criar preferência no Mercado Pago:", e);
      }
    }
  }

  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/financeiro/contas-a-receber");

  const msg = `Matrícula ${matriculaNum} criada para ${nome_completo}.`;
  const params = new URLSearchParams({ msg });
  if (linkPagamento) params.set("link", linkPagamento);
  redirect(`/admin/matriculas?${params.toString()}`);
}
