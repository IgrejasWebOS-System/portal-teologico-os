"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { validarCPF } from "@/utils/cpf";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import { upsertProfissaoLivre } from "@/utils/profissoes";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { gerarPdfMatricula } from "@/utils/pdf/matricula";

// ============================================================
// Ações do gate "/completar-cadastro" (mutirão de cadastro).
// Mesmo padrão de professor/actions.ts: autentica com o client normal,
// resolve a identidade (professor ou aluno) com uma query já filtrada
// por user_id, e só depois grava com o client admin -- nunca confia em
// id vindo do form.
//
// 20/09/2026 — fluxo do professor reescrito (pedido do Joaquim): a ficha
// completa agora é a mesma tela que a secretaria usa em "Novo Professor"
// (ProfessorForm.tsx, modo selfService), então esta action passou a
// espelhar exatamente updateProfessorAction (configuracoes/actions.ts),
// só que gravando com o client admin (professores tem RLS de escrita
// só-staff) e com a identidade resolvida por user_id, nunca por um id
// vindo do form. O vínculo de turma virou uma action própria e repetível
// (vincularTurmaProfessorSelfAction), chamada depois que a ficha já foi
// salva -- ver CompletarCadastroProfessorForm.tsx pro fluxo em 3 passos
// (ficha → pergunta → turma).
// ============================================================

export type SalvarFichaResultado = { success: true; message?: string } | { success: false; message: string };
export type VincularTurmaResultado = { success: true; linkToken: string } | { success: false; message: string };

function extrairFichaProfessor(formData: FormData) {
  return {
    cpf: (formData.get("cpf") as string)?.trim() || null,
    rg: (formData.get("rg") as string)?.trim() || null,
    rg_orgao_emissor: (formData.get("rg_orgao_emissor") as string)?.trim() || null,
    rg_uf: (formData.get("rg_uf") as string)?.trim() || null,
    data_nascimento: (formData.get("data_nascimento") as string) || null,
    genero: (formData.get("genero") as string) || null,
    estado_civil: (formData.get("estado_civil") as string) || null,
    escolaridade: (formData.get("escolaridade") as string) || null,
    profissao: (formData.get("profissao") as string)?.trim() || null,
    naturalidade_cidade: (formData.get("naturalidade_cidade") as string)?.trim() || null,
    naturalidade_estado: (formData.get("naturalidade_estado") as string) || null,
    nacionalidade: (formData.get("nacionalidade") as string)?.trim() || null,
    nome_conjuge: (formData.get("nome_conjuge") as string)?.trim() || null,
    nome_mae: (formData.get("nome_mae") as string)?.trim() || null,
    nome_pai: (formData.get("nome_pai") as string)?.trim() || null,
    cep: (formData.get("cep") as string)?.trim() || null,
    endereco: (formData.get("endereco") as string)?.trim() || null,
    endereco_numero: (formData.get("endereco_numero") as string)?.trim() || null,
    endereco_complemento: (formData.get("endereco_complemento") as string)?.trim() || null,
    bairro: (formData.get("bairro") as string)?.trim() || null,
    cidade: (formData.get("cidade") as string)?.trim() || null,
    estado: (formData.get("estado") as string) || null,
  };
}

// ── Ficha completa do professor (passo 1: ProfessorForm em modo
// selfService) — grava telefone/cargo/igreja + toda a ficha (CPF, RG,
// endereço etc.), sempre no próprio registro do professor logado.
export async function salvarFichaProfessorAction(formData: FormData): Promise<SalvarFichaResultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  const cargo = (formData.get("cargo") as string)?.trim() || null;
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const unitId = (formData.get("unit_id") as string) || null;
  const setorUnitId = (formData.get("setor_unit_id") as string) || null;
  const cpf = (formData.get("cpf") as string)?.trim() || null;

  if (!nomeCompleto) return { success: false, message: "Nome do professor é obrigatório." };
  if (!telefone) return { success: false, message: "Informe seu telefone." };
  if (!cpf || !validarCPF(cpf)) return { success: false, message: "Informe um CPF válido." };
  if (!cargo) return { success: false, message: "Selecione seu cargo." };
  if (!unitId) return { success: false, message: "Selecione a igreja onde você dá aula." };

  const admin = createAdminClient();

  const { data: igrejaUnit } = await admin.from("units").select("type").eq("id", unitId).maybeSingle();
  const igrejaEhSede = igrejaUnit?.type === "SEDE";
  if (!setorUnitId && !igrejaEhSede) {
    return { success: false, message: "Selecione o Setor/Regional onde você dá aula." };
  }

  const { data: church } = await admin.from("churches").select("id").eq("unit_id", unitId).maybeSingle();
  const church_id = church?.id ?? null;
  let sector_id: string | null = null;
  if (setorUnitId) {
    const { data: sector } = await admin.from("sectors").select("id").eq("unit_id", setorUnitId).maybeSingle();
    sector_id = sector?.id ?? null;
  }

  // Casamento "soft" com o cadastro de membros por CPF -- recalculado
  // sempre a partir do CPF que a pessoa acabou de digitar (não confia no
  // que o form manda de member_id, já que a busca por matrícula/nome fica
  // escondida no modo selfService).
  const { data: membro } = await admin.from("members").select("id").eq("cpf", cpf).maybeSingle();
  const memberId = membro?.id ?? null;

  const payload = {
    unit_id: unitId,
    sector_id,
    church_id,
    tipo_professor: memberId ? "MEMBRO" : "EXTERNO",
    member_id: memberId,
    nome_completo: nomeCompleto,
    cargo,
    telefone,
    ...extrairFichaProfessor(formData),
  };

  const { error } = await admin.from("professores").update(payload).eq("id", professor.id);
  if (error) {
    console.error("[completar-cadastro] salvarFichaProfessorAction", error);
    return { success: false, message: "Erro ao salvar seu cadastro. Tente novamente." };
  }

  revalidatePath("/professor");
  return { success: true };
}

// ── Vínculo com turma existente (passo 3, quando a resposta é "Sim") —
// repetível: cada chamada gera um vínculo novo (professor_turmas), com
// link_token próprio (default gen_random_uuid() no banco, migration 108),
// pra listar na tela final. Mesmo motivo de professor_turmas ter RLS
// staff-only: usa o client admin, com a identidade já confirmada acima.
export async function vincularTurmaProfessorSelfAction(formData: FormData): Promise<VincularTurmaResultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const courseEditionId = (formData.get("turma_course_edition_id") as string) || "";
  const turno = (formData.get("turma_turno") as string) || "";
  const diaSemana = (formData.get("turma_dia_semana") as string) || "";

  if (!courseEditionId || !turno || !diaSemana) {
    return { success: false, message: "Selecione a turma, o turno e o dia da semana." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("professor_turmas")
    .insert({
      professor_id: professor.id,
      course_edition_id: courseEditionId,
      turno,
      dia_semana: diaSemana,
    })
    .select("link_token")
    .single();

  if (error || !data) {
    console.error("[completar-cadastro] vincularTurmaProfessorSelfAction", error);
    return { success: false, message: "Erro ao vincular a turma. Tente novamente." };
  }

  revalidatePath("/professor");
  return { success: true, linkToken: data.link_token as string };
}

// ── Ficha completa do aluno (20/09/2026, pedido do Joaquim) — mesmo
// espírito da ficha do professor: no primeiro acesso via link do
// mutirão, o aluno completa a MESMA ficha que a secretaria vê/edita em
// Matrículas > Editar (RG, data de nascimento, endereço etc.), em modo
// selfService (EditarMatriculaForm.tsx). Curso/Turma/Professor/Campo/
// Setor/Igreja NÃO são tocados aqui -- ficam travados, herdados de
// quem já foi resolvido no momento da matrícula pelo link público
// (matricular.ts), só exibidos em modo leitura na tela. Identidade
// sempre pelo user_id da sessão, nunca por um id vindo do form.
export async function salvarFichaAlunoAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: aluno } = await admin.from("ead_alunos").select("id").eq("user_id", user.id).maybeSingle();
  if (!aluno) redirect("/portal");

  const payload = {
    nome_completo: (formData.get("nome_completo") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    telefone: (formData.get("telefone") as string)?.trim() || null,
    rg: (formData.get("rg") as string)?.trim() || null,
    rg_orgao_emissor: (formData.get("rg_orgao_emissor") as string)?.trim() || null,
    rg_uf: (formData.get("rg_uf") as string)?.trim() || null,
    data_nascimento: (formData.get("data_nascimento") as string) || null,
    genero: (formData.get("genero") as string) || null,
    estado_civil: (formData.get("estado_civil") as string) || null,
    escolaridade: (formData.get("escolaridade") as string)?.trim() || null,
    profissao: (formData.get("profissao") as string)?.trim() || null,
    naturalidade_cidade: (formData.get("naturalidade_cidade") as string)?.trim() || null,
    naturalidade_estado: (formData.get("naturalidade_estado") as string) || null,
    nacionalidade: (formData.get("nacionalidade") as string)?.trim() || null,
    nome_conjuge: (formData.get("nome_conjuge") as string)?.trim() || null,
    nome_mae: (formData.get("nome_mae") as string)?.trim() || null,
    nome_pai: (formData.get("nome_pai") as string)?.trim() || null,
    cep: (formData.get("cep") as string)?.trim() || null,
    endereco: (formData.get("endereco") as string)?.trim() || null,
    endereco_numero: (formData.get("endereco_numero") as string)?.trim() || null,
    endereco_complemento: (formData.get("endereco_complemento") as string)?.trim() || null,
    bairro: (formData.get("bairro") as string)?.trim() || null,
    cidade: (formData.get("cidade") as string)?.trim() || null,
    estado: (formData.get("estado") as string) || null,
    // 25/09/2026, achado em teste (Joaquim): o campo de foto foi liberado
    // na tela (EditarMatriculaForm.tsx, bloco de upload que antes só
    // aparecia fora do selfService) mas o valor nunca era salvo aqui.
    foto_url: (formData.get("foto_url") as string)?.trim() || null,
  };

  // Ficha completa obrigatória no mutirão (20/09/2026, pedido do Joaquim):
  // diferente da tela da secretaria (onde tudo isso é opcional), aqui é
  // tudo-ou-nada -- só profissão, cônjuge, nome do pai e complemento de
  // endereço ficam de fora, porque nem todo mundo tem. Validado aqui no
  // servidor porque o `required` do HTML (EditarMatriculaForm.tsx,
  // selfService) é só conveniência de UX, não segurança.
  const CAMPOS_OBRIGATORIOS: [keyof typeof payload, string][] = [
    ["nome_completo", "Nome completo"],
    ["email", "E-mail"],
    ["telefone", "Telefone"],
    // 22/09/2026, pedido do Joaquim: RG (número) não é mais obrigatório em
    // nenhum formulário — o novo documento de identidade unificado não tem
    // esse número. Órgão emissor/UF do RG abaixo continuam obrigatórios por
    // enquanto (só fazem sentido se a pessoa de fato tiver um RG antigo).
    ["rg_orgao_emissor", "Órgão emissor do RG"],
    ["rg_uf", "UF do RG"],
    ["data_nascimento", "Data de nascimento"],
    ["genero", "Sexo"],
    ["estado_civil", "Estado civil"],
    ["escolaridade", "Escolaridade"],
    ["naturalidade_cidade", "Naturalidade (cidade)"],
    ["naturalidade_estado", "Naturalidade (UF)"],
    ["nacionalidade", "Nacionalidade"],
    ["nome_mae", "Nome da mãe"],
    ["cep", "CEP"],
    ["endereco", "Endereço"],
    ["endereco_numero", "Número"],
    ["bairro", "Bairro"],
    ["cidade", "Cidade"],
    ["estado", "UF"],
  ];
  const faltando = CAMPOS_OBRIGATORIOS.filter(([campo]) => !payload[campo]).map(([, label]) => label);
  if (faltando.length > 0) {
    redirect(
      "/completar-cadastro?error=" +
        encodeURIComponent(`Preencha todos os campos obrigatórios: ${faltando.join(", ")}.`)
    );
  }

  await upsertProfissaoLivre(admin, payload.profissao);

  const { error } = await admin.from("ead_alunos").update(payload).eq("id", aluno.id);

  if (error) {
    console.error("[completar-cadastro] salvarFichaAlunoAction", error);
    redirect("/completar-cadastro?error=" + encodeURIComponent("Erro ao salvar seu cadastro. Tente novamente."));
  }

  revalidatePath("/portal");
  // Próxima etapa do mutirão: conferência de mensalidades (parcelas),
  // não vai direto pro curso ainda -- ver completar-cadastro/pagamento.
  redirect("/completar-cadastro/pagamento");
}

// ── Conferência de mensalidades no primeiro acesso (20/09/2026, pedido
// do Joaquim) — última etapa do mutirão, só depois da ficha completa.
// Gera o plano INTEIRO de parcelas do curso (course_pricing.numero_parcelas,
// sempre -- valor da parcela nunca muda, é fixo por curso) igual a
// matricularDiretoAction (secretaria) faz, e além disso já marca como PAGO
// as parcelas que o próprio aluno confirmar aqui (com a forma de
// pagamento escolhida por parcela). É rodado uma única vez -- a page.tsx
// desta rota já verifica antes se a matrícula já tem parcela gerada e
// pula esta etapa se sim.
export async function salvarPagamentoInicialAlunoAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: aluno } = await admin
    .from("ead_alunos")
    .select(
      "id, nome_completo, matricula, cpf, email, telefone, data_nascimento, rg, rg_orgao_emissor, rg_uf, genero, estado_civil, escolaridade, profissao, naturalidade_cidade, naturalidade_estado, nacionalidade, nome_conjuge, nome_mae, nome_pai, cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado, campo_ministerio_nome, sector_id, church_id, foto_url"
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (!aluno) redirect("/portal");

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, course_id, curso_nome_snapshot, course_edition_id, professor_id")
    .eq("aluno_id", aluno.id)
    .eq("origem", "MUTIRAO_LINK")
    .limit(1)
    .maybeSingle();
  if (!matricula) redirect(await resolverDestinoPosLogin(supabase, user.id));

  // Idempotência -- ver mesma checagem em completar-cadastro/pagamento/page.tsx.
  const { count: jaTemParcelas } = await admin
    .from("fin_contas_receber")
    .select("id", { count: "exact", head: true })
    .eq("origem_tipo", "MATRICULA_DIRETA")
    .eq("origem_id", matricula.id);
  if (jaTemParcelas && jaTemParcelas > 0) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_matricula_centavos, valor_parcela_centavos, numero_parcelas")
    .eq("course_id", matricula.course_id)
    .maybeSingle();

  if (!preco || preco.valor_parcela_centavos <= 0) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const primeiroVencimento = (formData.get("data_inicio") as string) || new Date().toISOString().slice(0, 10);
  const totalParcelasExibidas = Math.max(1, Number(formData.get("total_parcelas_exibidas")) || 1);

  // Matrícula (só Básico, valor > 0) — mesma regra de matricularDiretoAction:
  // linha separada, vence junto com a 1ª parcela.
  if (preco!.valor_matricula_centavos > 0) {
    await gerarParcelasContasReceber(admin, {
      origemTipo: "MATRICULA_DIRETA",
      origemId: matricula!.id,
      alunoId: aluno.id,
      responsavelPagamento: "ALUNO",
      descricaoBase: `Matrícula — ${matricula!.curso_nome_snapshot}`,
      valorTotalCentavos: preco!.valor_matricula_centavos,
      totalParcelas: 1,
      primeiroVencimento,
      formaPagamentoPrevista: "DINHEIRO",
    });
  }

  // Mensalidades — plano completo (numero_parcelas do curso), valor fixo
  // por mês, sempre gerado por inteiro (as futuras ficam PENDENTE
  // naturalmente; só as conferidas abaixo viram PAGO agora).
  await gerarParcelasContasReceber(admin, {
    origemTipo: "MATRICULA_DIRETA",
    origemId: matricula!.id,
    alunoId: aluno.id,
    responsavelPagamento: "ALUNO",
    descricaoBase: `Mensalidade — ${matricula!.curso_nome_snapshot}`,
    valorTotalCentavos: preco!.valor_parcela_centavos * preco!.numero_parcelas,
    totalParcelas: preco!.numero_parcelas,
    primeiroVencimento,
    formaPagamentoPrevista: "DINHEIRO",
  });

  // Marca como PAGO as parcelas que o aluno confirmou aqui (checkbox
  // "já paguei" + forma de pagamento, uma por parcela -- ver
  // PagamentoInicialAlunoForm.tsx). Igual a matrícula: quando o Básico
  // e a parcela 1 estão marcadas como pagas, a matrícula (linha
  // separada) também entra junto -- é a mesma cobrança na prática.
  const { data: parcelasGeradas } = await admin
    .from("fin_contas_receber")
    .select("id, numero_parcela, descricao, valor_bruto_centavos, total_parcelas, forma_pagamento_prevista, responsavel_pagamento, data_vencimento")
    .eq("origem_tipo", "MATRICULA_DIRETA")
    .eq("origem_id", matricula!.id)
    .order("numero_parcela");

  // Baixa segue a mesma convenção de professorBaixarParcelaAction
  // (professor/actions.ts): valor_liquido_centavos = valor_bruto_centavos
  // (sem desconto), pago_em como timestamp completo, baixado_por = quem
  // confirmou -- aqui o próprio aluno, único caso em que ele mesmo é o
  // "baixador" da própria parcela.
  const agora = new Date().toISOString();

  const darBaixa = async (id: string, valorBrutoCentavos: number, forma: string, pagoEm: string) => {
    await admin
      .from("fin_contas_receber")
      .update({
        status: "PAGO",
        forma_pagamento_prevista: forma,
        valor_liquido_centavos: valorBrutoCentavos,
        pago_em: pagoEm,
        baixado_por: user.id,
        updated_at: agora,
      })
      .eq("id", id);
  };

  for (let n = 1; n <= totalParcelasExibidas; n++) {
    const pago = formData.get(`pago_${n}`) === "true";
    if (!pago) continue;
    const forma = (formData.get(`forma_${n}`) as string) || "DINHEIRO";
    // 25/09/2026, pedido do Joaquim: o aluno anota antes (em papel) as datas
    // em que efetivamente pagou cada mensalidade, e agora informa cada uma
    // aqui — isso vira o `pago_em` real da parcela em vez de sempre usar o
    // momento do cadastro (`agora`), pra bater com o financeiro de verdade.
    const dataInformada = (formData.get(`data_${n}`) as string) || "";
    const pagoEm = dataInformada ? `${dataInformada}T12:00:00` : agora;

    const parcelaMensalidade = (parcelasGeradas ?? []).find(
      (p) => p.numero_parcela === n && p.descricao.startsWith("Mensalidade")
    );
    if (parcelaMensalidade) {
      await darBaixa(parcelaMensalidade.id, parcelaMensalidade.valor_bruto_centavos, forma, pagoEm);
    }

    // Parcela 1 do Básico já inclui a matrícula na mesma cobrança.
    if (n === 1 && preco!.valor_matricula_centavos > 0) {
      const parcelaMatricula = (parcelasGeradas ?? []).find((p) => p.descricao.startsWith("Matrícula"));
      if (parcelaMatricula) {
        await darBaixa(parcelaMatricula.id, parcelaMatricula.valor_bruto_centavos, forma, pagoEm);
      }
    }
  }

  // PDF da matrícula (21/09/2026, pedido do Joaquim, achado em teste): até
  // aqui só a Matrícula Direta da secretaria gerava PDF automaticamente —
  // quem vinha pelo link do mutirão nunca tinha o "Baixar PDF" na listagem.
  // Gera aqui, no fim do mutirão (ficha + conferência de mensalidades já
  // completas), mesmo padrão de matricularDiretoAction/confirmar-cadastro.
  // Best-effort: se falhar, a matrícula e os pagamentos já gravados acima
  // não devem ser perdidos.
  try {
    let turmaNome: string | null = null;
    let professorNome: string | null = null;
    let setorNome: string | null = null;
    let igrejaNome: string | null = null;

    if (matricula!.course_edition_id) {
      const { data: turma } = await admin
        .from("course_editions")
        .select("nome")
        .eq("id", matricula!.course_edition_id)
        .maybeSingle();
      turmaNome = turma?.nome ?? null;
    }
    if (matricula!.professor_id) {
      const { data: professor } = await admin
        .from("professores")
        .select("nome_completo")
        .eq("id", matricula!.professor_id)
        .maybeSingle();
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

    // Mesmo recorte matrícula/mensalidade de confirmar-cadastro/[id]/actions.ts:
    // acha as duas linhas geradas acima pela descrição ("Matrícula —"/
    // "Mensalidade —"), nunca chuta valor.
    const contaMatricula = (parcelasGeradas ?? []).find((p) => p.descricao.startsWith("Matrícula"));
    const contaMensalidade = (parcelasGeradas ?? []).find((p) => p.descricao.startsWith("Mensalidade"));
    const dadosPagamento = contaMensalidade
      ? {
          valorMatriculaCentavos: contaMatricula?.valor_bruto_centavos ?? 0,
          valorParcelaCentavos: contaMensalidade.valor_bruto_centavos,
          parcelas: contaMensalidade.total_parcelas,
          formaPagamento: contaMensalidade.forma_pagamento_prevista,
          responsavelPagamento: contaMensalidade.responsavel_pagamento,
          primeiroVencimento: contaMensalidade.data_vencimento as string,
        }
      : null;

    let fotoParaPdf: Uint8Array | null = null;
    if (aluno.foto_url) {
      try {
        const res = await fetch(aluno.foto_url);
        if (res.ok) fotoParaPdf = new Uint8Array(await res.arrayBuffer());
      } catch (err) {
        console.error("[completar-cadastro/pagamento] erro ao buscar foto pro PDF:", err);
      }
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "desconhecido";
    const userAgent = hdrs.get("user-agent") || "desconhecido";

    const pdfBytes = await gerarPdfMatricula(
      {
        nomeCompleto: aluno.nome_completo,
        matricula: aluno.matricula,
        cursoPretendido: matricula!.curso_nome_snapshot,
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
        pagamento: dadosPagamento,
      },
      null, // sem assinatura eletrônica -- este passo não tem canvas de assinatura
      { ip, userAgent, assinadoEm: new Date() },
      fotoParaPdf
    );

    const pdfFileName = `matricula-${aluno.id}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[completar-cadastro/pagamento] upload do PDF falhou:", pdfUploadError.message);
    } else {
      await admin.from("ead_alunos").update({ pdf_matricula_path: pdfFileName }).eq("id", aluno.id);
    }
  } catch (err) {
    console.error("[completar-cadastro/pagamento] erro inesperado ao gerar PDF da matrícula:", err);
  }

  revalidatePath("/portal");
  revalidatePath("/admin/matriculas");
  redirect(await resolverDestinoPosLogin(supabase, user.id));
}
