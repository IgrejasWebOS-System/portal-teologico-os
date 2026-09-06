"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { gerarPdfMatricula } from "@/utils/pdf/matricula";

export type ConfirmarCadastroResultado =
  | { ok: true; pdfUrl: string | null }
  | { ok: false; erro: string };

// ============================================================
// Confirmação pública de cadastro (aluno, via QR Code — ver
// admin/matriculas/ficha-rapida). Sem sessão: identifica a ficha
// só pelo id da URL (validado de novo aqui, nunca confia no que o
// client mandou sem checar o status atual no banco).
// ============================================================

export async function confirmarCadastroAction(
  alunoId: string,
  formData: FormData
): Promise<ConfirmarCadastroResultado> {
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, nome_completo, status, cpf, matricula, curso_pretendido, campo_ministerio_nome, sector_id, church_id, foto_url")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return { ok: false, erro: "Ficha não encontrada." };
  if (aluno.status !== "FICHA_PENDENTE") {
    return { ok: false, erro: "Este cadastro já foi confirmado anteriormente." };
  }

  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const dataNascimento = (formData.get("data_nascimento") as string) || null;
  const rg = (formData.get("rg") as string)?.trim() || null;
  const rgOrgaoEmissor = (formData.get("rg_orgao_emissor") as string)?.trim() || null;
  const rgUf = (formData.get("rg_uf") as string)?.trim() || null;
  const genero = (formData.get("genero") as string) || null;
  const estadoCivil = (formData.get("estado_civil") as string) || null;
  const escolaridade = (formData.get("escolaridade") as string) || null;
  const profissao = (formData.get("profissao") as string) || null;
  const naturalidadeCidade = (formData.get("naturalidade_cidade") as string)?.trim() || null;
  const naturalidadeEstado = (formData.get("naturalidade_estado") as string)?.trim() || null;
  const nacionalidade = (formData.get("nacionalidade") as string)?.trim() || "Brasileira";
  const nomeConjuge = (formData.get("nome_conjuge") as string)?.trim() || null;
  const nomeMae = (formData.get("nome_mae") as string)?.trim() || null;
  const nomePai = (formData.get("nome_pai") as string)?.trim() || null;
  const cep = (formData.get("cep") as string)?.trim() || null;
  const endereco = (formData.get("endereco") as string)?.trim() || null;
  const enderecoNumero = (formData.get("endereco_numero") as string)?.trim() || null;
  const enderecoComplemento = (formData.get("endereco_complemento") as string)?.trim() || null;
  const bairro = (formData.get("bairro") as string)?.trim() || null;
  const cidade = (formData.get("cidade") as string)?.trim() || null;
  const estado = (formData.get("estado") as string) || null;
  const consentimentoLgpdAceito = (formData.get("consentimento_lgpd_aceito") as string) === "true";
  const foto = formData.get("foto") as File | null;
  const assinaturaDataUrl = (formData.get("assinatura") as string) || "";

  if (!email || !email.includes("@")) {
    return { ok: false, erro: "Informe um e-mail válido — é por ele que você vai acessar o portal." };
  }
  if (!consentimentoLgpdAceito) {
    return { ok: false, erro: "É necessário aceitar o consentimento LGPD para concluir o cadastro." };
  }
  // Assinatura eletrônica é opcional — se vier vazia/inválida, o cadastro
  // segue normal, só sem a seção de assinatura no PDF.
  const temAssinatura = assinaturaDataUrl.startsWith("data:image/png;base64,");

  // E-mail não pode já pertencer a outra ficha (evita colisão com a
  // regra de convite do Supabase, que exige e-mail único por usuário).
  const { data: emailEmUso } = await admin
    .from("ead_alunos")
    .select("id")
    .eq("email", email)
    .neq("id", alunoId)
    .maybeSingle();
  if (emailEmUso) {
    return { ok: false, erro: "Este e-mail já está em uso por outro cadastro. Confira ou fale com a secretaria." };
  }

  let fotoUrl: string | null = null;
  let fotoBufferParaPdf: Buffer | null = null;
  if (foto && foto.size > 0) {
    try {
      const ext = foto.name.split(".").pop() || "jpg";
      const fileName = `aluno-${alunoId}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await foto.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(fileName, buffer, { contentType: foto.type || "image/jpeg" });
      if (!uploadError) {
        const { data } = admin.storage.from("avatars").getPublicUrl(fileName);
        fotoUrl = data.publicUrl;
        fotoBufferParaPdf = buffer;
      } else {
        console.error("[confirmar-cadastro] upload de foto falhou:", uploadError.message);
      }
    } catch (err) {
      // Falha no upload da foto não deve travar a confirmação do resto do
      // cadastro — a secretaria pode pedir a foto de novo depois. Mas loga
      // pra não ficar invisível caso vire um padrão (ex.: bucket ausente).
      console.error("[confirmar-cadastro] erro inesperado no upload de foto:", err);
    }
  }

  // Assinatura eletrônica (canvas) é opcional. Quando presente, sobe primeiro
  // pro storage, pra existir como evidência mesmo se a geração do PDF falhar
  // por algum motivo (aí dá pra reprocessar o PDF depois sem pedir pro aluno
  // assinar de novo).
  let assinaturaFileName: string | null = null;
  let assinaturaBuffer: Buffer | null = null;
  if (temAssinatura) {
    assinaturaBuffer = Buffer.from(assinaturaDataUrl.split(",")[1] ?? "", "base64");
    const fileName = `aluno-${alunoId}-${Date.now()}.png`;
    const { error: assinaturaUploadError } = await admin.storage
      .from("assinaturas")
      .upload(fileName, assinaturaBuffer, { contentType: "image/png" });
    if (assinaturaUploadError) {
      console.error("[confirmar-cadastro] upload da assinatura falhou:", assinaturaUploadError.message);
      // Falha no upload da assinatura não deve travar o resto do cadastro —
      // segue sem assinatura, igual a quando a pessoa não desenha nada.
    } else {
      assinaturaFileName = fileName;
    }
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "desconhecido";
  const userAgent = hdrs.get("user-agent") || "desconhecido";
  const assinadoEm = new Date();

  // Curso e vínculo (turma/professor) ficam em ead_matriculas, gravados lá
  // atrás (Ficha Rápida ou Nova Matrícula) — busca best-effort só pra
  // enriquecer o PDF, nunca trava a confirmação se algo faltar.
  let turmaNome: string | null = null;
  let professorNome: string | null = null;
  let setorNome: string | null = null;
  let igrejaNome: string | null = null;
  let dadosPagamento: {
    valorMatriculaCentavos: number | null | undefined; valorParcelaCentavos: number; parcelas: number;
    formaPagamento: string | null; responsavelPagamento: string | null; primeiroVencimento: string | null;
  } | null = null;
  try {
    // .limit(1) em vez de .maybeSingle() — um aluno pode ter mais de uma
    // matrícula (cursos diferentes ao longo do tempo); maybeSingle() dá
    // erro se achar mais de uma linha, então pegamos só a mais recente.
    const { data: matriculasDoAluno } = await admin
      .from("ead_matriculas")
      .select("course_edition_id, professor_id")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false })
      .limit(1);
    const matriculaRow = matriculasDoAluno?.[0] ?? null;
    if (matriculaRow?.course_edition_id) {
      const { data: turma } = await admin
        .from("course_editions")
        .select("nome")
        .eq("id", matriculaRow.course_edition_id)
        .maybeSingle();
      turmaNome = turma?.nome ?? null;
    }
    if (matriculaRow?.professor_id) {
      const { data: professor } = await admin
        .from("professores")
        .select("nome_completo")
        .eq("id", matriculaRow.professor_id)
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
    // Desde que Ficha Rápida/Nova Matrícula passaram a lançar matrícula e
    // mensalidade como cobranças separadas (course_pricing), pegar só "a
    // primeira parcela" não basta — precisa separar qual linha é a
    // matrícula (1x) e qual é a mensalidade (Nx) pelas descrições que essas
    // actions sempre usam. Cobrança única via Mercado Pago cai no terceiro
    // caso, sem recorte conhecido (nunca inventa "isento" nesse caso).
    const { data: todasContas } = await admin
      .from("fin_contas_receber")
      .select("valor_bruto_centavos, total_parcelas, forma_pagamento_prevista, responsavel_pagamento, data_vencimento, descricao")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: true });

    const contaMatricula = todasContas?.find((c) => c.descricao?.startsWith("Matrícula —"));
    const contaMensalidade = todasContas?.find((c) => c.descricao?.startsWith("Mensalidade —"));
    const contaCombinada = todasContas?.find((c) => c.descricao?.startsWith("Matrícula + curso —"));

    if (contaMensalidade) {
      dadosPagamento = {
        valorMatriculaCentavos: contaMatricula?.valor_bruto_centavos ?? 0,
        valorParcelaCentavos: contaMensalidade.valor_bruto_centavos,
        parcelas: contaMensalidade.total_parcelas,
        formaPagamento: contaMensalidade.forma_pagamento_prevista,
        responsavelPagamento: contaMensalidade.responsavel_pagamento,
        primeiroVencimento: contaMensalidade.data_vencimento as string,
      };
    } else if (contaMatricula) {
      dadosPagamento = {
        valorMatriculaCentavos: contaMatricula.valor_bruto_centavos,
        valorParcelaCentavos: 0,
        parcelas: 1,
        formaPagamento: contaMatricula.forma_pagamento_prevista,
        responsavelPagamento: contaMatricula.responsavel_pagamento,
        primeiroVencimento: contaMatricula.data_vencimento as string,
      };
    } else if (contaCombinada) {
      dadosPagamento = {
        valorMatriculaCentavos: undefined,
        valorParcelaCentavos: contaCombinada.valor_bruto_centavos,
        parcelas: 1,
        formaPagamento: contaCombinada.forma_pagamento_prevista,
        responsavelPagamento: contaCombinada.responsavel_pagamento,
        primeiroVencimento: contaCombinada.data_vencimento as string,
      };
    }
  } catch (err) {
    console.error("[confirmar-cadastro] erro ao buscar curso/vínculo ou pagamento pro PDF:", err);
  }

  // Foto pro PDF: usa a que acabou de ser enviada; se não veio nenhuma
  // agora, mas o aluno já tinha uma foto de antes, busca ela — o PDF deve
  // espelhar o cadastro completo, com ou sem foto nova nesta submissão.
  let fotoParaPdf = fotoBufferParaPdf;
  if (!fotoParaPdf && aluno.foto_url) {
    try {
      const res = await fetch(aluno.foto_url);
      if (res.ok) fotoParaPdf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error("[confirmar-cadastro] erro ao buscar foto existente pro PDF:", err);
    }
  }

  // Geração do PDF em si é best-effort: se falhar, o cadastro (e a
  // assinatura, já salva acima) não devem ser perdidos — a secretaria pode
  // reprocessar o PDF depois a partir do que já está no storage.
  let pdfPath: string | null = null;
  let pdfUrl: string | null = null;
  try {
    const pdfBytes = await gerarPdfMatricula(
      {
        nomeCompleto: aluno.nome_completo,
        matricula: aluno.matricula,
        cursoPretendido: aluno.curso_pretendido,
        cpf: aluno.cpf,
        email,
        telefone,
        dataNascimento,
        rg,
        rgOrgaoEmissor,
        rgUf,
        genero,
        estadoCivil,
        escolaridade,
        profissao,
        naturalidadeCidade,
        naturalidadeEstado,
        nacionalidade,
        nomeConjuge,
        nomeMae,
        nomePai,
        cep,
        endereco,
        enderecoNumero,
        enderecoComplemento,
        bairro,
        cidade,
        estado,
        turmaNome,
        professorNome,
        campoMinisterio: aluno.campo_ministerio_nome,
        setorNome,
        igrejaNome,
        pagamento: dadosPagamento,
      },
      assinaturaBuffer ? new Uint8Array(assinaturaBuffer) : null,
      { ip, userAgent, assinadoEm },
      fotoParaPdf ? new Uint8Array(fotoParaPdf) : null
    );

    const pdfFileName = `matricula-${alunoId}-${Date.now()}.pdf`;
    const { error: pdfUploadError } = await admin.storage
      .from("matriculas-pdf")
      .upload(pdfFileName, Buffer.from(pdfBytes), { contentType: "application/pdf" });

    if (pdfUploadError) {
      console.error("[confirmar-cadastro] upload do PDF falhou:", pdfUploadError.message);
    } else {
      pdfPath = pdfFileName;
      const { data: signed, error: signError } = await admin.storage
        .from("matriculas-pdf")
        .createSignedUrl(pdfFileName, 60 * 60 * 24); // 24h — só pra tela de conclusão
      if (signError) {
        console.error("[confirmar-cadastro] falha ao gerar link assinado do PDF:", signError.message);
      } else {
        pdfUrl = signed?.signedUrl ?? null;
      }
    }
  } catch (err) {
    console.error("[confirmar-cadastro] erro inesperado ao gerar PDF da matrícula:", err);
  }

  const { error: updateError } = await admin
    .from("ead_alunos")
    .update({
      email,
      telefone,
      data_nascimento: dataNascimento,
      rg,
      rg_orgao_emissor: rgOrgaoEmissor,
      rg_uf: rgUf,
      genero,
      estado_civil: estadoCivil,
      escolaridade,
      profissao,
      naturalidade_cidade: naturalidadeCidade,
      naturalidade_estado: naturalidadeEstado,
      nacionalidade,
      nome_conjuge: nomeConjuge,
      nome_mae: nomeMae,
      nome_pai: nomePai,
      cep,
      endereco,
      endereco_numero: enderecoNumero,
      endereco_complemento: enderecoComplemento,
      bairro,
      cidade,
      estado,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      consentimento_lgpd_aceito: true,
      consentimento_lgpd_data: new Date().toISOString(),
      status: "ATIVO",
      ...(assinaturaFileName
        ? {
            assinatura_path: assinaturaFileName,
            assinatura_ip: ip,
            assinatura_user_agent: userAgent,
            assinado_em: assinadoEm.toISOString(),
          }
        : {}),
      ...(pdfPath ? { pdf_matricula_path: pdfPath } : {}),
    })
    .eq("id", alunoId);

  if (updateError) {
    return { ok: false, erro: "Erro ao salvar cadastro: " + updateError.message };
  }

  // Só agora, com e-mail real confirmado pelo próprio aluno, sai o
  // convite de acesso ao portal — mesma rotina usada no resto do app.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: aluno.nome_completo },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  if (!inviteError && invited?.user?.id) {
    await admin.from("ead_alunos").update({ user_id: invited.user.id }).eq("id", alunoId);
  }
  // Falha no convite não desfaz o cadastro já salvo — a secretaria pode
  // gerar acesso manualmente depois se o e-mail de convite falhar.

  return { ok: true, pdfUrl };
}
