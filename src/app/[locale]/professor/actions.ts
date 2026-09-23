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
import { validarCPF } from "@/utils/cpf";
import { upsertProfissaoLivre } from "@/utils/profissoes";
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
// Reescrita em 20/09/2026 (pedido do Joaquim) — a versão anterior tinha
// 3 lacunas reais: (1) nunca mandava convite de acesso pro aluno (ele
// nunca conseguia logar), (2) só coletava 4 campos (a ficha nunca mais
// seria completada depois, já que MATRICULA_DIRETA pula o gate
// /completar-cadastro de propósito), (3) só gerava a parcela da
// matrícula, ignorando as mensalidades do curso. Agora espelha
// matricularDiretoAction (secretaria, admin/matriculas/actions.ts):
// ficha completa + convite + plano de parcelas inteiro.
export async function professorCriarMatriculaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim();
  // 22/09/2026, achado em teste (Joaquim): o campo antigo "course_id" só
  // listava cursos em que o professor JÁ tinha algum aluno matriculado
  // (derivado de ead_matriculas) — um professor recém-vinculado a uma turma
  // nova (ex.: 2027, ainda sem nenhum aluno) não tinha NENHUMA opção pra
  // escolher, mesmo já lecionando aquele curso. Trocado por
  // "course_edition_id" (a turma específica, vinda de professor_turmas —
  // fonte de verdade de "quais turmas este professor leciona", ver
  // migration 103), validado abaixo antes de confiar nele.
  const course_edition_id = formData.get("course_edition_id") as string;

  const rg = (formData.get("rg") as string)?.trim() || null;
  const rg_orgao_emissor = (formData.get("rg_orgao_emissor") as string)?.trim() || null;
  const rg_uf = (formData.get("rg_uf") as string)?.trim() || null;
  const data_nascimento = (formData.get("data_nascimento") as string) || null;
  const genero = (formData.get("genero") as string) || null;
  const estado_civil = (formData.get("estado_civil") as string) || null;
  const escolaridade = (formData.get("escolaridade") as string)?.trim() || null;
  const profissao = (formData.get("profissao") as string)?.trim() || null;
  const naturalidade_cidade = (formData.get("naturalidade_cidade") as string)?.trim() || null;
  const naturalidade_estado = (formData.get("naturalidade_estado") as string)?.trim() || null;
  const nacionalidade = (formData.get("nacionalidade") as string)?.trim() || "Brasileira";
  const nome_conjuge = (formData.get("nome_conjuge") as string)?.trim() || null;
  const nome_mae = (formData.get("nome_mae") as string)?.trim() || null;
  const nome_pai = (formData.get("nome_pai") as string)?.trim() || null;
  const cep = (formData.get("cep") as string)?.trim() || null;
  const endereco = (formData.get("endereco") as string)?.trim() || null;
  const endereco_numero = (formData.get("endereco_numero") as string)?.trim() || null;
  const endereco_complemento = (formData.get("endereco_complemento") as string)?.trim() || null;
  const bairro = (formData.get("bairro") as string)?.trim() || null;
  const cidade = (formData.get("cidade") as string)?.trim() || null;
  const estado = (formData.get("estado") as string)?.trim() || null;

  if (
    // 22/09/2026, pedido do Joaquim: RG (número) não é mais obrigatório em
    // nenhum formulário — o novo documento de identidade unificado não tem
    // esse número. Órgão emissor/UF do RG continuam obrigatórios por ora.
    !nome_completo || !cpf || !email || !telefone || !course_edition_id ||
    !rg_orgao_emissor || !rg_uf || !data_nascimento || !genero || !estado_civil ||
    !escolaridade || !naturalidade_cidade || !naturalidade_estado || !nome_mae ||
    !cep || !endereco || !endereco_numero || !bairro || !cidade || !estado
  ) {
    erro("Preencha todos os campos obrigatórios da ficha.");
  }

  if (!validarCPF(cpf)) {
    erro("CPF inválido — confira os dígitos digitados.");
  }

  // Professor só matricula em turma que ele já leciona de verdade (evita
  // course_edition_id arbitrário vindo de um form manipulado no client) —
  // fonte de verdade é professor_turmas, não as matrículas que já existem.
  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("course_edition_id, course_editions(course_id, courses(id, title))")
    .eq("professor_id", professor.id)
    .eq("course_edition_id", course_edition_id)
    .maybeSingle();

  if (!vinculo) {
    erro("Você só pode matricular alunos numa turma que já está vinculada a você.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseEdition = (Array.isArray((vinculo as any).course_editions) ? (vinculo as any).course_editions[0] : (vinculo as any).course_editions) as { course_id: string; courses: { id: string; title: string } | { id: string; title: string }[] | null } | null;
  const cursoRaw = courseEdition?.courses;
  const curso = (Array.isArray(cursoRaw) ? cursoRaw[0] : cursoRaw) as { id: string; title: string } | null;
  const course_id = courseEdition?.course_id ?? "";
  if (!curso || !course_id) erro("Curso não encontrado para esta turma.");

  const { data: alunoExistente } = await admin.from("ead_alunos").select("id, user_id").eq("cpf", cpf).maybeSingle();
  if (alunoExistente) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id")
      .eq("aluno_id", alunoExistente.id)
      .eq("course_id", course_id)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();
    if (conflito) erro("Já existe um aluno com esse CPF matriculado neste curso.");
  }

  await upsertProfissaoLivre(admin, profissao);

  const { data: matriculaNumero } = await admin.rpc("get_next_matricula_ead");
  const numero = matriculaNumero ?? `TESTE-${Date.now()}`;

  let aluno = alunoExistente;
  if (!aluno) {
    const { data: novoAluno, error: erroAluno } = await admin
      .from("ead_alunos")
      .insert({
        user_id: null,
        nome_completo,
        cpf,
        email,
        telefone,
        matricula: numero,
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
        nacionalidade,
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

    if (erroAluno || !novoAluno) {
      console.error("[professor/actions] criar aluno", erroAluno);
      erro("Erro ao cadastrar aluno — verifique se o CPF já não está em uso.");
    }
    aluno = novoAluno;
  }

  // Convite de acesso (MUITO IMPORTANTE, pedido do Joaquim 20/09/2026):
  // como esta matrícula é MATRICULA_DIRETA, o aluno NUNCA passa pelo
  // gate /completar-cadastro -- o link do e-mail é só pra ele criar a
  // própria senha e cair direto na área dele (definirSenhaAction →
  // resolverDestinoPosLogin). Mesmo redirectTo de matricularDiretoAction.
  if (!aluno!.user_id) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: nome_completo },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
    });

    if (inviteError) {
      console.error("[professor/actions] convite aluno", inviteError);
      erro("Aluno cadastrado, mas houve erro ao enviar o convite de acesso: " + inviteError.message);
    }

    if (invited?.user?.id) {
      await admin.from("ead_alunos").update({ user_id: invited.user.id }).eq("id", aluno!.id);
      aluno = { ...aluno!, user_id: invited.user.id };
    }
  }

  const { data: matricula, error: erroMatricula } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno!.id,
      course_id,
      course_edition_id,
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

  // Também garante a matrícula em "enrollments" (sistema genérico de aulas,
  // controla o player/progresso em /escola) — mesmo bug real encontrado no
  // teste da Matrícula Direta da secretaria (20/09/2026): sem isso o aluno
  // fica com ead_matriculas ativa mas ainda vê "Matricule-se para assistir"
  // ao abrir a própria aula. Mesmo padrão de matricularAlunoEmCurso()
  // (utils/ead/matricular.ts) e do fix espelhado em admin/matriculas/actions.ts.
  if (aluno!.user_id) {
    await admin
      .from("enrollments")
      .upsert(
        { user_id: aluno!.user_id, course_id, status: "ENROLLED" },
        { onConflict: "user_id,course_id", ignoreDuplicates: true }
      );
  }

  // Plano de parcelas completo — mesma regra do course_pricing (básico
  // sempre com valor de matrícula + 12x, médio só com as parcelas) usada
  // em matricularDiretoAction e em salvarPagamentoInicialAlunoAction.
  // Nasce tudo PENDENTE aqui -- é o aluno (primeiro acesso) ou a
  // secretaria (Financeiro) quem confirma o que já foi pago depois.
  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_matricula_centavos, valor_parcela_centavos, numero_parcelas")
    .eq("course_id", course_id)
    .maybeSingle();

  const hojeIso = new Date().toISOString().slice(0, 10);

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
      primeiroVencimento: hojeIso,
      formaPagamentoPrevista: "PIX",
    });
  }

  if (preco?.valor_parcela_centavos) {
    await gerarParcelasContasReceber(admin, {
      origemTipo: "MATRICULA_DIRETA",
      origemId: matricula!.id,
      alunoId: aluno!.id,
      alunoUserId: aluno!.user_id,
      responsavelPagamento: "ALUNO",
      descricaoBase: `Mensalidade — ${curso!.title}`,
      valorTotalCentavos: preco.valor_parcela_centavos * preco.numero_parcelas,
      totalParcelas: preco.numero_parcelas,
      primeiroVencimento: hojeIso,
      formaPagamentoPrevista: "PIX",
    });
  }

  revalidatePath("/professor");
  redirect("/professor?msg=" + encodeURIComponent(`${nome_completo} matriculado(a) com sucesso. Um e-mail de acesso foi enviado.`));
}

// ── AÇÃO 3: CRIAR TURMA (mutirão de cadastro, 18/09/2026) ───────
// Professor cria a própria turma (course_editions) e o vínculo
// professor_turmas correspondente, que já nasce com um link_token —
// esse é o link público que ele manda pros próprios alunos
// (/matricula-turma/[token]). Mesmo shape de addTurmaConfigAction
// (configuracoes/actions.ts), só que escopado ao próprio professor
// em vez de staff.
export async function professorCriarTurmaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const course_id = formData.get("course_id") as string;
  const unit_id = (formData.get("unit_id") as string) || null;
  const nome = (formData.get("nome") as string)?.trim();
  const turno = formData.get("turno") as string;
  const dia_semana = formData.get("dia_semana") as string;
  const classe = (formData.get("classe") as string)?.trim().toUpperCase() || null;
  const data_inicio = (formData.get("data_inicio") as string) || null;
  const data_fim = (formData.get("data_fim") as string) || null;

  if (!course_id || !nome || !unit_id || !turno || !dia_semana) {
    erro("Preencha curso, igreja, nome da turma, turno e dia da semana.");
  }

  const ano = data_inicio ? Number(data_inicio.slice(0, 4)) : new Date().getFullYear();

  const { data: turma, error: erroTurma } = await admin
    .from("course_editions")
    .insert({
      course_id,
      unit_id,
      nome: nome!.toUpperCase(),
      classe,
      ano,
      data_inicio,
      data_fim,
      status: "ABERTA",
    })
    .select("id")
    .single();

  if (erroTurma || !turma) {
    console.error("[professor/actions] criar turma", erroTurma);
    erro("Erro ao criar a turma. Tente novamente.");
  }

  const { error: erroVinculo } = await admin.from("professor_turmas").insert({
    professor_id: professor.id,
    course_edition_id: turma!.id,
    turno,
    dia_semana,
  });

  if (erroVinculo) {
    console.error("[professor/actions] vincular professor_turmas", erroVinculo);
    erro("Turma criada, mas houve erro ao gerar seu link de matrícula. Fale com a secretaria.");
  }

  revalidatePath("/professor");
  redirect("/professor?msg=" + encodeURIComponent(`Turma "${nome}" criada. O link de matrícula já está na lista abaixo.`));
}

// ── AÇÃO 4: DESATIVAR/REATIVAR LINK DE MATRÍCULA DE UMA TURMA ───
export async function professorAlternarLinkTurmaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;
  const ativar = formData.get("ativar") === "true";

  const { data: vinculo } = await admin.from("professor_turmas").select("id, professor_id").eq("id", id).single();
  if (!vinculo || vinculo.professor_id !== professor.id) {
    erro("Este link não pertence a você.");
  }

  await admin.from("professor_turmas").update({ link_ativo: ativar }).eq("id", id);

  revalidatePath("/professor");
  redirect("/professor?msg=" + encodeURIComponent(ativar ? "Link reativado." : "Link desativado."));
}
