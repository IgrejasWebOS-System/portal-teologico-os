"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { matricularAlunoEmCurso } from "@/utils/ead/matricular";
import { gerarParcelasContasReceber } from "@/utils/financeiro/gerar-parcelas";

// ============================================================
// Matrícula pública por link de turma (mutirão de cadastro, 18/09/2026).
// O token (professor_turmas.link_token) é a única "senha" de acesso —
// nunca confia em professor_id/course_edition_id vindos do client, sempre
// resolve tudo de novo aqui a partir do token.
// ============================================================

export type MatricularPorLinkResultado =
  | { success: true; matricula: string; avisoConvite: string | null }
  | { success: false; message: string };

async function resolverBridgeUnits(
  admin: ReturnType<typeof createAdminClient>,
  unitId: string | null
): Promise<{ church_id: string | null; sector_id: string | null }> {
  let church_id: string | null = null;
  let sector_id: string | null = null;

  if (unitId) {
    const { data: church } = await admin.from("churches").select("id, sector_id").eq("unit_id", unitId).maybeSingle();
    church_id = church?.id ?? null;
    sector_id = church?.sector_id ?? null;
  }
  return { church_id, sector_id };
}

export async function matricularPorLinkAction(formData: FormData): Promise<MatricularPorLinkResultado> {
  const token = formData.get("token") as string;
  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const cpf = (formData.get("cpf") as string)?.trim() || null;
  const matriculaMembroInformada = (formData.get("matricula_membro_informada") as string)?.trim() || null;

  if (!token) return { success: false, message: "Link inválido." };
  if (!nomeCompleto) return { success: false, message: "Nome completo é obrigatório." };
  if (!email || !email.includes("@")) return { success: false, message: "Informe um e-mail válido." };

  const admin = createAdminClient();

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select("id, professor_id, course_edition_id, link_ativo")
    .eq("link_token", token)
    .maybeSingle();

  if (!vinculo) return { success: false, message: "Link inválido — confira com quem te enviou." };
  if (!vinculo.link_ativo) {
    return { success: false, message: "Este link foi desativado. Fale com o professor que te enviou." };
  }

  const { data: turma } = await admin
    .from("course_editions")
    .select("id, course_id, unit_id, nome")
    .eq("id", vinculo.course_edition_id)
    .maybeSingle();

  if (!turma) return { success: false, message: "Esta turma não foi encontrada. Fale com o professor." };

  const { data: curso } = await admin.from("courses").select("title").eq("id", turma.course_id).maybeSingle();
  const { church_id, sector_id } = await resolverBridgeUnits(admin, turma.unit_id);

  // Casamento "soft" com o cadastro de membros por CPF -- nunca bloqueia
  // o cadastro (pedido explícito do Joaquim: mesmo que a pessoa seja
  // membro e não lembre a matrícula, o cadastro segue normalmente).
  let memberId: string | null = null;
  if (cpf) {
    const { data: membro } = await admin.from("members").select("id").eq("cpf", cpf).maybeSingle();
    memberId = membro?.id ?? null;
  }

  const resultado = await matricularAlunoEmCurso(admin, {
    cursoPretendido: curso?.title ?? turma.nome,
    courseIdConhecido: turma.course_id,
    courseEditionId: turma.id,
    professorId: vinculo.professor_id,
    nomeCompleto,
    cpf,
    email,
    telefone,
    unitId: turma.unit_id,
    churchId: church_id,
    sectorId: sector_id,
    memberId,
    matriculaMembroInformada,
    origem: "MUTIRAO_LINK",
  });

  if (!resultado.ok) {
    return { success: false, message: resultado.erro };
  }

  // Parcelamento (se o curso tiver preço de matrícula) — mesmo padrão de
  // professorCriarMatriculaAction: cobrança fica pendente, o professor dá
  // baixa depois em /professor quando receber (PIX/cartão/boleto/
  // transferência em pessoa — dinheiro só pela secretaria, Caixa Diário).
  try {
    const { data: preco } = await admin
      .from("course_pricing")
      .select("valor_matricula_centavos")
      .eq("course_id", turma.course_id)
      .maybeSingle();

    if (preco?.valor_matricula_centavos) {
      await gerarParcelasContasReceber(admin, {
        origemTipo: "MATRICULA_DIRETA",
        origemId: resultado.matriculaId,
        alunoId: resultado.alunoId,
        responsavelPagamento: "ALUNO",
        descricaoBase: `Matrícula — ${curso?.title ?? turma.nome}`,
        valorTotalCentavos: preco.valor_matricula_centavos,
        totalParcelas: 1,
        primeiroVencimento: new Date().toISOString().slice(0, 10),
        formaPagamentoPrevista: "PIX",
      });
    }
  } catch (err) {
    // Parcelamento é best-effort — a matrícula já está garantida acima;
    // se isso falhar, a secretaria lança a cobrança manualmente depois.
    console.error("[matricula-turma] erro ao gerar parcela de matrícula:", err);
  }

  // Vincula o campo/setor/igreja da turma na ficha do aluno (além de
  // church_id/sector_id/unit_id já gravados por matricularAlunoEmCurso) —
  // campo_ministerio_nome é só o rótulo amigável mostrado no PDF/telas.
  if (church_id) {
    const { data: igreja } = await admin.from("churches").select("name").eq("id", church_id).maybeSingle();
    if (igreja?.name) {
      await admin
        .from("ead_alunos")
        .update({ campo_ministerio_nome: igreja.name })
        .eq("id", resultado.alunoId);
    }
  }

  // Avisa quando o e-mail de convite genuinamente falhou, ou quando
  // nenhum e-mail novo foi enviado porque a conta já existia -- em ambos
  // os casos a matrícula já está garantida, só a mensagem final muda. Uma
  // consulta rápida em convite_status resolve os dois casos de uma vez.
  let avisoConvite: string | null = null;
  const { data: alunoFinal } = await admin
    .from("ead_alunos")
    .select("convite_status")
    .eq("id", resultado.alunoId)
    .maybeSingle();

  if (alunoFinal?.convite_status === "FALHOU") {
    avisoConvite =
      "Sua matrícula foi confirmada, mas o e-mail de acesso não pôde ser enviado agora. Fale com a secretaria do CETADP pra liberar seu acesso ao portal.";
  } else if (resultado.contaExistentePromovida) {
    avisoConvite = "Sua matrícula foi confirmada. Você já tinha uma conta no portal (mesmo e-mail) — use sua senha atual pra acessar.";
  }

  return { success: true, matricula: resultado.matricula, avisoConvite };
}
