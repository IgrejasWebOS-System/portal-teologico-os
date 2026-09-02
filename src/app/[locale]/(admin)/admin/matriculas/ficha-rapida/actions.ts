"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import { validarCPF } from "@/utils/cpf";
import { gerarQrCodeDataUrl } from "@/utils/qrcode";
import { revalidatePath } from "next/cache";

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
    .select("id, user_id, status")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existente) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id")
      .eq("aluno_id", existente.id)
      .eq("course_id", curso.id)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (conflito) {
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
  // existe de propósito). Substituído pelo e-mail real quando o aluno
  // confirma em /confirmar-cadastro; só então o convite de acesso sai.
  const emailPlaceholder = `pendente+${matriculaNum}@cetadp.pendente.br`;

  let aluno = existente;
  if (!aluno) {
    const { data: novoAluno, error: alunoError } = await admin
      .from("ead_alunos")
      .insert({
        user_id: null,
        nome_completo,
        cpf,
        email: emailPlaceholder,
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
      .select("id, user_id, status")
      .single();

    if (alunoError || !novoAluno) {
      return { success: false, message: "Erro ao cadastrar aluno: " + (alunoError?.message ?? "desconhecido") };
    }
    aluno = novoAluno;
  }

  const { error: matriculaInsertError } = await admin.from("ead_matriculas").insert({
    aluno_id: aluno.id,
    course_id: curso.id,
    curso_nome_snapshot: curso.title,
    matricula: matriculaNum,
    status: "EM_ANDAMENTO",
    origem: "MATRICULA_DIRETA",
    matriculado_por: userId,
    course_edition_id,
    professor_id,
  });

  if (matriculaInsertError) {
    return { success: false, message: "Erro ao registrar matrícula: " + matriculaInsertError.message };
  }

  revalidatePath("/admin/matriculas");

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
    },
  };
}
