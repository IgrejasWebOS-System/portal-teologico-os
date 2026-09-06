"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { validarCPF } from "@/utils/cpf";
import { gerarQrCodeDataUrl } from "@/utils/qrcode";
import { enviarLinkFichaRapida } from "@/utils/email/resend";
import { revalidatePath } from "next/cache";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";

function centavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

// ============================================================
// Ficha rápida — a secretaria/professor cadastra só o essencial
// (o que dá pra tirar de uma ficha de papel preenchida na hora:
// nome, CPF, curso, campo/igreja) e gera na hora um link + QR Code
// pro PRÓPRIO ALUNO completar o resto (endereço, RG, mãe/pai, foto)
// depois, pelo celular, em /confirmar-cadastro/[id] — sem exigir
// que a secretaria digite tudo mesa por mesa.
//
// Diferença pra matricularDiretoAction (nova/actions.ts): aquela
// exige ficha completa + e-mail real na hora (matrícula "fechada").
// Esta cria a matrícula igual (mesmo RPC, mesma numeração), mas com
// e-mail placeholder e status "FICHA_PENDENTE" — sem convite de
// acesso disparado ainda. O convite só sai quando o aluno confirma
// o próprio e-mail em /confirmar-cadastro (ver actions.ts de lá),
// que também é quem muda o status pra "ATIVO".
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) throw new Error("Acesso restrito à secretaria do CETADP.");

  return { supabase, userId: user.id };
}

export async function criarFichaPendenteAction(formData: FormData) {
  let ctx;
  try {
    ctx = await requireStaff();
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Não autorizado." };
  }
  const { supabase, userId } = ctx;
  const admin = createAdminClient();

  const nome_completo = (formData.get("nome_completo") as string)?.trim();
  const cpf = (formData.get("cpf") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const emailInformadoRaw = (formData.get("email") as string)?.trim() || "";
  const emailInformado = emailInformadoRaw.includes("@") ? emailInformadoRaw : null;
  const course_id = (formData.get("course_id") as string) || "";
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const campo_ministerio_nome = (formData.get("campo_ministerio_nome") as string) || null;
  const sector_id = (formData.get("sector_id") as string) || null;
  const church_id_aluno = (formData.get("church_id_aluno") as string) || null;
  const course_edition_id = (formData.get("course_edition_id") as string) || null;
  const professor_id = (formData.get("professor_id") as string) || null;

  if (!nome_completo || !cpf || !course_id) {
    return { success: false, message: "Preencha nome completo, CPF e o curso." };
  }
  if (!validarCPF(cpf)) {
    return { success: false, message: "CPF inválido — confira os dígitos digitados." };
  }

  const { data: curso } = await admin.from("courses").select("id, title").eq("id", course_id).single();
  if (!curso) return { success: false, message: "Curso inválido." };

  let alunoUnitId: string | null = null;
  if (church_id_aluno) {
    const { data: churchRow } = await admin
      .from("churches")
      .select("unit_id")
      .eq("id", church_id_aluno)
      .single();
    alunoUnitId = churchRow?.unit_id ?? null;
  }

  // Mesma identidade por CPF que o resto do sistema — reaproveita ficha
  // já existente em vez de duplicar.
  const { data: existente } = await admin
    .from("ead_alunos")
    .select("id, user_id, status, nome_completo")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existente) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id, matricula")
      .eq("aluno_id", existente.id)
      .eq("course_id", curso.id)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (conflito) {
      // O aluno ainda não completou o cadastro pelo celular (ficha
      // pendente) — em vez de travar, reaproveita a mesma ficha e
      // devolve o mesmo link/QR de novo, pra secretaria poder mostrar
      // ou reenviar sem gerar uma segunda matrícula duplicada.
      if (existente.status === "FICHA_PENDENTE") {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const url = `${appUrl}/confirmar-cadastro/${existente.id}`;
        const qrCodeDataUrl = await gerarQrCodeDataUrl(url).catch(() => null);

        return {
          success: true,
          reaproveitada: true,
          data: {
            alunoId: existente.id,
            matricula: conflito.matricula ?? "",
            nomeCompleto: existente.nome_completo ?? nome_completo,
            url,
            qrCodeDataUrl,
          },
        };
      }

      return {
        success: false,
        message: "Este CPF já possui matrícula em andamento ou aprovada neste curso.",
      };
    }
  }

  const { data: matriculaNum, error: matriculaError } = await supabase.rpc("get_next_matricula_ead");
  if (matriculaError || !matriculaNum) {
    return { success: false, message: "Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido") };
  }

  // E-mail placeholder — nunca é usado pra enviar nada (domínio não
  // existe de propósito) — só entra se a secretaria não tiver digitado
  // um e-mail real na Ficha Rápida. Se um e-mail de verdade já foi
  // informado aqui, ele é gravado direto e /confirmar-cadastro não
  // pergunta de novo (ver confirmar-cadastro/[id]/ConfirmarCadastroForm.tsx).
  const emailPlaceholder = `pendente+${matriculaNum}@cetadp.pendente.br`;
  const email = emailInformado ?? emailPlaceholder;

  let aluno = existente;
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
        unit_id: alunoUnitId,
        tipo_aluno: church_id_aluno ? "IGREJA" : null,
        matricula: matriculaNum,
        curso_pretendido: curso.title,
        status: "FICHA_PENDENTE", // aguardando o aluno completar via QR
        consentimento_lgpd_aceito: false, // consentimento é do aluno, dado só na confirmação
      })
      .select("id, user_id, status, nome_completo")
      .single();

    if (alunoError || !novoAluno) {
      return { success: false, message: "Erro ao cadastrar aluno: " + (alunoError?.message ?? "desconhecido") };
    }
    aluno = novoAluno;
  } else if (emailInformado) {
    // Ficha já existia (mesmo CPF) mas ainda com e-mail placeholder — se
    // a secretaria digitou um e-mail real agora, atualiza direto.
    await admin.from("ead_alunos").update({ email: emailInformado }).eq("id", aluno.id);
  }

  const { data: matriculaCriada, error: matriculaInsertError } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno.id,
      course_id: curso.id,
      curso_nome_snapshot: curso.title,
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
    return { success: false, message: "Erro ao registrar matrícula: " + (matriculaInsertError?.message ?? "desconhecido") };
  }

  // Pagamento (opcional) — mesmo modelo da Matrícula Direta (ver
  // matriculas/actions.ts): valor de matrícula + parcelas, vindos do preço
  // fixo do curso (course_pricing) mas sobrescrevíveis pontualmente aqui.
  // Ficha Rápida por padrão usa link Pix/Mercado Pago (o aluno ainda não
  // está presente na hora de pagar em dinheiro).
  const valorMatriculaCentavos = centavos((formData.get("valor_matricula") as string) || "");
  const valorParcelaCentavos = centavos((formData.get("valor_parcela") as string) || "");
  const totalParcelas = Math.min(12, Math.max(1, Number(formData.get("total_parcelas")) || 1));
  const valorTotalCentavos = valorMatriculaCentavos + valorParcelaCentavos * totalParcelas;
  const formaCobranca = (formData.get("forma_cobranca") as string) === "MANUAL" ? "MANUAL" : "MERCADOPAGO";
  const responsavelPagamento = (formData.get("responsavel_pagamento") as string) === "IGREJA" ? "IGREJA" : "ALUNO";
  const churchIdPagamento = (formData.get("church_id") as string) || null;

  let linkPagamento: string | null = null;

  if (valorTotalCentavos > 0 && formaCobranca === "MANUAL") {
    const hoje = new Date().toISOString().slice(0, 10);
    if (valorMatriculaCentavos > 0) {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: matriculaCriada.id,
        alunoId: aluno.id,
        alunoUserId: aluno.user_id,
        responsavelPagamento,
        churchId: churchIdPagamento,
        descricaoBase: `Matrícula — ${curso.title}`,
        valorTotalCentavos: valorMatriculaCentavos,
        totalParcelas: 1,
        primeiroVencimento: hoje,
        formaPagamentoPrevista: "PIX",
      });
    }
    if (valorParcelaCentavos > 0) {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: matriculaCriada.id,
        alunoId: aluno.id,
        alunoUserId: aluno.user_id,
        responsavelPagamento,
        churchId: churchIdPagamento,
        descricaoBase: `Mensalidade — ${curso.title}`,
        valorTotalCentavos: valorParcelaCentavos * totalParcelas,
        totalParcelas,
        primeiroVencimento: hoje,
        formaPagamentoPrevista: "PIX",
      });
    }
  } else if (valorTotalCentavos > 0 && formaCobranca === "MERCADOPAGO") {
    const { data: contaReceber, error: erroContaReceber } = await admin
      .from("fin_contas_receber")
      .insert({
        origem_tipo: "MATRICULA_DIRETA",
        origem_id: matriculaCriada.id,
        aluno_id: aluno.id,
        aluno_user_id: aluno.user_id,
        responsavel_pagamento: responsavelPagamento,
        church_id: responsavelPagamento === "IGREJA" ? churchIdPagamento : null,
        descricao: `Matrícula + curso — ${curso.title}`,
        numero_parcela: 1,
        total_parcelas: 1,
        valor_bruto_centavos: valorTotalCentavos,
        forma_pagamento_prevista: "PIX",
        data_vencimento: new Date().toISOString().slice(0, 10),
        status: "PENDENTE",
      })
      .select("id")
      .single();

    if (erroContaReceber || !contaReceber) {
      console.error("[ficha-rapida] Falha ao criar conta a receber para link Mercado Pago:", erroContaReceber);
    } else {
      try {
        const preferencia = await criarPreferenciaCheckout({
          orderId: contaReceber.id,
          itens: [{ titulo: `Matrícula + curso — ${curso.title}`, quantidade: 1, precoUnitarioCentavos: valorTotalCentavos }],
          emailComprador: emailInformado ?? undefined,
          backUrlPath: "/matricula/pagamento",
        });

        await admin
          .from("fin_contas_receber")
          .update({ mercadopago_preference_id: preferencia.id })
          .eq("id", contaReceber.id);

        linkPagamento = preferencia.sandbox_init_point || preferencia.init_point;
      } catch (e) {
        console.error("[ficha-rapida] Falha ao criar preferência no Mercado Pago:", e);
      }
    }
  }

  revalidatePath("/admin/matriculas");
  revalidatePath("/admin/financeiro/contas-a-receber");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${appUrl}/confirmar-cadastro/${aluno.id}`;
  const qrCodeDataUrl = await gerarQrCodeDataUrl(url).catch(() => null);

  return {
    success: true,
    data: {
      alunoId: aluno.id,
      matricula: matriculaNum,
      nomeCompleto: nome_completo,
      url,
      qrCodeDataUrl,
      linkPagamento,
    },
  };
}

// ============================================================
// Envia (ou reenvia) por e-mail o link de /confirmar-cadastro pro
// próprio aluno — pra quando ele não está presente pra escanear o
// QR Code na hora, ou quando o link "não chegou" e a secretaria quer
// tentar de novo. Só funciona enquanto a ficha ainda estiver
// pendente (o aluno ainda não completou o cadastro).
// ============================================================
export async function enviarLinkFichaEmailAction(alunoId: string, email: string) {
  try {
    await requireStaff();
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Não autorizado." };
  }

  if (!email || !email.includes("@")) {
    return { success: false, message: "Informe um e-mail válido." };
  }

  const admin = createAdminClient();
  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, nome_completo, status")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return { success: false, message: "Ficha não encontrada." };
  if (aluno.status !== "FICHA_PENDENTE") {
    return {
      success: false,
      message: "Este cadastro já foi confirmado — não há link pendente para enviar.",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${appUrl}/confirmar-cadastro/${aluno.id}`;
  const enviado = await enviarLinkFichaRapida(email, aluno.nome_completo, url);

  return {
    success: enviado,
    message: enviado
      ? `Link enviado para ${email}.`
      : "Não foi possível enviar o e-mail agora (envio ainda não configurado no ambiente) — use o link ou o QR Code na tela.",
  };
}
