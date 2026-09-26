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
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { validarCPF } from "@/utils/cpf";
import { upsertProfissaoLivre } from "@/utils/profissoes";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { gerarPdfMatricula } from "@/utils/pdf/matricula";

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
  // 25/09/2026, achado em teste (Joaquim): layout da ficha reescrito pra
  // bater com o padrão admin (ver ProfessorNovaMatriculaForm.tsx), que
  // inclui foto do aluno — sem isso aqui o upload seria descartado.
  const foto_url = (formData.get("foto_url") as string)?.trim() || null;
  // 25/09/2026, achados em teste (Joaquim): a ficha nunca perguntava Setor/
  // Igreja do aluno (ficava sempre sem essa informação) nem a data desde
  // quando ele já cursa (pra alunos antigos sendo migrados pro sistema —
  // mesma lógica já usada no link público de matrícula, ver matricular.ts).
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id = (formData.get("church_id") as string) || null;
  const dataMatriculaInformada = (formData.get("data_matricula_informada") as string) || null;

  if (
    // 22/09/2026, pedido do Joaquim: RG (número) não é mais obrigatório em
    // nenhum formulário — o novo documento de identidade unificado não tem
    // esse número. Órgão emissor/UF do RG continuam obrigatórios por ora.
    !nome_completo || !cpf || !email || !telefone || !course_edition_id ||
    !rg_orgao_emissor || !rg_uf || !data_nascimento || !genero || !estado_civil ||
    !escolaridade || !naturalidade_cidade || !naturalidade_estado || !nome_mae ||
    !cep || !endereco || !endereco_numero || !bairro || !cidade || !estado ||
    !sector_id || !church_id
  ) {
    erro("Preencha todos os campos obrigatórios da ficha.");
  }

  if (!validarCPF(cpf)) {
    erro("CPF inválido — confira os dígitos digitados.");
  }

  if (dataMatriculaInformada && dataMatriculaInformada > new Date().toISOString().slice(0, 10)) {
    erro("A data informada não pode ser no futuro.");
  }

  // Professor só matricula em turma que ele já leciona de verdade (evita
  // course_edition_id arbitrário vindo de um form manipulado no client) —
  // fonte de verdade é professor_turmas, não as matrículas que já existem.
  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("course_edition_id, course_editions(nome, classe, course_id, courses(id, title))")
    .eq("professor_id", professor.id)
    .eq("course_edition_id", course_edition_id)
    .maybeSingle();

  if (!vinculo) {
    erro("Você só pode matricular alunos numa turma que já está vinculada a você.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseEdition = (Array.isArray((vinculo as any).course_editions) ? (vinculo as any).course_editions[0] : (vinculo as any).course_editions) as { nome: string | null; classe: string | null; course_id: string; courses: { id: string; title: string } | { id: string; title: string }[] | null } | null;
  const cursoRaw = courseEdition?.courses;
  const curso = (Array.isArray(cursoRaw) ? cursoRaw[0] : cursoRaw) as { id: string; title: string } | null;
  const course_id = courseEdition?.course_id ?? "";
  if (!curso || !course_id) erro("Curso não encontrado para esta turma.");
  const turmaNome = courseEdition?.nome
    ? `${courseEdition.nome}${courseEdition.classe ? ` - Classe ${courseEdition.classe}` : ""}`
    : null;

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
        foto_url,
        sector_id,
        church_id,
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
      // 25/09/2026, pedido do Joaquim: aluno antigo sendo cadastrado agora
      // no sistema informa desde quando já cursa — essa data vira a base do
      // 1º vencimento (mesma lógica de matricular.ts/data_matricula
      // informada no link público). Em branco = hoje (comportamento antigo).
      ...(dataMatriculaInformada ? { data_matricula: dataMatriculaInformada } : {}),
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

  // 25/09/2026, pedido do Joaquim: aluno antigo (já cursando) informado com
  // uma data anterior usa ELA como base do 1º vencimento, não a data de
  // hoje — senão um aluno que já cursa desde janeiro nasceria com a
  // primeira parcela vencendo hoje, empurrando o cronograma inteiro.
  const primeiroVencimento = dataMatriculaInformada ?? new Date().toISOString().slice(0, 10);

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
      primeiroVencimento,
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
      primeiroVencimento,
      formaPagamentoPrevista: "PIX",
    });
  }

  // 25/09/2026, achado em teste (Joaquim): a matrícula feita pela Área do
  // Professor nunca gerava o PDF da ficha (por isso "Baixar PDF" não
  // aparecia na listagem de /admin/matriculas para esses alunos) — o
  // mesmo bug antigo do link público da turma, mas aqui ainda não tinha
  // sido corrigido. Mesmo bloco de matricularDiretoAction
  // (admin/matriculas/actions.ts): gera o PDF na hora e salva o caminho
  // em ead_alunos.pdf_matricula_path; nunca bloqueia a matrícula se falhar.
  try {
    let setorNome: string | null = null;
    let igrejaNome: string | null = null;
    if (sector_id) {
      const { data: setor } = await admin.from("sectors").select("name").eq("id", sector_id).maybeSingle();
      setorNome = setor?.name ?? null;
    }
    if (church_id) {
      const { data: igreja } = await admin.from("churches").select("name").eq("id", church_id).maybeSingle();
      igrejaNome = igreja?.name ?? null;
    }

    let fotoParaPdf: Uint8Array | null = null;
    if (foto_url) {
      try {
        const res = await fetch(foto_url);
        if (res.ok) fotoParaPdf = new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        console.error("[professor/actions] erro ao buscar foto pro PDF:", err);
      }
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "desconhecido";
    const userAgent = hdrs.get("user-agent") || "desconhecido";

    const pdfBytes = await gerarPdfMatricula(
      {
        nomeCompleto: nome_completo,
        matricula: numero,
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
        professorNome: professor.nome_completo,
        setorNome,
        igrejaNome,
        pagamento: preco
          ? {
              valorMatriculaCentavos: preco.valor_matricula_centavos ?? null,
              valorParcelaCentavos: preco.valor_parcela_centavos ?? 0,
              parcelas: preco.numero_parcelas ?? 1,
              formaPagamento: "PIX",
              responsavelPagamento: "ALUNO",
              primeiroVencimento,
            }
          : null,
      },
      null, // sem assinatura eletrônica — ficha preenchida pelo professor, não pelo aluno
      { ip, userAgent, assinadoEm: new Date() },
      fotoParaPdf
    );

    const pdfFileName = `matricula-${aluno!.id}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[professor/actions] upload do PDF falhou:", pdfUploadError.message);
    } else {
      await admin.from("ead_alunos").update({ pdf_matricula_path: pdfFileName }).eq("id", aluno!.id);
    }
  } catch (err) {
    console.error("[professor/actions] erro inesperado ao gerar PDF da matrícula:", err);
  }

  revalidatePath("/professor");
  revalidatePath("/admin/matriculas");
  // 25/09/2026, pedido do Joaquim: alguns professores preferem cadastrar o
  // aluno direto pela Área do Professor em vez de mandar o link da turma —
  // nesse caso o único jeito de o aluno acessar era o e-mail de convite
  // (que às vezes cai no spam ou demora). Manda o id do aluno recém-criado
  // na query pra /professor mostrar um cartão com botão de copiar o link
  // de definir senha na hora (ver LinkSenhaAlunoCard.tsx + ação abaixo).
  redirect(
    "/professor?msg=" +
      encodeURIComponent(`${nome_completo} matriculado(a) com sucesso. Um e-mail de acesso foi enviado.`) +
      "&novoAlunoId=" + encodeURIComponent(aluno!.id) +
      "&novoAlunoNome=" + encodeURIComponent(nome_completo)
  );
}

// ── AÇÃO 2b: GERAR LINK DE DEFINIR SENHA PRO ALUNO (cópia manual) ──
// 25/09/2026, pedido do Joaquim: depois de matricular pela Área do
// Professor, o professor pode querer encaminhar o link de acesso ele
// mesmo (WhatsApp, por exemplo) em vez de depender só do e-mail de
// convite — principalmente se o e-mail cair no spam ou demorar. Gera um
// link de recuperação de senha válido pro aluno já convidado (mesmo
// destino final do convite: /definir-senha), sem reenviar e-mail nenhum.
export async function professorGerarLinkSenhaAction(alunoId: string): Promise<{ success: boolean; url?: string; message?: string }> {
  const { professor, admin } = await requireProfessor();

  if (!alunoId) return { success: false, message: "Aluno não informado." };

  // Confere que este aluno pertence mesmo a uma matrícula deste professor
  // antes de gerar qualquer link de acesso pra ele.
  const { data: vinculo } = await admin
    .from("ead_matriculas")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("professor_id", professor.id)
    .maybeSingle();

  if (!vinculo) return { success: false, message: "Esse aluno não pertence a você." };

  const { data: aluno } = await admin.from("ead_alunos").select("email, user_id").eq("id", alunoId).maybeSingle();
  if (!aluno?.email) return { success: false, message: "Aluno sem e-mail cadastrado." };

  const { data, error } = await admin.auth.admin.generateLink({
    type: aluno.user_id ? "recovery" : "invite",
    email: aluno.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha` },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[professor/actions] gerar link senha", error);
    return { success: false, message: "Erro ao gerar o link. Tente novamente." };
  }

  return { success: true, url: data.properties.action_link };
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
