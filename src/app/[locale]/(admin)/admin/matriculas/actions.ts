"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { validarCPF } from "@/utils/cpf";
import { gerarPdfMatricula, type DadosPagamentoPdf } from "@/utils/pdf/matricula";

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

// ============================================================
// Link de download do PDF assinado da matrícula (ver
// confirmar-cadastro/[id]/actions.ts, que gera o PDF na confirmação
// do cadastro). O bucket é privado, então o link é gerado sob
// demanda (signed URL de curta duração) em vez de guardar uma URL
// permanente no banco — o PDF tem CPF/RG/endereço do aluno.
// ============================================================
// Reconstrói a seção "Pagamento" do PDF a partir do que está de verdade em
// fin_contas_receber (não a partir de um snapshot antigo) — reflete
// qualquer renegociação/edição posterior, e é a única fonte que ainda
// existe depois da matrícula criada (o formulário de origem não persiste
// forma_cobranca/responsavel em lugar nenhum reconsultável). Convenção de
// `descricao` definida em matricularDiretoAction/gerarParcelasContasReceber:
// "Matrícula — <curso>" (taxa avulsa), "Mensalidade — <curso>" (parcelas),
// "Matrícula + curso — <curso>" (cobrança única via Mercado Pago).
async function buscarDadosPagamentoPdf(
  admin: ReturnType<typeof createAdminClient>,
  alunoId: string
): Promise<DadosPagamentoPdf | null> {
  const { data: contas } = await admin
    .from("fin_contas_receber")
    .select("descricao, valor_bruto_centavos, numero_parcela, total_parcelas, forma_pagamento_prevista, data_vencimento, responsavel_pagamento")
    .eq("aluno_id", alunoId)
    .order("data_vencimento", { ascending: true });

  if (!contas || contas.length === 0) return null;

  const linhaMatricula = contas.find((c) => c.descricao?.startsWith("Matrícula —"));
  const linhasMensalidade = contas.filter((c) => c.descricao?.startsWith("Mensalidade —"));
  const linhaUnica = contas.find((c) => c.descricao?.startsWith("Matrícula + curso"));

  if (linhaUnica) {
    return {
      valorMatriculaCentavos: undefined, // cobrança única — não dá pra separar o recorte com segurança
      valorParcelaCentavos: linhaUnica.valor_bruto_centavos,
      parcelas: 1,
      formaPagamento: "Mercado Pago / Pix",
      responsavelPagamento: linhaUnica.responsavel_pagamento,
      primeiroVencimento: linhaUnica.data_vencimento,
    };
  }

  const primeira = linhasMensalidade[0] ?? linhaMatricula ?? contas[0];
  return {
    valorMatriculaCentavos: linhaMatricula ? linhaMatricula.valor_bruto_centavos : linhasMensalidade.length ? 0 : undefined,
    valorParcelaCentavos: linhasMensalidade[0]?.valor_bruto_centavos ?? linhaMatricula?.valor_bruto_centavos ?? 0,
    parcelas: linhasMensalidade[0]?.total_parcelas ?? linhasMensalidade.length ?? 1,
    formaPagamento: primeira?.forma_pagamento_prevista ?? null,
    responsavelPagamento: primeira?.responsavel_pagamento ?? null,
    primeiroVencimento: linhasMensalidade[0]?.data_vencimento ?? linhaMatricula?.data_vencimento ?? null,
  };
}

// Gera o PDF DE NOVO a partir dos dados ATUAIS do aluno (nunca serve o
// arquivo estático salvo na criação) — antes, "Baixar PDF" só devolvia o
// PDF gerado uma única vez lá em matricularDiretoAction/confirmar-cadastro,
// então editar a matrícula depois (ex.: adicionar foto que faltava) nunca
// aparecia no PDF baixado. Agora regenera do zero toda vez, sobrescrevendo
// pdf_matricula_path com um arquivo novo.
export async function gerarLinkPdfMatriculaAction(
  alunoId: string
): Promise<{ success: true; url: string } | { success: false; message: string }> {
  await requireStaff();
  const admin = createAdminClient();

  const { data: aluno } = await admin.from("ead_alunos").select("*").eq("id", alunoId).maybeSingle();
  if (!aluno) {
    return { success: false, message: "Aluno não encontrado." };
  }

  const { data: matriculaRow } = await admin
    .from("ead_matriculas")
    .select("matricula, curso_nome_snapshot, course_edition_id, professor_id")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!matriculaRow) {
    return { success: false, message: "Este aluno ainda não tem matrícula registrada." };
  }

  try {
    let turmaNome: string | null = null;
    let professorNome: string | null = null;
    let setorNome: string | null = null;
    let igrejaNome: string | null = null;

    if (matriculaRow.course_edition_id) {
      const { data: turma } = await admin.from("course_editions").select("nome").eq("id", matriculaRow.course_edition_id).maybeSingle();
      turmaNome = turma?.nome ?? null;
    }
    if (matriculaRow.professor_id) {
      const { data: professor } = await admin.from("professores").select("nome_completo").eq("id", matriculaRow.professor_id).maybeSingle();
      professorNome = professor?.nome_completo ?? null;
    }
    if (aluno.sector_id) {
      const { data: setor } = await admin.from("sectors").select("name").eq("id", aluno.sector_id).maybeSingle();
      setorNome = setor?.name ?? null;
    }
    if (aluno.church_id) {
      const { data: igreja } = await admin.from("churches").select("name").eq("id", aluno.church_id).maybeSingle();
      igrejaNome = igreja?.name ?? null;
    }

    // Busca a foto ATUAL (pode ter sido adicionada/trocada na tela de
    // edição depois do cadastro original) — é exatamente isso que faltava.
    let fotoParaPdf: Uint8Array | null = null;
    if (aluno.foto_url) {
      try {
        const res = await fetch(aluno.foto_url);
        if (res.ok) fotoParaPdf = new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        console.error("[matriculas] erro ao buscar foto pro PDF:", err);
      }
    }

    const pagamento = await buscarDadosPagamentoPdf(admin, alunoId);

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "desconhecido";
    const userAgent = hdrs.get("user-agent") || "desconhecido";

    const pdfBytes = await gerarPdfMatricula(
      {
        nomeCompleto: aluno.nome_completo,
        matricula: matriculaRow.matricula,
        cursoPretendido: matriculaRow.curso_nome_snapshot,
        cpf: aluno.cpf,
        email: aluno.email,
        telefone: aluno.telefone,
        dataNascimento: aluno.data_nascimento,
        rg: aluno.rg,
        rgOrgaoEmissor: aluno.rg_orgao_emissor,
        rgUf: aluno.rg_uf,
        genero: aluno.genero,
        estadoCivil: aluno.estado_civil,
        escolaridade: aluno.escolaridade,
        profissao: aluno.profissao,
        naturalidadeCidade: aluno.naturalidade_cidade,
        naturalidadeEstado: aluno.naturalidade_estado,
        nacionalidade: aluno.nacionalidade,
        nomeConjuge: aluno.nome_conjuge,
        nomeMae: aluno.nome_mae,
        nomePai: aluno.nome_pai,
        cep: aluno.cep,
        endereco: aluno.endereco,
        enderecoNumero: aluno.endereco_numero,
        enderecoComplemento: aluno.endereco_complemento,
        bairro: aluno.bairro,
        cidade: aluno.cidade,
        estado: aluno.estado,
        turmaNome,
        professorNome,
        campoMinisterio: aluno.campo_ministerio_nome,
        setorNome,
        igrejaNome,
        pagamento,
      },
      null, // sem assinatura eletrônica — reimpressão administrativa
      { ip, userAgent, assinadoEm: new Date() },
      fotoParaPdf
    );

    const pdfFileName = `matricula-${aluno.id}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[matriculas] upload do PDF regenerado falhou:", pdfUploadError.message);
      return { success: false, message: "Erro ao gerar o PDF. Tente novamente." };
    }

    await admin.from("ead_alunos").update({ pdf_matricula_path: pdfFileName }).eq("id", aluno.id);

    const { data: signed, error } = await admin.storage
      .from("matriculas-pdf")
      .createSignedUrl(pdfFileName, 60 * 10); // 10 min — baixa na hora

    if (error || !signed) {
      console.error("[matriculas/actions] falha ao gerar link do PDF:", error?.message);
      return { success: false, message: "Erro ao gerar o link de download. Tente novamente." };
    }

    return { success: true, url: signed.signedUrl };
  } catch (err) {
    console.error("[matriculas] erro inesperado ao regenerar PDF:", err);
    return { success: false, message: "Erro inesperado ao gerar o PDF. Tente novamente." };
  }
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

  if (error) {
    console.error("[matriculas/actions]", error);
    return { success: false, message: "Erro ao salvar. Tente novamente." };
  }
  revalidatePath("/admin/matriculas/nova");
  return { success: true, data };
}

export async function matricularDiretoAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();
  const admin = createAdminClient();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const foto_url = (formData.get("foto_url") as string)?.trim() || null;
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

  if (!validarCPF(cpf)) {
    fail("CPF inválido — confira os dígitos digitados.");
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

  // M10c: a unidade do aluno vem da igreja selecionada (churches.unit_id,
  // ver M4/058). Se a turma escolhida for restrita a uma unidade
  // (course_editions.unit_id, ver M8/062), o aluno só pode ser
  // matriculado se pertencer a essa unidade ou a uma descendente dela
  // (unit_is_within, também do M8) — turma sem unit_id continua aberta
  // a qualquer aluno, como sempre foi.
  let alunoUnitId: string | null = null;
  if (church_id_aluno) {
    const { data: churchRow } = await admin
      .from("churches")
      .select("unit_id")
      .eq("id", church_id_aluno)
      .single();
    alunoUnitId = churchRow?.unit_id ?? null;
  }

  if (course_edition_id) {
    const { data: turma } = await admin
      .from("course_editions")
      .select("unit_id, nome")
      .eq("id", course_edition_id)
      .single();

    if (turma?.unit_id) {
      if (!alunoUnitId) {
        fail(
          `A turma "${turma.nome}" é restrita a uma unidade específica. Selecione a igreja do aluno (vinculada à árvore de unidades) ou escolha outra turma.`
        );
      }
      const { data: dentroDaUnidade } = await admin.rpc("unit_is_within", {
        p_unit_id: alunoUnitId,
        p_ancestor_id: turma.unit_id,
      });
      if (!dentroDaUnidade) {
        fail(`A turma "${turma.nome}" é restrita a outra unidade — este aluno não pertence a ela.`);
      }
    }
  }

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
        foto_url,
        cpf,
        email,
        telefone,
        campo_ministerio_id,
        campo_ministerio_nome,
        sector_id,
        church_id: church_id_aluno,
        unit_id: alunoUnitId,
        tipo_aluno: church_id_aluno ? "IGREJA" : null,
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

  // Pagamento (opcional) — só gera cobrança em Contas a Receber se algum
  // valor foi informado. Vem pré-preenchido a partir do preço fixo do
  // curso (course_pricing, ver Financeiro > Preços dos Cursos), mas a
  // secretaria pode sobrescrever pontualmente. Duas formas: parcelamento
  // manual (matrícula é uma linha à parte, PAGA/baixada uma a uma pela
  // secretaria — não toca no Caixa Diário) ou cobrança única via Mercado
  // Pago (mesmo padrão da Loja): gera um link Pix/Checkout Pro com o
  // valor total (matrícula + parcelas somadas), e a linha em Contas a
  // Receber só vira PAGO quando o webhook confirmar o pagamento de verdade.
  const valorMatriculaCentavos = centavosMatricula((formData.get("valor_matricula") as string) || "");
  const valorParcelaCentavos = centavosMatricula((formData.get("valor_parcela") as string) || "");
  const totalParcelas = Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || 1));
  const valorTotalCentavos = valorMatriculaCentavos + valorParcelaCentavos * totalParcelas;
  const formaCobranca = (formData.get("forma_cobranca") as string) === "MERCADOPAGO" ? "MERCADOPAGO" : "MANUAL";
  const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const churchId = (formData.get("church_id") as string) || null;

  let linkPagamento: string | null = null;

  if (valorTotalCentavos > 0 && formaCobranca === "MANUAL") {
    const dataVencimento = (formData.get("data_vencimento") as string) || new Date().toISOString().slice(0, 10);
    const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "DINHEIRO";

    // Matrícula é uma cobrança à parte (vence junto com a 1ª parcela, mas
    // com descrição própria) — só existe quando o curso cobra matrícula
    // separada (ex.: Curso Básico); o Médio não gera essa linha.
    if (valorMatriculaCentavos > 0) {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: matriculaCriada!.id,
        alunoId: aluno.id,
        alunoUserId: aluno.user_id,
        responsavelPagamento: responsavel,
        churchId,
        descricaoBase: `Matrícula — ${curso!.title}`,
        valorTotalCentavos: valorMatriculaCentavos,
        totalParcelas: 1,
        primeiroVencimento: dataVencimento,
        formaPagamentoPrevista: formaPagamento as "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA",
      });
    }

    if (valorParcelaCentavos > 0) {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: matriculaCriada!.id,
        alunoId: aluno.id,
        alunoUserId: aluno.user_id,
        responsavelPagamento: responsavel,
        churchId,
        descricaoBase: `Mensalidade — ${curso!.title}`,
        valorTotalCentavos: valorParcelaCentavos * totalParcelas,
        totalParcelas,
        primeiroVencimento: dataVencimento,
        formaPagamentoPrevista: formaPagamento as "DINHEIRO" | "PIX" | "CARTAO" | "BOLETO" | "TRANSFERENCIA",
      });
    }
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
        descricao: `Matrícula + curso — ${curso!.title}`,
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
          itens: [{ titulo: `Matrícula + curso — ${curso!.title}`, quantidade: 1, precoUnitarioCentavos: valorTotalCentavos }],
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

  // PDF da matrícula (item pendente #7 — Matrícula Direta ainda não gerava
  // nenhum) — mesmo formato dos fluxos de Ficha Rápida/Confirmar Cadastro,
  // gerado aqui porque a secretaria já preencheu a ficha inteira de uma vez.
  // Best-effort: se falhar, a matrícula já foi criada normalmente, só sem
  // o "Baixar PDF" habilitado na listagem.
  try {
    let turmaNome: string | null = null;
    let professorNome: string | null = null;
    let setorNome: string | null = null;
    let igrejaNome: string | null = null;

    if (course_edition_id) {
      const { data: turma } = await admin
        .from("course_editions")
        .select("nome")
        .eq("id", course_edition_id)
        .maybeSingle();
      turmaNome = turma?.nome ?? null;
    }
    if (professor_id) {
      const { data: professor } = await admin
        .from("professores")
        .select("nome_completo")
        .eq("id", professor_id)
        .maybeSingle();
      professorNome = professor?.nome_completo ?? null;
    }
    if (sector_id) {
      const { data: setor } = await admin.from("sectors").select("name").eq("id", sector_id).maybeSingle();
      setorNome = setor?.name ?? null;
    }
    if (church_id_aluno) {
      const { data: igreja } = await admin.from("churches").select("name").eq("id", church_id_aluno).maybeSingle();
      igrejaNome = igreja?.name ?? null;
    }

    let fotoParaPdf: Uint8Array | null = null;
    if (foto_url) {
      try {
        const res = await fetch(foto_url);
        if (res.ok) fotoParaPdf = new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        console.error("[matricula direta] erro ao buscar foto pro PDF:", err);
      }
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "desconhecido";
    const userAgent = hdrs.get("user-agent") || "desconhecido";

    const pdfBytes = await gerarPdfMatricula(
      {
        nomeCompleto: nome_completo,
        matricula: matriculaNum,
        cursoPretendido: curso!.title,
        cpf,
        email,
        telefone,
        dataNascimento: data_nascimento,
        rg,
        rgOrgaoEmissor: rg_orgao_emissor,
        rgUf: rg_uf,
        genero,
        estadoCivil: estado_civil,
        escolaridade,
        profissao,
        naturalidadeCidade: naturalidade_cidade,
        naturalidadeEstado: naturalidade_estado,
        nacionalidade,
        nomeConjuge: nome_conjuge,
        nomeMae: nome_mae,
        nomePai: nome_pai,
        cep,
        endereco,
        enderecoNumero: endereco_numero,
        enderecoComplemento: endereco_complemento,
        bairro,
        cidade,
        estado,
        turmaNome,
        professorNome,
        campoMinisterio: campo_ministerio_nome,
        setorNome,
        igrejaNome,
        pagamento:
          valorTotalCentavos > 0
            ? formaCobranca === "MERCADOPAGO"
              ? {
                  // Cobrança única (link Mercado Pago) — não dá pra saber o
                  // recorte exato matrícula/parcela sem risco de mostrar
                  // algo errado, então undefined (nunca marca "isento" à toa).
                  valorMatriculaCentavos: undefined,
                  valorParcelaCentavos: valorTotalCentavos,
                  parcelas: 1,
                  formaPagamento: "Mercado Pago / Pix",
                  responsavelPagamento: responsavel,
                  primeiroVencimento: new Date().toISOString().slice(0, 10),
                }
              : {
                  valorMatriculaCentavos,
                  valorParcelaCentavos,
                  parcelas: totalParcelas,
                  formaPagamento: (formData.get("forma_pagamento_prevista") as string) || null,
                  responsavelPagamento: responsavel,
                  primeiroVencimento: (formData.get("data_vencimento") as string) || null,
                }
            : null,
      },
      null, // sem assinatura eletrônica — ficha preenchida pela secretaria, não pelo aluno
      { ip, userAgent, assinadoEm: new Date() },
      fotoParaPdf
    );

    const pdfFileName = `matricula-${aluno.id}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[matricula direta] upload do PDF falhou:", pdfUploadError.message);
    } else {
      await admin.from("ead_alunos").update({ pdf_matricula_path: pdfFileName }).eq("id", aluno.id);
    }
  } catch (err) {
    console.error("[matricula direta] erro inesperado ao gerar PDF da matrícula:", err);
  }

  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/financeiro/contas-a-receber");

  const msg = `Matrícula ${matriculaNum} criada para ${nome_completo}.`;
  const params = new URLSearchParams({ msg });
  if (linkPagamento) params.set("link", linkPagamento);
  redirect(`/admin/matriculas?${params.toString()}`);
}

// ============================================================
// Edição de uma matrícula já existente (item #12) — dados pessoais,
// curso/vínculo, lançamento retroativo de pagamento (regularização
// dos alunos que já estudam, com a data original em que a pessoa
// pagou de verdade) e cancelamento. Não é possível trocar o CPF nem
// o curso por aqui — isso exigiria uma nova matrícula.
// ============================================================

function failEdicao(matriculaId: string, message: string): never {
  redirect(`/admin/matriculas/${matriculaId}?error=` + encodeURIComponent(message));
}

export async function atualizarMatriculaAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  const alunoId = (formData.get("aluno_id") as string) || "";
  if (!matriculaId || !alunoId) fail("Matrícula inválida.");

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
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
  const foto_url = (formData.get("foto_url") as string)?.trim() || null;

  if (!nome_completo || !email) {
    failEdicao(matriculaId, "Nome completo e e-mail são obrigatórios.");
  }

  // Resolve o nome do campo/ministério pelo id direto no servidor — evita
  // depender de um campo extra no formulário só pra carregar o texto (essa
  // dessincronia já causou o campo aparecer em branco no PDF/telas antes).
  let campo_ministerio_nome: string | null = null;
  if (campo_ministerio_id) {
    const { data: campoRow } = await admin
      .from("ead_campos_ministerios")
      .select("nome")
      .eq("id", campo_ministerio_id)
      .maybeSingle();
    campo_ministerio_nome = campoRow?.nome ?? null;
  }

  const { error: alunoError } = await admin
    .from("ead_alunos")
    .update({
      nome_completo, email, telefone,
      campo_ministerio_id, campo_ministerio_nome,
      sector_id, church_id: church_id_aluno,
      rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao,
      naturalidade_cidade, naturalidade_estado, nome_conjuge, nome_mae, nome_pai,
      cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado, nacionalidade,
      foto_url,
    })
    .eq("id", alunoId);

  if (alunoError) failEdicao(matriculaId, "Erro ao salvar dados pessoais: " + alunoError.message);

  const { error: matriculaError } = await admin
    .from("ead_matriculas")
    .update({ course_edition_id, professor_id })
    .eq("id", matriculaId);

  if (matriculaError) failEdicao(matriculaId, "Erro ao salvar curso/vínculo: " + matriculaError.message);

  revalidatePath(`/admin/matriculas/${matriculaId}`);
  revalidatePath("/admin/matriculas");
  redirect(`/admin/matriculas/${matriculaId}?msg=` + encodeURIComponent("Dados atualizados."));
}

// Lançamento retroativo — pra regularizar aluno que já paga/estuda desde
// antes deste sistema. Entra direto como PAGO, com a data em que a
// pessoa realmente pagou (não gera cobrança pendente nova/fantasma).
export async function lancarPagamentoRetroativoAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  const alunoId = (formData.get("aluno_id") as string) || "";
  if (!matriculaId || !alunoId) fail("Matrícula inválida.");

  const valorTotalCentavos = centavosMatricula((formData.get("valor_total") as string) || "");
  const totalParcelas = Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || 1));
  const dataPagamento = (formData.get("data_pagamento") as string) || "";
  const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "DINHEIRO";
  const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const churchId = (formData.get("church_id") as string) || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  if (valorTotalCentavos <= 0) failEdicao(matriculaId, "Informe o valor pago.");
  if (!dataPagamento) failEdicao(matriculaId, "Informe a data original do pagamento.");

  const { error } = await admin.from("fin_contas_receber").insert({
    origem_tipo: "MATRICULA_DIRETA",
    origem_id: matriculaId,
    aluno_id: alunoId,
    responsavel_pagamento: responsavel,
    church_id: responsavel === "IGREJA" ? churchId : null,
    descricao: `Regularização — lançamento retroativo${totalParcelas > 1 ? ` (${totalParcelas} parcelas)` : ""}`,
    numero_parcela: 1,
    total_parcelas: totalParcelas,
    valor_bruto_centavos: valorTotalCentavos,
    forma_pagamento_prevista: formaPagamento,
    data_vencimento: dataPagamento,
    status: "PAGO",
    pago_em: new Date(`${dataPagamento}T12:00:00`).toISOString(),
    observacoes,
  });

  if (error) failEdicao(matriculaId, "Erro ao lançar pagamento: " + error.message);

  revalidatePath(`/admin/matriculas/${matriculaId}`);
  revalidatePath("/admin/financeiro/contas-a-receber");
  redirect(`/admin/matriculas/${matriculaId}?msg=` + encodeURIComponent("Pagamento retroativo lançado."));
}

// Cancelamento — nunca apaga a linha de verdade (perderia o histórico
// pra auditoria/inventário), só muda o status pra CANCELADO.
export async function cancelarMatriculaAction(formData: FormData) {
  await requireStaff();
  const admin = createAdminClient();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  if (!matriculaId) fail("Matrícula inválida.");

  const { error } = await admin
    .from("ead_matriculas")
    .update({ status: "CANCELADO" })
    .eq("id", matriculaId);

  if (error) failEdicao(matriculaId, "Erro ao cancelar: " + error.message);

  revalidatePath("/admin/matriculas");
  redirect("/admin/matriculas?msg=" + encodeURIComponent("Matrícula cancelada."));
}
