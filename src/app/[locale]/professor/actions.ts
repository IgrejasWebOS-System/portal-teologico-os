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

// 27/09/2026, pedido do Joaquim: Nova Matrícula do professor ganhou a
// mesma caixa de Pagamento da Nova Matrícula Direta da secretaria (valor
// de matrícula/parcela/nº de parcelas editáveis, pré-preenchidos pelo
// course_pricing) — mesmo parser de "25,00"/"1.234,56" usado lá
// (admin/matriculas/actions.ts: centavosMatricula).
function centavosValor(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

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

// 27/09/2026, Fase 1 do Painel do Professor (sidebar + rotas separadas):
// cada ação agora redireciona pra sub-rota onde o resultado é visível —
// antes tudo apontava pra "/professor" (página única); "/professor" virou
// só o Dashboard, então um erro/mensagem de "dar baixa" ou "nova matrícula"
// que continuasse indo pra lá nunca apareceria pro professor. Path default
// cobre a maioria dos chamadores (ações de aluno/matrícula); turma passa
// o próprio path explicitamente.
function erro(msg: string, path: string = "/professor/alunos"): never {
  redirect(path + "?error=" + encodeURIComponent(msg));
}

// ── AÇÃO 1: DAR BAIXA EM PARCELA (só forma não-dinheiro) ────────
// Dinheiro fica de fora de propósito: exige Caixa Diário aberto, que é
// um controle de secretaria (fin_lancamentos) — professor não abre caixa.
export async function professorBaixarParcelaAction(formData: FormData) {
  const { userId, professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;
  const forma_pagamento = formData.get("forma_pagamento") as string;
  // 27/09/2026, Fase 1 (rotas separadas): esta ação agora é chamada tanto
  // de /professor/alunos quanto de /professor/financeiro — cada form
  // manda de onde veio pra voltar pro mesmo lugar depois da baixa, em vez
  // de sempre cair em /professor/alunos.
  const redirectTo = (formData.get("redirect_to") as string) || "/professor/alunos";

  if (!id || !forma_pagamento) erro("Dados incompletos.", redirectTo);
  if (forma_pagamento === "DINHEIRO") {
    erro("Pagamento em dinheiro só pode ser baixado pela secretaria (Caixa Diário).", redirectTo);
  }

  const { data: conta } = await admin
    .from("fin_contas_receber")
    .select("id, status, origem_id, origem_tipo, valor_bruto_centavos")
    .eq("id", id)
    .single();

  if (!conta) erro("Parcela não encontrada.", redirectTo);
  if (conta!.status === "PAGO") erro("Essa parcela já foi baixada.", redirectTo);
  if (conta!.origem_tipo !== "MATRICULA_DIRETA") erro("Parcela fora do escopo do professor.", redirectTo);

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, professor_id")
    .eq("id", conta!.origem_id)
    .single();

  if (!matricula || matricula.professor_id !== professor.id) {
    erro("Essa parcela não pertence a um aluno seu.", redirectTo);
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
    erro("Erro ao dar baixa. Tente novamente.", redirectTo);
  }

  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath("/professor/financeiro");
  redirect(redirectTo + "?msg=" + encodeURIComponent("Parcela baixada com sucesso."));
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
  // 26/09/2026, pedido do Joaquim (achado em teste): campo novo, separado
  // de "data_matricula_informada" -- antes a ficha do professor não tinha
  // nenhum controle de lançamento financeiro, e matrícula + 1ª parcela da
  // mensalidade sempre nasciam vencendo no mesmo dia sem jeito de mudar.
  // Mesmo campo/nome já usado na Nova Matrícula da secretaria
  // (NovaMatriculaForm.tsx: "1º vencimento" / data_vencimento).
  const dataVencimentoInformada = (formData.get("data_vencimento") as string) || null;

  // 26/09/2026, achado em teste (Joaquim: "não salvou, o que é essa tarja
  // vermelha?"): a mensagem genérica "preencha todos os campos" não dizia
  // QUAL campo estava faltando -- lista aqui pra apontar exatamente o que
  // falta preencher, em vez do professor ter que adivinhar rolando a ficha
  // inteira de novo.
  // 22/09/2026, pedido do Joaquim: RG (número) não é mais obrigatório em
  // nenhum formulário — o novo documento de identidade unificado não tem
  // esse número. Órgão emissor/UF do RG continuam obrigatórios por ora.
  // 26/09/2026, padronização (varredura geral): sector_id NÃO é mais
  // obrigatório aqui — quando o aluno é da SEDE, não existe Setor (a
  // Sede não pertence a nenhum Setor), então sector_id chega vazio de
  // propósito; church_id continua obrigatório (é ele que garante que
  // algum local — igreja ou Sede — foi escolhido).
  const camposObrigatorios: [string, unknown][] = [
    ["Nome completo", nome_completo],
    ["CPF", cpf],
    ["E-mail", email],
    ["Telefone", telefone],
    ["Turma", course_edition_id],
    ["Órgão emissor do RG", rg_orgao_emissor],
    ["UF do RG", rg_uf],
    ["Data de nascimento", data_nascimento],
    ["Gênero", genero],
    ["Estado civil", estado_civil],
    ["Escolaridade", escolaridade],
    ["Naturalidade — cidade", naturalidade_cidade],
    ["Naturalidade — UF", naturalidade_estado],
    ["Nome da mãe", nome_mae],
    ["CEP", cep],
    ["Endereço", endereco],
    ["Número", endereco_numero],
    ["Bairro", bairro],
    ["Cidade", cidade],
    ["UF", estado],
    ["Igreja", church_id],
  ];
  // 27/09/2026, pedido do Joaquim: "Nova Matrícula" saiu da tela de Alunos
  // (modal) e virou página própria (/professor/matricula) — os erros desta
  // ação agora voltam pra lá, não mais pra /professor/alunos (senão o
  // professor perderia a ficha que estava preenchendo).
  const voltarEmErro = "/professor/matricula";

  const faltando = camposObrigatorios.filter(([, valor]) => !valor).map(([label]) => label);
  if (faltando.length > 0) {
    erro(`Preencha os campos obrigatórios que faltam: ${faltando.join(", ")}.`, voltarEmErro);
  }

  if (!validarCPF(cpf)) {
    erro("CPF inválido — confira os dígitos digitados.", voltarEmErro);
  }

  if (dataMatriculaInformada && dataMatriculaInformada > new Date().toISOString().slice(0, 10)) {
    erro("A data informada não pode ser no futuro.", voltarEmErro);
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
    erro("Você só pode matricular alunos numa turma que já está vinculada a você.", voltarEmErro);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseEdition = (Array.isArray((vinculo as any).course_editions) ? (vinculo as any).course_editions[0] : (vinculo as any).course_editions) as { nome: string | null; classe: string | null; course_id: string; courses: { id: string; title: string } | { id: string; title: string }[] | null } | null;
  const cursoRaw = courseEdition?.courses;
  const curso = (Array.isArray(cursoRaw) ? cursoRaw[0] : cursoRaw) as { id: string; title: string } | null;
  const course_id = courseEdition?.course_id ?? "";
  if (!curso || !course_id) erro("Curso não encontrado para esta turma.", voltarEmErro);
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
    if (conflito) erro("Já existe um aluno com esse CPF matriculado neste curso.", voltarEmErro);
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
      erro("Erro ao cadastrar aluno — verifique se o CPF já não está em uso.", voltarEmErro);
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
      erro("Aluno cadastrado, mas houve erro ao enviar o convite de acesso: " + inviteError.message, voltarEmErro);
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
    erro("Erro ao criar matrícula.", voltarEmErro);
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

  // Plano de parcelas — 27/09/2026, pedido do Joaquim: a ficha do
  // professor ganhou a mesma caixa de Pagamento da secretaria
  // (valor_matricula/valor_parcela/total_parcelas/forma_pagamento_prevista
  // editáveis, pré-preenchidos no client a partir do course_pricing — se o
  // professor não mexer em nada, o valor final é o mesmo de antes). Nasce
  // tudo PENDENTE (ou PAGO, se vier confirmado no modal de parcelas) --
  // secretaria/Financeiro confirmam o resto depois.
  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_matricula_centavos, valor_parcela_centavos, numero_parcelas")
    .eq("course_id", course_id)
    .maybeSingle();

  const valorMatriculaCentavos =
    centavosValor((formData.get("valor_matricula") as string) || "") || preco?.valor_matricula_centavos || 0;
  const valorParcelaCentavos =
    centavosValor((formData.get("valor_parcela") as string) || "") || preco?.valor_parcela_centavos || 0;
  const totalParcelas =
    Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || preco?.numero_parcelas || 12));
  const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "PIX";

  // 26/09/2026, pedido do Joaquim: "1º vencimento" (campo novo, explícito)
  // manda em quem manda a data — só cai pra "Data matrícula" ou pra hoje se
  // o professor deixar o campo de vencimento em branco (não deveria
  // acontecer, já vem preenchido com hoje por padrão, mas evita quebrar se
  // algum form antigo em cache mandar sem esse campo).
  const primeiroVencimento =
    dataVencimentoInformada ?? dataMatriculaInformada ?? new Date().toISOString().slice(0, 10);

  if (valorMatriculaCentavos > 0) {
    await gerarParcelasContasReceber(admin, {
      origemTipo: "MATRICULA_DIRETA",
      origemId: matricula!.id,
      alunoId: aluno!.id,
      alunoUserId: aluno!.user_id,
      responsavelPagamento: "ALUNO",
      descricaoBase: `Matrícula — ${curso!.title}`,
      valorTotalCentavos: valorMatriculaCentavos,
      totalParcelas: 1,
      primeiroVencimento,
      formaPagamentoPrevista: formaPagamento as "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "BOLETO" | "TRANSFERENCIA",
    });
  }

  if (valorParcelaCentavos > 0) {
    // Mesmo padrão de admin/matriculas/actions.ts (matricularDiretoAction):
    // se a ficha passou pelo modal de confirmação de parcelas
    // (ConfirmarParcelasModal), usa as datas/status já decididos ali —
    // vencimento com o ajuste de fim de semana e "já paga" pra aluno que
    // já estuda desde antes. Sem isso, cai no cálculo automático de sempre.
    const overridesRaw = (formData.get("parcelas_mensalidade_json") as string) || "";
    let overrides: {
      numero: number;
      total: number;
      data_vencimento: string;
      valor_centavos: number;
      paga: boolean;
    }[] = [];
    if (overridesRaw) {
      try {
        overrides = JSON.parse(overridesRaw);
      } catch {
        overrides = [];
      }
    }

    if (overrides.length > 0) {
      const linhas = overrides.map((o) => ({
        origem_tipo: "MATRICULA_DIRETA" as const,
        origem_id: matricula!.id,
        aluno_id: aluno!.id,
        aluno_user_id: aluno!.user_id,
        responsavel_pagamento: "ALUNO" as const,
        descricao:
          o.total > 1
            ? `Mensalidade — ${curso!.title} — parcela ${o.numero}/${o.total}`
            : `Mensalidade — ${curso!.title}`,
        numero_parcela: o.numero,
        total_parcelas: o.total,
        valor_bruto_centavos: o.valor_centavos,
        forma_pagamento_prevista: formaPagamento as "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "BOLETO" | "TRANSFERENCIA",
        data_vencimento: o.data_vencimento,
        status: o.paga ? ("PAGO" as const) : ("PENDENTE" as const),
        pago_em: o.paga ? new Date(`${o.data_vencimento}T12:00:00`).toISOString() : null,
      }));
      await admin.from("fin_contas_receber").insert(linhas);
    } else {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: matricula!.id,
        alunoId: aluno!.id,
        alunoUserId: aluno!.user_id,
        responsavelPagamento: "ALUNO",
        descricaoBase: `Mensalidade — ${curso!.title}`,
        valorTotalCentavos: valorParcelaCentavos * totalParcelas,
        totalParcelas,
        primeiroVencimento,
        formaPagamentoPrevista: formaPagamento as "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "BOLETO" | "TRANSFERENCIA",
      });
    }
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
        pagamento:
          valorMatriculaCentavos > 0 || valorParcelaCentavos > 0
            ? {
                valorMatriculaCentavos: valorMatriculaCentavos || null,
                valorParcelaCentavos,
                parcelas: totalParcelas,
                formaPagamento,
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
  revalidatePath("/professor/alunos");
  revalidatePath("/professor/financeiro");
  revalidatePath("/admin/matriculas");
  // 25/09/2026, pedido do Joaquim: alguns professores preferem cadastrar o
  // aluno direto pela Área do Professor em vez de mandar o link da turma —
  // nesse caso o único jeito de o aluno acessar era o e-mail de convite
  // (que às vezes cai no spam ou demora). Manda o id do aluno recém-criado
  // na query pra /professor/alunos mostrar um cartão com botão de copiar o
  // link de definir senha na hora (ver LinkSenhaAlunoCard.tsx + ação abaixo).
  // 27/09/2026, Fase 1 (rotas separadas): "Nova Matrícula" mora na tela de
  // Alunos agora, não mais no Dashboard — redirect ajustado junto.
  redirect(
    "/professor/alunos?msg=" +
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
    erro("Preencha curso, igreja, nome da turma, turno e dia da semana.", "/professor/turmas");
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
    erro("Erro ao criar a turma. Tente novamente.", "/professor/turmas");
  }

  const { error: erroVinculo } = await admin.from("professor_turmas").insert({
    professor_id: professor.id,
    course_edition_id: turma!.id,
    turno,
    dia_semana,
  });

  if (erroVinculo) {
    console.error("[professor/actions] vincular professor_turmas", erroVinculo);
    erro("Turma criada, mas houve erro ao gerar seu link de matrícula. Fale com a secretaria.", "/professor/turmas");
  }

  revalidatePath("/professor");
  revalidatePath("/professor/turmas");
  redirect("/professor/turmas?msg=" + encodeURIComponent(`Turma "${nome}" criada. O link de matrícula já está na lista abaixo.`));
}

// ── AÇÃO 4: DESATIVAR/REATIVAR LINK DE MATRÍCULA DE UMA TURMA ───
export async function professorAlternarLinkTurmaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;
  const ativar = formData.get("ativar") === "true";

  const { data: vinculo } = await admin.from("professor_turmas").select("id, professor_id").eq("id", id).single();
  if (!vinculo || vinculo.professor_id !== professor.id) {
    erro("Este link não pertence a você.", "/professor/turmas");
  }

  await admin.from("professor_turmas").update({ link_ativo: ativar }).eq("id", id);

  revalidatePath("/professor");
  revalidatePath("/professor/turmas");
  redirect("/professor/turmas?msg=" + encodeURIComponent(ativar ? "Link reativado." : "Link desativado."));
}

// ── AÇÃO: APAGAR TURMA (29/09/2026, pedido do Joaquim) ──────────
// Corrige o efeito colateral do bug de duplo clique em "Criar turma e
// gerar link" (turma duplicada) — apaga a `course_editions` que o próprio
// professor criou. `professor_turmas` cai junto por ON DELETE CASCADE
// (migration 103), não precisa apagar os dois separado. Bloqueia se já
// tiver aluno matriculado nessa turma -- nesse caso não é mais "lixo do
// duplo clique", é uma turma de verdade em uso, e apagar perderia
// matrícula de aluno de verdade.
export async function professorApagarTurmaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("id, professor_id, course_edition_id")
    .eq("id", id)
    .single();

  if (!vinculo || vinculo.professor_id !== professor.id) {
    erro("Esta turma não pertence a você.", "/professor/turmas");
  }

  const { count } = await admin
    .from("ead_matriculas")
    .select("id", { count: "exact", head: true })
    .eq("course_edition_id", vinculo!.course_edition_id);

  if (count && count > 0) {
    erro("Essa turma já tem aluno matriculado — não dá pra apagar por aqui. Fale com a secretaria.", "/professor/turmas");
  }

  const { error: erroApagar } = await admin
    .from("course_editions")
    .delete()
    .eq("id", vinculo!.course_edition_id);

  if (erroApagar) {
    console.error("[professor/actions] professorApagarTurmaAction", erroApagar);
    erro("Erro ao apagar a turma. Tente novamente.", "/professor/turmas");
  }

  revalidatePath("/professor");
  revalidatePath("/professor/turmas");
  redirect("/professor/turmas?msg=" + encodeURIComponent("Turma apagada."));
}

// ── AÇÃO: REENVIAR LINK DE MATRÍCULA/ACESSO DO ALUNO ────────────
// 29/09/2026, pedido do Joaquim: até agora só existia a instrução
// ("peça pra ele reabrir o link da turma") -- mas com o problema de
// entregabilidade do e-mail de convite (ver ERROS-COMUNS-IA.md,
// 28/09/2026), o professor precisa poder disparar de novo sem depender do
// aluno reabrir nada. Reaproveita inviteUserByEmail — reenviar um convite
// pra um usuário que já existe simplesmente gera e manda um novo link,
// não quebra o cadastro.
export async function professorReenviarLinkAlunoAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const alunoId = formData.get("aluno_id") as string;

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("professor_id", professor.id)
    .maybeSingle();

  if (!matricula) erro("Este aluno não pertence a você.", "/professor/alunos");

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, email, nome_completo")
    .eq("id", alunoId)
    .single();

  if (!aluno?.email) erro("Este aluno não tem e-mail cadastrado.", "/professor/alunos");

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(aluno!.email, {
    data: { full_name: aluno!.nome_completo },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  if (inviteError) {
    console.error("[professor/actions] professorReenviarLinkAlunoAction", inviteError);
    erro("Erro ao reenviar o link: " + inviteError.message, "/professor/alunos");
  }

  await admin
    .from("ead_alunos")
    .update({ convite_status: "ENVIADO", convite_enviado_em: new Date().toISOString(), convite_erro: null })
    .eq("id", alunoId);

  revalidatePath("/professor/alunos");
  redirect("/professor/alunos?msg=" + encodeURIComponent(`Link de acesso reenviado pra ${aluno!.nome_completo}.`));
}

// ── AÇÃO: PEDIDO DE MATERIAL (remessa da próxima aula) ──────────
// 29/09/2026, redesenho do fluxo de material didático (migration 122):
// material é por AULA (não por curso), e o pedido pra gráfica é feito
// perto do fim da aula atual, com a quantidade digitada manualmente (sem
// regra fixa de margem — quem pede sempre acrescenta uma sobra por
// conta própria). O professor só pede pra turma dele; a contagem de
// "alunos em andamento" é só referência, guardada como snapshot.
export async function professorCriarPedidoMaterialAction(formData: FormData) {
  const { userId, professor, admin } = await requireProfessor();

  const courseEditionId = formData.get("course_edition_id") as string;
  const lessonId = formData.get("lesson_id") as string;
  const quantidade = Number(formData.get("quantidade_solicitada"));
  const observacao = (formData.get("observacao") as string)?.trim() || null;

  if (!quantidade || quantidade <= 0) {
    erro("Informe uma quantidade válida.", "/professor/turmas");
  }

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("professor_id")
    .eq("course_edition_id", courseEditionId)
    .eq("professor_id", professor.id)
    .maybeSingle();

  if (!vinculo) erro("Esta turma não pertence a você.", "/professor/turmas");

  const { count: alunosEmAndamento } = await admin
    .from("ead_matriculas")
    .select("id", { count: "exact", head: true })
    .eq("course_edition_id", courseEditionId)
    .eq("status", "EM_ANDAMENTO");

  const { error: erroPedido } = await admin.from("pedidos_material").insert({
    course_edition_id: courseEditionId,
    lesson_id: lessonId,
    alunos_em_andamento_snapshot: alunosEmAndamento ?? 0,
    quantidade_solicitada: quantidade,
    observacao,
    solicitado_por_professor_id: professor.id,
    solicitado_por_user_id: userId,
  });

  if (erroPedido) {
    console.error("[professor/actions] professorCriarPedidoMaterialAction", erroPedido);
    erro("Erro ao registrar o pedido. Tente novamente.", "/professor/turmas");
  }

  revalidatePath("/professor/turmas");
  redirect("/professor/turmas?msg=" + encodeURIComponent("Pedido de material registrado."));
}

// ── AÇÃO: CALENDÁRIO DE AULAS DA PRÓPRIA TURMA ──────────────────
// 30/09/2026, pedido do Joaquim: ele foi procurar "onde fica o
// gerenciamento das datas de aulas pra pedido de livros" em /professor e
// não achou — só existia a edição pelo lado da secretaria
// (dashboard/configuracoes/persona/turmas). O professor sempre pôde editar
// essas linhas via RLS (cels_professor_all, migration 122), só faltava a
// tela. Mesmo par de ações do admin (atualizarCalendarioAulaAction /
// recalcularCalendarioTurmaAction), só que verificando posse da turma e
// redirecionando pra /professor/turmas.
export async function professorAtualizarCalendarioAulaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const courseEditionId = formData.get("course_edition_id") as string;
  const lessonId = formData.get("lesson_id") as string;
  const dataInicio = (formData.get("data_inicio") as string) || null;
  const dataFim = (formData.get("data_fim") as string) || null;

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("professor_id")
    .eq("course_edition_id", courseEditionId)
    .eq("professor_id", professor.id)
    .maybeSingle();

  if (!vinculo) erro("Esta turma não pertence a você.", "/professor/turmas");

  const { error: erroCalendario } = await admin
    .from("course_edition_lesson_schedule")
    .update({ data_inicio: dataInicio, data_fim: dataFim, gerado_automaticamente: false })
    .eq("course_edition_id", courseEditionId)
    .eq("lesson_id", lessonId);

  if (erroCalendario) {
    console.error("[professor/actions] professorAtualizarCalendarioAulaAction", erroCalendario);
    erro("Erro ao salvar a data da aula.", "/professor/turmas");
  }

  revalidatePath("/professor/turmas");
  redirect("/professor/turmas?msg=" + encodeURIComponent("Calendário da aula atualizado."));
}

export async function professorRecalcularCalendarioTurmaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const courseEditionId = formData.get("course_edition_id") as string;

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("professor_id")
    .eq("course_edition_id", courseEditionId)
    .eq("professor_id", professor.id)
    .maybeSingle();

  if (!vinculo) erro("Esta turma não pertence a você.", "/professor/turmas");

  const { error: erroRecalcular } = await admin.rpc("gerar_calendario_aulas_turma", {
    p_course_edition_id: courseEditionId,
    p_forcar: true,
  });

  if (erroRecalcular) {
    console.error("[professor/actions] professorRecalcularCalendarioTurmaAction", erroRecalcular);
    erro("Erro ao recalcular o calendário.", "/professor/turmas");
  }

  revalidatePath("/professor/turmas");
  redirect(
    "/professor/turmas?msg=" +
      encodeURIComponent("Calendário recalculado automaticamente (sobrescreveu seus ajustes manuais nesta turma).")
  );
}

// ── AÇÃO: ATUALIZAR PRÓPRIO PERFIL (telefone + foto) ────────────
// 27/09/2026, pedido do Joaquim: Configurações deixou de ser só leitura —
// mas escopo bem restrito de propósito: telefone e foto, o resto da ficha
// (nome, CPF, cargo, igreja/setor) continua só a secretaria mexendo,
// mesma régua de segurança que já vale pro resto do sistema.
export async function professorAtualizarPerfilAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const foto_url = (formData.get("foto_url") as string)?.trim() || null;

  // 27/09/2026, pedido do Joaquim: o professor deixou de ver Nome, CPF,
  // Cargo, Igreja e Setor só como leitura — agora edita tudo direto por
  // aqui (o aviso "só a secretaria altera" foi removido da tela). Continua
  // sem poder mexer no e-mail de login (isso é conta, não ficha).
  const nome_completo = (formData.get("nome_completo") as string)?.trim() || null;
  const cpf = (formData.get("cpf") as string)?.trim() || null;
  const cargo = (formData.get("cargo") as string)?.trim() || null;
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id = (formData.get("church_id") as string) || null;

  // 29/09/2026, pedido do Joaquim: "habilitar edição completa" — o
  // professor passa a editar a mesma ficha completa que a secretaria edita
  // em /dashboard/configuracoes/professores/editar/[id] (RG, nascimento,
  // endereço etc.), não só nome/cargo/setor/igreja/telefone. Mesmos nomes
  // de campo de extrairFicha() (configuracoes/actions.ts) — mantidos
  // duplicados aqui de propósito (escopos de permissão diferentes: aquele
  // é da secretaria sobre qualquer professor, este é do professor sobre
  // si mesmo) em vez de compartilhar a função entre route groups.
  const rg = (formData.get("rg") as string)?.trim() || null;
  const rg_orgao_emissor = (formData.get("rg_orgao_emissor") as string)?.trim() || null;
  const rg_uf = (formData.get("rg_uf") as string)?.trim() || null;
  const data_nascimento = (formData.get("data_nascimento") as string) || null;
  const genero = (formData.get("genero") as string) || null;
  const estado_civil = (formData.get("estado_civil") as string) || null;
  const escolaridade = (formData.get("escolaridade") as string) || null;
  const profissao = (formData.get("profissao") as string)?.trim() || null;
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

  if (cpf && !validarCPF(cpf)) {
    erro("CPF inválido — confira os dígitos digitados.", "/professor/configuracoes");
  }
  if (!church_id) {
    erro("Selecione a igreja (ou SEDE).", "/professor/configuracoes");
  }

  const { error } = await admin
    .from("professores")
    .update({
      telefone, foto_url, nome_completo, cpf, cargo, sector_id, church_id,
      rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil,
      escolaridade, profissao, naturalidade_cidade, naturalidade_estado,
      nome_conjuge, nome_mae, nome_pai, cep, endereco, endereco_numero,
      endereco_complemento, bairro, cidade, estado,
    })
    .eq("id", professor.id);

  if (error) {
    console.error("[professor/actions] atualizar perfil", error);
    erro("Erro ao salvar. Tente novamente.", "/professor/configuracoes");
  }

  revalidatePath("/professor/configuracoes");
  revalidatePath("/professor");
  redirect("/professor/configuracoes?msg=" + encodeURIComponent("Dados atualizados com sucesso."));
}

// ── AÇÃO 5: LANÇAR DESPESA DO NÚCLEO (Fase 2, 27/09/2026) ───────
// Escopo fechado com o Joaquim: só despesa (a entrada de dinheiro já é
// tratada em Financeiro/fin_contas_receber, não duplica aqui), sem abrir/
// fechar caixa (lançamento solto) e sem aprovação da secretaria — o
// professor lança direto. Mesmo padrão de posse das outras ações: confere
// o professor autenticado com requireProfessor() e grava com o client
// admin, sem depender só da RLS de nucleo_despesas (migration 115).
export async function professorLancarDespesaAction(formData: FormData) {
  const { professor, userId, admin } = await requireProfessor();

  const descricao = (formData.get("descricao") as string)?.trim();
  const valorStr = (formData.get("valor") as string)?.trim();
  const data_despesa = (formData.get("data_despesa") as string) || new Date().toISOString().slice(0, 10);
  const categoria_id = (formData.get("categoria_id") as string) || null;
  const forma_pagamento = (formData.get("forma_pagamento") as string) || null;

  if (!descricao || !valorStr) {
    erro("Preencha a descrição e o valor da despesa.", "/professor/caixa");
  }

  const valorNumero = Number(valorStr.replace(",", "."));
  if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
    erro("Valor inválido — digite um número maior que zero.", "/professor/caixa");
  }
  const valor_centavos = Math.round(valorNumero * 100);

  // Professor pode não ter church_id preenchido (ficha antiga) — despesa
  // ainda é salva, só sem o vínculo de igreja (staff não vê ela no filtro
  // por unidade nesse caso, mas o professor continua vendo a própria).
  const { error } = await admin.from("nucleo_despesas").insert({
    professor_id: professor.id,
    church_id: professor.church_id,
    categoria_id,
    descricao,
    valor_centavos,
    data_despesa,
    forma_pagamento,
    created_by: userId,
  });

  if (error) {
    console.error("[professor/actions] lançar despesa do núcleo", error);
    erro("Erro ao lançar a despesa. Tente novamente.", "/professor/caixa");
  }

  revalidatePath("/professor/caixa");
  redirect("/professor/caixa?msg=" + encodeURIComponent("Despesa lançada com sucesso."));
}

// ── AÇÃO 6: EXCLUIR DESPESA DO NÚCLEO ───────────────────────────
export async function professorExcluirDespesaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = formData.get("id") as string;
  if (!id) erro("Despesa não informada.", "/professor/caixa");

  const { data: despesa } = await admin.from("nucleo_despesas").select("id, professor_id").eq("id", id).maybeSingle();
  if (!despesa || despesa.professor_id !== professor.id) {
    erro("Essa despesa não pertence a você.", "/professor/caixa");
  }

  await admin.from("nucleo_despesas").delete().eq("id", id);

  revalidatePath("/professor/caixa");
  redirect("/professor/caixa?msg=" + encodeURIComponent("Despesa excluída."));
}

// ============================================================
// AÇÕES 7-11: EDIÇÃO COMPLETA DO ALUNO — 28/09/2026, pedido do Joaquim
// ("preciso editar aluno, para corrigir dados caso cadastre informação
// errada pessoal, curso e financeiro, igreja setor, ou seja edição
// completa"), a partir de /professor/alunos. Reaproveita a MESMA tela
// que a secretaria usa (EditarMatriculaForm.tsx, ver
// admin/matriculas/[id]/EditarMatriculaForm.tsx), agora parametrizada
// pra aceitar estas 5 ações escopadas ao professor em vez das staff-only
// (atualizarMatriculaAction, baixarParcelaAction, cancelarParcelaAction,
// lancarPagamentoRetroativoAction, cancelarMatriculaAction). Toda ação
// confere a posse (ead_matriculas.professor_id === professor.id) antes
// de tocar em qualquer dado — mesmo padrão de requireProfessor()/
// professorBaixarParcelaAction acima. Curso em si continua não-editável
// aqui (mesma trava que já existe pro admin) — só Turma dentro do
// mesmo curso; Professor(a) fica travado no próprio professor (ver
// EditarMatriculaForm: travarProfessorId).
// ============================================================

function erroEdicaoAluno(matriculaId: string, msg: string): never {
  redirect(`/professor/alunos/editar/${matriculaId}?error=` + encodeURIComponent(msg));
}

async function assertMatriculaDoProfessor(admin: ReturnType<typeof createAdminClient>, matriculaId: string, professorId: string) {
  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, professor_id, course_id, curso_nome_snapshot")
    .eq("id", matriculaId)
    .maybeSingle();
  if (!matricula || matricula.professor_id !== professorId) {
    erro("Esse aluno não pertence a você.", "/professor/alunos");
  }
  return matricula!;
}

// ── AÇÃO 7: SALVAR FICHA (pessoal + curso/turma/campo/setor/igreja) ──
export async function professorAtualizarMatriculaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  const alunoId = (formData.get("aluno_id") as string) || "";
  if (!matriculaId || !alunoId) erro("Matrícula inválida.", "/professor/alunos");
  const matricula = await assertMatriculaDoProfessor(admin, matriculaId, professor.id);
  if (matricula.aluno_id !== alunoId) erroEdicaoAluno(matriculaId, "Matrícula inválida.");

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const cpf = (formData.get("cpf") as string)?.trim() || "";
  if (cpf && !validarCPF(cpf)) {
    erroEdicaoAluno(matriculaId, "CPF inválido — confira os dígitos digitados.");
  }
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id_aluno = (formData.get("church_id_aluno") as string) || null;
  const course_edition_id = (formData.get("course_edition_id") as string) || null;
  // Professor(a) nunca vem de um <select> nesta tela (campo travado em si
  // mesmo, ver EditarMatriculaForm: travarProfessorId) — ignora qualquer
  // valor que chegue aqui e mantém sempre o próprio professor.
  const professor_id = professor.id;

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

  if (!nome_completo || !email || !cpf) {
    erroEdicaoAluno(matriculaId, "Nome completo, CPF e e-mail são obrigatórios.");
  }

  // Turma só pode ser trocada por outra turma que este professor também
  // leciona (mesma trava de professorCriarMatriculaAction acima) — evita
  // um course_edition_id arbitrário vindo de um form manipulado no client.
  if (course_edition_id) {
    const { data: vinculo } = await admin
      .from("professor_turmas")
      .select("course_edition_id")
      .eq("professor_id", professor.id)
      .eq("course_edition_id", course_edition_id)
      .maybeSingle();
    if (!vinculo) erroEdicaoAluno(matriculaId, "Você só pode mover o aluno pra uma turma que já leciona.");
  }

  let campo_ministerio_nome: string | null = null;
  if (campo_ministerio_id) {
    const { data: campoRow } = await admin
      .from("ead_campos_ministerios")
      .select("nome")
      .eq("id", campo_ministerio_id)
      .maybeSingle();
    campo_ministerio_nome = campoRow?.nome ?? null;
  }

  await upsertProfissaoLivre(admin, profissao);

  const { error: alunoError } = await admin
    .from("ead_alunos")
    .update({
      nome_completo, email, telefone, cpf,
      campo_ministerio_id, campo_ministerio_nome,
      sector_id, church_id: church_id_aluno,
      rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao,
      naturalidade_cidade, naturalidade_estado, nome_conjuge, nome_mae, nome_pai,
      cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado, nacionalidade,
      foto_url,
    })
    .eq("id", alunoId);

  if (alunoError) erroEdicaoAluno(matriculaId, "Erro ao salvar dados pessoais: " + alunoError.message);

  const { error: matriculaError } = await admin
    .from("ead_matriculas")
    .update({ course_edition_id, professor_id })
    .eq("id", matriculaId);

  if (matriculaError) erroEdicaoAluno(matriculaId, "Erro ao salvar curso/vínculo: " + matriculaError.message);

  revalidatePath(`/professor/alunos/editar/${matriculaId}`);
  revalidatePath("/professor/alunos");
  redirect(`/professor/alunos/editar/${matriculaId}?msg=` + encodeURIComponent("Dados atualizados."));
}

// ── AÇÃO 8: CANCELAR PARCELA (só o professor dono do aluno) ─────
export async function professorCancelarParcelaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = (formData.get("id") as string) || "";
  const redirectTo = (formData.get("redirect_to") as string) || "/professor/alunos";
  if (!id) erro("Parcela inválida.", redirectTo);

  const { data: conta } = await admin
    .from("fin_contas_receber")
    .select("id, origem_id, origem_tipo")
    .eq("id", id)
    .maybeSingle();
  if (!conta || conta.origem_tipo !== "MATRICULA_DIRETA") erro("Parcela fora do escopo do professor.", redirectTo);

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, professor_id")
    .eq("id", conta!.origem_id)
    .maybeSingle();
  if (!matricula || matricula.professor_id !== professor.id) {
    erro("Essa parcela não pertence a um aluno seu.", redirectTo);
  }

  const { error } = await admin
    .from("fin_contas_receber")
    .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[professor/actions] cancelar parcela", error);
    erro("Erro ao cancelar. Tente novamente.", redirectTo);
  }

  revalidatePath("/professor/alunos");
  revalidatePath("/professor/financeiro");
  redirect(redirectTo + "?msg=" + encodeURIComponent("Parcela cancelada."));
}

// ── AÇÃO 8b: REATIVAR PARCELA CANCELADA (desfazer cancelamento) ──
// 28/09/2026, achado do Joaquim: cancelou uma parcela sem querer e não
// tinha jeito de desfazer. Volta pra PENDENTE — nunca marca como paga
// sozinha, mesma régua da versão admin (reativarParcelaAction,
// admin/financeiro/actions.ts).
export async function professorReativarParcelaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const id = (formData.get("id") as string) || "";
  const redirectTo = (formData.get("redirect_to") as string) || "/professor/alunos";
  if (!id) erro("Parcela inválida.", redirectTo);

  const { data: conta } = await admin
    .from("fin_contas_receber")
    .select("id, origem_id, origem_tipo, status")
    .eq("id", id)
    .maybeSingle();
  if (!conta || conta.origem_tipo !== "MATRICULA_DIRETA") erro("Parcela fora do escopo do professor.", redirectTo);
  if (conta!.status !== "CANCELADO") erro("Essa parcela não está cancelada.", redirectTo);

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, professor_id")
    .eq("id", conta!.origem_id)
    .maybeSingle();
  if (!matricula || matricula.professor_id !== professor.id) {
    erro("Essa parcela não pertence a um aluno seu.", redirectTo);
  }

  const { error } = await admin
    .from("fin_contas_receber")
    .update({ status: "PENDENTE", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[professor/actions] reativar parcela", error);
    erro("Erro ao reativar. Tente novamente.", redirectTo);
  }

  revalidatePath("/professor/alunos");
  revalidatePath("/professor/financeiro");
  redirect(redirectTo + "?msg=" + encodeURIComponent("Parcela reativada — voltou para pendente."));
}

// ── AÇÃO 9: LANÇAR PAGAMENTO RETROATIVO (regularização) ──────────
export async function professorLancarPagamentoRetroativoAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  const alunoId = (formData.get("aluno_id") as string) || "";
  if (!matriculaId || !alunoId) erro("Matrícula inválida.", "/professor/alunos");
  const matricula = await assertMatriculaDoProfessor(admin, matriculaId, professor.id);
  if (matricula.aluno_id !== alunoId) erroEdicaoAluno(matriculaId, "Matrícula inválida.");

  const valorTotalCentavos = centavosValor((formData.get("valor_total") as string) || "");
  const totalParcelas = Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || 1));
  const dataPagamento = (formData.get("data_pagamento") as string) || "";
  const formaPagamento = (formData.get("forma_pagamento_prevista") as string) || "PIX";
  const responsavel = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const churchId = (formData.get("church_id") as string) || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  // Dinheiro fica de fora aqui também (mesma régua de professorBaixarParcelaAction
  // — exige Caixa Diário, controle de secretaria).
  if (formaPagamento === "DINHEIRO") {
    erroEdicaoAluno(matriculaId, "Pagamento em dinheiro só pode ser lançado pela secretaria (Caixa Diário).");
  }
  if (valorTotalCentavos <= 0) erroEdicaoAluno(matriculaId, "Informe o valor pago.");
  if (!dataPagamento) erroEdicaoAluno(matriculaId, "Informe a data original do pagamento.");

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

  if (error) erroEdicaoAluno(matriculaId, "Erro ao lançar pagamento: " + error.message);

  revalidatePath(`/professor/alunos/editar/${matriculaId}`);
  revalidatePath("/professor/financeiro");
  redirect(`/professor/alunos/editar/${matriculaId}?msg=` + encodeURIComponent("Pagamento retroativo lançado."));
}

// ── AÇÃO 10: GERAR PARCELAS DE MENSALIDADE FALTANTES ─────────────
export async function professorGerarParcelasMensalidadeAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  const alunoId = (formData.get("aluno_id") as string) || "";
  if (!matriculaId || !alunoId) erro("Matrícula inválida.", "/professor/alunos");
  const matricula = await assertMatriculaDoProfessor(admin, matriculaId, professor.id);
  if (matricula.aluno_id !== alunoId) erroEdicaoAluno(matriculaId, "Matrícula inválida.");

  const { count: jaTemMensalidade } = await admin
    .from("fin_contas_receber")
    .select("id", { count: "exact", head: true })
    .eq("origem_id", matriculaId)
    .ilike("descricao", "Mensalidade —%");
  if (jaTemMensalidade && jaTemMensalidade > 0) {
    erroEdicaoAluno(matriculaId, "Esta matrícula já tem mensalidade lançada.");
  }

  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_parcela_centavos, numero_parcelas")
    .eq("course_id", matricula.course_id)
    .maybeSingle();

  if (!preco || preco.valor_parcela_centavos <= 0) {
    erroEdicaoAluno(matriculaId, "Este curso não tem valor de mensalidade cadastrado. Fale com a secretaria.");
  }

  const primeiroVencimento = (formData.get("data_vencimento") as string) || new Date().toISOString().slice(0, 10);

  const { error } = await gerarParcelasContasReceber(admin, {
    origemTipo: "MATRICULA_DIRETA",
    origemId: matriculaId,
    alunoId,
    responsavelPagamento: "ALUNO",
    descricaoBase: `Mensalidade — ${matricula.curso_nome_snapshot}`,
    valorTotalCentavos: preco!.valor_parcela_centavos * preco!.numero_parcelas,
    totalParcelas: preco!.numero_parcelas,
    primeiroVencimento,
    formaPagamentoPrevista: "PIX",
  });

  if (error) erroEdicaoAluno(matriculaId, "Erro ao gerar as parcelas: " + error.message);

  revalidatePath(`/professor/alunos/editar/${matriculaId}`);
  revalidatePath("/professor/financeiro");
  redirect(`/professor/alunos/editar/${matriculaId}?msg=` + encodeURIComponent("Parcelas de mensalidade geradas."));
}

// ── AÇÃO 11: CANCELAR MATRÍCULA (nunca apaga, só muda status) ────
export async function professorCancelarMatriculaAction(formData: FormData) {
  const { professor, admin } = await requireProfessor();

  const matriculaId = (formData.get("matricula_id") as string) || "";
  if (!matriculaId) erro("Matrícula inválida.", "/professor/alunos");
  await assertMatriculaDoProfessor(admin, matriculaId, professor.id);

  const { error } = await admin
    .from("ead_matriculas")
    .update({ status: "CANCELADO" })
    .eq("id", matriculaId);

  if (error) erroEdicaoAluno(matriculaId, "Erro ao cancelar: " + error.message);

  revalidatePath("/professor/alunos");
  redirect("/professor/alunos?msg=" + encodeURIComponent("Matrícula cancelada."));
}
