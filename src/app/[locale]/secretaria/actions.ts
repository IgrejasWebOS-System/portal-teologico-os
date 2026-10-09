"use server";

// ============================================================
// Ações da Área da Secretaria (04/10/2026, Etapa 3 — "Nova Matrícula").
// Espelha professorCriarMatriculaAction (src/app/[locale]/professor/
// actions.ts) quase inteira — mesma ficha, mesmo plano de parcelas,
// mesmo PDF — com duas diferenças de fundo:
//
// 1. Quem chama não é um professor com professor.id fixo: o secretário
//    escolhe a TURMA (que pode ser de qualquer professor dentro do seu
//    escopo), e o professor_id da matrícula vem do vínculo
//    professor_turmas daquela turma, não da sessão.
// 2. Validação de escopo explícita: a turma escolhida só é aceita se o
//    professor dono dela estiver dentro de get_accessible_unit_ids() do
//    secretário — mesmo padrão de defesa em profundidade já usado em
//    addProfessorAction (dashboard/configuracoes/actions.ts) e exigido
//    pelo comentário da migration 111 (RLS sozinha não basta pra
//    Server Actions com service_role).
// ============================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsSecretario } from "@/utils/secretaria";
import { traduzirErro } from "@/utils/mensagens-erro";
import { MSG_AUTOATENDIMENTO, cpfEhOProprio } from "@/utils/autoatendimento";
import { registrarAuditoria } from "@/utils/auditoria";
import { dataFimPadrao } from "@/utils/turmas/periodo";
import { validarCPF, cpfVariantes } from "@/utils/cpf";
import { upsertProfissaoLivre } from "@/utils/profissoes";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { gerarPdfMatricula } from "@/utils/pdf/matricula";
import {
  lancarDespesaNucleo,
  criarContaPagarNucleo,
  baixarContaPagarNucleo,
  cancelarContaPagarNucleo,
  valorParaCentavos,
} from "@/utils/financeiro/despesa-nucleo";

function centavosValor(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

async function requireSecretario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  return { userId: user.id, secretario, supabase, admin: createAdminClient() };
}

function erro(msg: string, path: string = "/secretaria/matricula"): never {
  redirect(path + "?error=" + encodeURIComponent(msg));
}

export async function secretariaCriarMatriculaAction(formData: FormData) {
  const { userId, supabase, admin } = await requireSecretario();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim();
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
  const foto_url = (formData.get("foto_url") as string)?.trim() || null;
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id = (formData.get("church_id") as string) || null;
  const dataMatriculaInformada = (formData.get("data_matricula_informada") as string) || null;
  const dataVencimentoInformada = (formData.get("data_vencimento") as string) || null;

  const voltarEmErro = "/secretaria/matricula";

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

  const faltando = camposObrigatorios.filter(([, valor]) => !valor).map(([label]) => label);
  if (faltando.length > 0) {
    erro(`Preencha os campos obrigatórios que faltam: ${faltando.join(", ")}.`, voltarEmErro);
  }

  if (!validarCPF(cpf)) {
    erro("CPF inválido — confira os dígitos digitados.", voltarEmErro);
  }

  // Segregação de funções (09/10/2026): secretário(a) não matricula a si
  // mesmo(a) como aluno(a) (nem usando o CPF do próprio cadastro de
  // professor(a), no caso de quem acumula os papéis).
  if (await cpfEhOProprio(admin, { userId }, cpf)) {
    await registrarAuditoria(admin, {
      ator: { userId }, papel: "SECRETARIA", acao: "AUTOATENDIMENTO_BLOQUEADO",
      entidade: "ead_matriculas", detalhe: { tentou: "CRIAR_MATRICULA" },
    });
    erro(MSG_AUTOATENDIMENTO, voltarEmErro);
  }

  if (dataMatriculaInformada && dataMatriculaInformada > new Date().toISOString().slice(0, 10)) {
    erro("A data informada não pode ser no futuro.", voltarEmErro);
  }

  // Unidades acessíveis ao secretário (escopo real) — a turma escolhida
  // só é aceita se o professor dono dela estiver dentro desta lista.
  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select(
      "professor_id, course_edition_id, course_editions(nome, classe, course_id, courses(id, title)), professores(id, nome_completo, unit_id)"
    )
    .eq("course_edition_id", course_edition_id)
    .maybeSingle();

  if (!vinculo) {
    erro("Turma não encontrada.", voltarEmErro);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const professorDaTurma = (Array.isArray((vinculo as any).professores) ? (vinculo as any).professores[0] : (vinculo as any).professores) as { id: string; nome_completo: string; unit_id: string | null } | null;

  if (!professorDaTurma || !professorDaTurma.unit_id || !unitIdsEscopo.has(professorDaTurma.unit_id)) {
    erro("Esta turma não está dentro do seu escopo de acesso.", voltarEmErro);
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

  const { data: alunoExistente } = await admin
    .from("ead_alunos")
    .select("id, user_id")
    .in("cpf", cpfVariantes(cpf))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
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
      console.error("[secretaria/actions] criar aluno", erroAluno);
      erro("Erro ao cadastrar aluno — verifique se o CPF já não está em uso.", voltarEmErro);
    }
    aluno = novoAluno;
  }

  if (!aluno!.user_id) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: nome_completo },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
    });

    if (inviteError) {
      console.error("[secretaria/actions] convite aluno", inviteError);
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
      professor_id: professorDaTurma!.id,
      ...(dataMatriculaInformada ? { data_matricula: dataMatriculaInformada } : {}),
    })
    .select("id")
    .single();

  if (erroMatricula || !matricula) {
    console.error("[secretaria/actions] criar matrícula", erroMatricula);
    erro("Erro ao criar matrícula.", voltarEmErro);
  }

  if (aluno!.user_id) {
    await admin
      .from("enrollments")
      .upsert(
        { user_id: aluno!.user_id, course_id, status: "ENROLLED" },
        { onConflict: "user_id,course_id", ignoreDuplicates: true }
      );
  }

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
        console.error("[secretaria/actions] erro ao buscar foto pro PDF:", err);
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
        professorNome: professorDaTurma!.nome_completo,
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
      null,
      { ip, userAgent, assinadoEm: new Date() },
      fotoParaPdf
    );

    const pdfFileName = `matricula-${aluno!.id}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[secretaria/actions] upload do PDF falhou:", pdfUploadError.message);
    } else {
      await admin.from("ead_alunos").update({ pdf_matricula_path: pdfFileName }).eq("id", aluno!.id);
    }
  } catch (err) {
    console.error("[secretaria/actions] erro inesperado ao gerar PDF da matrícula:", err);
  }

  revalidatePath("/secretaria");
  revalidatePath("/secretaria/alunos");
  revalidatePath("/secretaria/financeiro");
  revalidatePath("/admin/matriculas");

  await registrarAuditoria(admin, {
    ator: { userId }, papel: "SECRETARIA", acao: "CRIAR_MATRICULA",
    entidade: "ead_alunos", entidadeId: aluno!.id, alunoId: aluno!.id,
  });

  redirect(
    "/secretaria/alunos?msg=" +
      encodeURIComponent(`${nome_completo} matriculado(a) com sucesso. Um e-mail de acesso foi enviado.`) +
      "&novoAlunoId=" + encodeURIComponent(aluno!.id) +
      "&novoAlunoNome=" + encodeURIComponent(nome_completo)
  );
}

// ── AÇÕES: ALUNOS (reenviar link de acesso) ─────────────────────
// 04/10/2026, Etapa 5. Espelha professorReenviarLinkAlunoAction
// (professor/actions.ts) — mesmo reenvio de convite via
// admin.auth.admin.inviteUserByEmail. Diferença: o professor valida
// posse checando professor_id na matrícula; o secretário não tem um
// professor_id fixo, então valida escopo pelo church_id do aluno
// contra get_accessible_unit_ids() (mesmo padrão já usado em
// secretariaLancarDespesaAction).
export async function secretariaReenviarLinkAlunoAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();

  const alunoId = formData.get("aluno_id") as string;
  if (!alunoId) erro("Aluno não informado.", "/secretaria/alunos");

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, email, nome_completo, church_id, user_id")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) erro("Aluno não encontrado.", "/secretaria/alunos");

  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  const { data: igreja } = await admin
    .from("churches")
    .select("unit_id")
    .eq("id", aluno!.church_id)
    .maybeSingle();
  if (!igreja?.unit_id || !unitIdsEscopo.has(igreja.unit_id)) {
    erro("Esse aluno não está dentro do seu escopo de acesso.", "/secretaria/alunos");
  }

  if (!aluno!.email) erro("Este aluno não tem e-mail cadastrado.", "/secretaria/alunos");

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(aluno!.email, {
    data: { full_name: aluno!.nome_completo },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  // Vincula o login à ficha (ead_alunos.user_id) — sem isso o aluno entra
  // mas não enxerga a própria matrícula (RLS por user_id).
  let userIdVinculo: string | null = aluno!.user_id ?? invited?.user?.id ?? null;
  if (!userIdVinculo && inviteError) {
    const { data: profileExistente } = await admin
      .from("profiles")
      .select("id")
      .eq("email", aluno!.email)
      .maybeSingle();
    userIdVinculo = profileExistente?.id ?? null;
  }

  if (!userIdVinculo) {
    console.error("[secretaria/actions] secretariaReenviarLinkAlunoAction", inviteError);
    erro(
      `Não foi possível enviar o link para ${aluno!.email}: ` +
        (inviteError ? traduzirErro(inviteError.message) : "não foi possível identificar o login deste aluno."),
      "/secretaria/alunos"
    );
  }

  await admin
    .from("ead_alunos")
    .update({
      user_id: userIdVinculo,
      convite_status: "ENVIADO",
      convite_enviado_em: new Date().toISOString(),
      convite_erro: null,
    })
    .eq("id", alunoId);

  revalidatePath("/secretaria/alunos");
  redirect(
    "/secretaria/alunos?msg=" +
      encodeURIComponent(`Link de acesso enviado para ${aluno!.nome_completo} no e-mail ${aluno!.email}.`)
  );
}

// ── AÇÕES: CONFIGURAÇÕES (ficha do próprio secretário) ──────────
// 04/10/2026, Etapa 7. O secretário não tem linha em `professores`
// (não é professor) nem em `ead_alunos` — a identidade dele é
// `profiles` + `admin_roles` (nível 1-3). "Editar a ficha" aqui, por
// enquanto, é só o nome completo (profiles.full_name); troca de senha
// usa o mesmo TrocarSenhaCard genérico já usado em /professor/
// configuracoes (client-side, supabase.auth.updateUser, sem Server
// Action nenhuma — por isso não tem uma ação equivalente aqui).
export async function secretariaAtualizarPerfilAction(formData: FormData) {
  const { userId, supabase } = await requireSecretario();

  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) erro("Informe o nome completo.", "/secretaria/configuracoes");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
  if (error) {
    console.error("[secretaria/actions] secretariaAtualizarPerfilAction", error);
    erro("Erro ao salvar. Tente novamente.", "/secretaria/configuracoes");
  }

  revalidatePath("/secretaria/configuracoes");
  redirect("/secretaria/configuracoes?msg=" + encodeURIComponent("Dados atualizados."));
}

// ── AÇÕES: TURMAS (criar turma e gerar link) ────────────────────
// 04/10/2026, Etapa 7. Espelha professorCriarTurmaAction
// (professor/actions.ts) — mesmo course_editions + professor_turmas
// (link_token automático via default da coluna, migration 103).
// Diferença: o professor sempre cria pra si mesmo (professor.id fixo
// na sessão); o secretário escolhe QUAL professor do seu escopo vai
// ficar dono da turma nova, então precisa de um professor_id explícito
// no form, validado contra get_accessible_unit_ids() antes de criar o
// vínculo — mesmo padrão de secretariaCriarMatriculaAction.
export async function secretariaCriarTurmaAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();

  const professor_id = (formData.get("professor_id") as string) || "";
  const course_id = formData.get("course_id") as string;
  const unit_id = (formData.get("unit_id") as string) || null;
  const nome = (formData.get("nome") as string)?.trim();
  const turno = formData.get("turno") as string;
  const dia_semana = formData.get("dia_semana") as string;
  const classe = (formData.get("classe") as string)?.trim().toUpperCase() || null;
  const data_inicio = (formData.get("data_inicio") as string) || null;
  // Cursos de 12 meses: sem data final informada, usa início + 12 meses.
  const data_fim = (formData.get("data_fim") as string) || (data_inicio ? dataFimPadrao(data_inicio) || null : null);

  const voltar = "/secretaria/turmas";

  if (!professor_id || !course_id || !nome || !unit_id || !turno || !dia_semana) {
    erro("Preencha professor, núcleo, curso, nome da turma, turno e dia da semana.", voltar);
  }

  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  const { data: professor } = await admin.from("professores").select("id, unit_id").eq("id", professor_id).maybeSingle();
  if (!professor?.unit_id || !unitIdsEscopo.has(professor.unit_id)) {
    erro("Esse professor não está dentro do seu escopo de acesso.", voltar);
  }
  if (!unitIdsEscopo.has(unit_id!)) {
    erro("Esse núcleo não está dentro do seu escopo de acesso.", voltar);
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
    console.error("[secretaria/actions] criar turma", erroTurma);
    erro("Erro ao criar a turma. Tente novamente.", voltar);
  }

  const { error: erroVinculo } = await admin.from("professor_turmas").insert({
    professor_id,
    course_edition_id: turma!.id,
    turno,
    dia_semana,
  });

  if (erroVinculo) {
    console.error("[secretaria/actions] vincular professor_turmas", erroVinculo);
    erro("Turma criada, mas houve erro ao gerar o link de matrícula.", voltar);
  }

  revalidatePath("/secretaria");
  revalidatePath("/secretaria/turmas");
  redirect(voltar + "?msg=" + encodeURIComponent(`Turma "${nome}" criada. O link de matrícula já está na lista.`));
}

// ── AÇÕES: PROFESSORES (reenviar link de acesso/definir senha) ──
// 04/10/2026, Etapa 6. O professor ganha acesso (nível 4, "Responsável
// de núcleo de ensino") via grantNucleoAccess (dashboard/configuracoes/
// actions.ts), que já dispara um inviteUserByEmail na hora do
// cadastro — mas não existia um botão pra REENVIAR esse e-mail se o
// professor perdeu o link ou o convite falhou (convite_erro). Mesma
// mecânica do reenvio de aluno (admin.auth.admin.inviteUserByEmail,
// redirectTo /definir-senha), só muda a tabela (professores em vez de
// ead_alunos) e a checagem de escopo, que aqui usa professores.unit_id
// diretamente (já vem na linha, sem precisar de join com churches).
export async function secretariaReenviarLinkProfessorAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();

  const professorId = formData.get("professor_id") as string;
  if (!professorId) erro("Professor não informado.", "/secretaria/professores");

  const { data: professor } = await admin
    .from("professores")
    .select("id, email, nome_completo, unit_id")
    .eq("id", professorId)
    .maybeSingle();

  if (!professor) erro("Professor não encontrado.", "/secretaria/professores");

  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  if (!professor!.unit_id || !unitIdsEscopo.has(professor!.unit_id)) {
    erro("Esse professor não está dentro do seu escopo de acesso.", "/secretaria/professores");
  }

  if (!professor!.email) erro("Este professor não tem e-mail de acesso cadastrado.", "/secretaria/professores");

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(professor!.email, {
    data: { full_name: professor!.nome_completo },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  // IMPORTANTE: é professores.user_id que faz o sistema reconhecer a pessoa
  // como professor (checkIsProfessor) e mandá-la pra /professor em vez do
  // /portal do aluno. Mesmo vínculo que o cadastro público de professor faz
  // (cadastro-professor/actions.ts).
  let userIdVinculo: string | null = invited?.user?.id ?? null;

  if (!userIdVinculo && inviteError) {
    // E-mail já tem conta (ex.: convite anterior já aceito) — reaproveita o
    // login existente em vez de falhar.
    const { data: profileExistente } = await admin
      .from("profiles")
      .select("id")
      .eq("email", professor!.email)
      .maybeSingle();
    userIdVinculo = profileExistente?.id ?? null;
  }

  if (!userIdVinculo) {
    const mensagemErro = inviteError
      ? traduzirErro(inviteError.message)
      : "não foi possível identificar o login deste professor.";
    console.error("[secretaria/actions] secretariaReenviarLinkProfessorAction", inviteError);
    await admin
      .from("professores")
      .update({ convite_status: "FALHOU", convite_erro: mensagemErro })
      .eq("id", professorId);
    erro(`Não foi possível enviar o link para ${professor!.email}: ` + mensagemErro, "/secretaria/professores");
  }

  await admin
    .from("professores")
    .update({
      user_id: userIdVinculo,
      convite_status: "ENVIADO",
      convite_enviado_em: new Date().toISOString(),
      convite_erro: null,
    })
    .eq("id", professorId);

  revalidatePath("/secretaria/professores");
  redirect(
    "/secretaria/professores?msg=" +
      encodeURIComponent(`Link de acesso enviado para ${professor!.nome_completo} no e-mail ${professor!.email}.`)
  );
}

// ── AÇÕES: CAIXA (despesas de núcleo) ───────────────────────────
// 04/10/2026, Etapa 4. Espelham professorLancarDespesaAction/
// professorExcluirDespesaAction (professor/actions.ts) — mesma tabela
// (nucleo_despesas), mesmo Plano de Contas (fin_categorias). Diferença:
// o professor sempre lança pro próprio núcleo (professor.church_id,
// fixo na sessão); o secretário escolhe EM QUAL núcleo do seu escopo a
// despesa aconteceu, então precisa de um church_id explícito no form,
// validado contra get_accessible_unit_ids() antes de resolver o
// professor responsável daquele núcleo.
//
// nucleo_despesas não tem policy de escrita pra staff (só
// nucleo_despesas_professor_all, restrita ao próprio professor, e
// nucleo_despesas_staff_select, só leitura) — por isso usa o client
// admin (service_role) com a checagem de escopo feita na mão aqui,
// mesmo padrão de assertAlunoNoEscopo em admin/matriculas/actions.ts.
function erroCaixa(msg: string): never {
  redirect("/secretaria/caixa?error=" + encodeURIComponent(msg));
}

export async function secretariaLancarDespesaAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();

  const church_id = (formData.get("church_id") as string) || "";
  const descricao = (formData.get("descricao") as string)?.trim();
  const valorStr = (formData.get("valor") as string)?.trim();
  const data_despesa = (formData.get("data_despesa") as string) || new Date().toISOString().slice(0, 10);
  const categoria_id = (formData.get("categoria_id") as string) || null;
  const forma_pagamento = (formData.get("forma_pagamento") as string) || null;

  if (!church_id) erroCaixa("Selecione o núcleo da despesa.");
  if (!descricao || !valorStr) erroCaixa("Preencha a descrição e o valor da despesa.");

  const valorNumero = Number(valorStr.replace(",", "."));
  if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
    erroCaixa("Valor inválido — digite um número maior que zero.");
  }
  const valor_centavos = Math.round(valorNumero * 100);

  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  const { data: igreja } = await admin.from("churches").select("id, unit_id").eq("id", church_id).maybeSingle();
  if (!igreja?.unit_id || !unitIdsEscopo.has(igreja.unit_id)) {
    erroCaixa("Esse núcleo não está dentro do seu escopo de acesso.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Migration 129: despesa do núcleo em fin_contas_pagar. O secretário não
  // precisa mais de um professor "dono" — professor_id fica nulo e o
  // vínculo é o núcleo (church_id).
  const { error } = await lancarDespesaNucleo(admin, {
    churchId: church_id,
    professorId: null,
    categoriaId: categoria_id,
    descricao,
    valorCentavos: valor_centavos,
    dataDespesa: data_despesa,
    forma: forma_pagamento,
    userId: user!.id,
  });

  if (error) {
    console.error("[secretaria/actions] lançar despesa do núcleo", error);
    erroCaixa("Erro ao lançar a despesa. Tente novamente.");
  }

  revalidatePath("/secretaria/caixa");
  redirect("/secretaria/caixa?msg=" + encodeURIComponent("Despesa lançada com sucesso."));
}

export async function secretariaExcluirDespesaAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();

  const id = formData.get("id") as string;
  if (!id) erroCaixa("Despesa não informada.");

  const { data: despesa } = await admin
    .from("fin_contas_pagar")
    .select("id, church_id, fin_lancamento_id")
    .eq("id", id)
    .maybeSingle();
  if (!despesa || !despesa.church_id) erroCaixa("Despesa não encontrada.");
  if (despesa!.fin_lancamento_id) {
    erroCaixa("Essa despesa já foi lançada no Caixa Diário — não pode ser excluída por aqui.");
  }

  const { data: unidadesAcessiveis } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  const unitIdsEscopo = new Set((unidadesAcessiveis ?? []).map((u: { unit_id: string }) => u.unit_id));

  const { data: igreja } = await admin.from("churches").select("unit_id").eq("id", despesa!.church_id).maybeSingle();
  if (!igreja?.unit_id || !unitIdsEscopo.has(igreja.unit_id)) {
    erroCaixa("Essa despesa não está dentro do seu escopo de acesso.");
  }

  // Cancela em vez de apagar: o histórico da conta paga fica (aba
  // "Canceladas" em Financeiro > Contas a Pagar), só sai do Caixa.
  await cancelarContaPagarNucleo(admin, id);

  revalidatePath("/secretaria/caixa");
  revalidatePath("/secretaria/financeiro");
  redirect("/secretaria/caixa?msg=" + encodeURIComponent("Despesa cancelada — o histórico foi mantido."));
}

// ── AÇÕES: CONTAS A PAGAR DO NÚCLEO (migration 129, 04/10/2026) ──
// Mesma tabela do /admin/financeiro (fin_contas_pagar), escopada por
// núcleo (church_id). Cada ação confere o escopo CETADP do secretário na
// mão (client admin, mesmo padrão do Caixa acima).
function erroPagar(msg: string): never {
  redirect("/secretaria/financeiro?aba=pagar&error=" + encodeURIComponent(msg));
}

async function churchIdsDoEscopo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc("get_accessible_unit_ids_dominio", { p_dominio: "CETADP" });
  return new Set((data ?? []).map((u: { unit_id: string }) => u.unit_id));
}

async function assertContaPagarNoEscopo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  id: string
) {
  const { data: conta } = await admin
    .from("fin_contas_pagar")
    .select("id, church_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!conta || !conta.church_id) erroPagar("Conta não encontrada.");

  const unitIds = await churchIdsDoEscopo(supabase);
  const { data: igreja } = await admin.from("churches").select("unit_id").eq("id", conta!.church_id).maybeSingle();
  if (!igreja?.unit_id || !unitIds.has(igreja.unit_id)) {
    erroPagar("Essa conta não está dentro do seu escopo de acesso.");
  }
  return conta!;
}

export async function secretariaCriarContaPagarAction(formData: FormData) {
  const { supabase, admin, userId } = await requireSecretario();

  const church_id = (formData.get("church_id") as string) || "";
  const fornecedor = (formData.get("fornecedor") as string)?.trim();
  const descricao = (formData.get("descricao") as string)?.trim();
  const dataVencimento = (formData.get("data_vencimento") as string) || "";
  const categoria_id = (formData.get("categoria_id") as string) || null;
  const forma = (formData.get("forma_pagamento_prevista") as string) || null;
  const valorCentavos = valorParaCentavos((formData.get("valor") as string) || "");

  if (!church_id) erroPagar("Selecione o núcleo da conta.");
  if (!fornecedor || !descricao || !dataVencimento || valorCentavos <= 0) {
    erroPagar("Preencha fornecedor, descrição, valor e vencimento.");
  }

  const unitIds = await churchIdsDoEscopo(supabase);
  const { data: igreja } = await admin.from("churches").select("unit_id").eq("id", church_id).maybeSingle();
  if (!igreja?.unit_id || !unitIds.has(igreja.unit_id)) {
    erroPagar("Esse núcleo não está dentro do seu escopo de acesso.");
  }

  const { error } = await criarContaPagarNucleo(admin, {
    churchId: church_id,
    professorId: null,
    categoriaId: categoria_id,
    fornecedor: fornecedor!,
    descricao: descricao!,
    valorCentavos,
    dataVencimento,
    formaPrevista: forma,
    userId,
  });
  if (error) {
    console.error("[secretaria/actions] criar conta a pagar", error);
    erroPagar("Erro ao cadastrar a conta. Tente novamente.");
  }

  revalidatePath("/secretaria/financeiro");
  redirect("/secretaria/financeiro?aba=pagar&msg=" + encodeURIComponent("Conta a pagar cadastrada."));
}

export async function secretariaBaixarContaPagarAction(formData: FormData) {
  const { supabase, admin, userId } = await requireSecretario();
  const id = (formData.get("id") as string) || "";
  const forma = (formData.get("forma_pagamento") as string) || null;
  if (!id) erroPagar("Conta não informada.");

  const conta = await assertContaPagarNoEscopo(supabase, admin, id);
  if (conta.status === "PAGO") erroPagar("Essa conta já foi paga.");
  if (conta.status === "CANCELADO") erroPagar("Essa conta está cancelada.");

  const { error } = await baixarContaPagarNucleo(admin, id, forma, userId);
  if (error) {
    console.error("[secretaria/actions] baixar conta a pagar", error);
    erroPagar("Erro ao dar baixa. Tente novamente.");
  }

  revalidatePath("/secretaria/financeiro");
  revalidatePath("/secretaria/caixa");
  redirect("/secretaria/financeiro?aba=pagar&msg=" + encodeURIComponent("Conta paga com sucesso."));
}

export async function secretariaCancelarContaPagarAction(formData: FormData) {
  const { supabase, admin } = await requireSecretario();
  const id = (formData.get("id") as string) || "";
  if (!id) erroPagar("Conta não informada.");

  const conta = await assertContaPagarNoEscopo(supabase, admin, id);
  if (conta.status === "PAGO") erroPagar("Conta já paga não pode ser cancelada.");

  await cancelarContaPagarNucleo(admin, id);

  revalidatePath("/secretaria/financeiro");
  redirect("/secretaria/financeiro?aba=pagar&msg=" + encodeURIComponent("Conta cancelada."));
}
