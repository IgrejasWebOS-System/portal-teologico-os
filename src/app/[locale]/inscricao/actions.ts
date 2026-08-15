"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { labelCurso, precoMatriculaCentavos } from "@/utils/cursos-ead";
import { matricularAlunoEmCurso } from "@/utils/ead/matricular";
import { redirect } from "next/navigation";

// ============================================================
// Inscrição pública no Portal EAD do CETADP
// Não exige login (RLS permite INSERT para "anon", mas usamos o
// cliente admin aqui para poder também gerar a cobrança da matrícula
// sem depender de política extra de UPDATE para "anon").
//
// Dois caminhos a partir daqui — atualizado em 16/07/2026: matrícula
// não depende mais de aprovação manual da secretaria, é habilitada
// na hora em ambos os casos:
// - Curso SEM preço de matrícula definido: aluno + matrícula são
//   criados imediatamente (ver matricularAlunoEmCurso), inscrição
//   já nasce APROVADA.
// - Curso COM preço de matrícula (ex: Teologia Básico, R$25):
//   status AGUARDANDO_PAGAMENTO e redireciona para o Checkout Pro do
//   Mercado Pago. Quando o webhook confirmar o pagamento, ele mesmo
//   cria aluno + matrícula (mesma rotina), sem passar pela secretaria.
// ============================================================

export async function submitInscricaoAction(formData: FormData) {
  const nome_completo    = (formData.get("nome_completo") as string)?.trim();
  const cpf              = (formData.get("cpf") as string)?.trim();
  const email            = (formData.get("email") as string)?.trim();
  const telefone         = (formData.get("telefone") as string)?.trim();
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const curso_pretendido = formData.get("curso_pretendido") as string;
  const mensagem         = (formData.get("mensagem") as string)?.trim();

  if (!nome_completo || !email || !curso_pretendido) {
    redirect(
      "/inscricao?error=" +
        encodeURIComponent("Preencha nome, e-mail e o curso pretendido.")
    );
  }

  const precoCentavos = precoMatriculaCentavos(curso_pretendido);
  const admin = createAdminClient();

  const { data: inscricao, error } = await admin
    .from("ead_inscricoes")
    .insert({
      nome_completo,
      cpf: cpf || null,
      email,
      telefone: telefone || null,
      campo_ministerio_id: campo_ministerio_id || null,
      curso_pretendido,
      mensagem: mensagem || null,
      status: precoCentavos > 0 ? "AGUARDANDO_PAGAMENTO" : "PENDENTE",
      preco_matricula_centavos: precoCentavos,
    })
    .select("id")
    .single();

  if (error || !inscricao) {
    redirect(
      "/inscricao?error=" +
        encodeURIComponent("Não foi possível enviar sua inscrição. Tente novamente.")
    );
  }

  if (precoCentavos === 0) {
    // Sem cobrança: matrícula é habilitada na hora, sem passar pela
    // fila da secretaria (decisão do CETADP de 16/07/2026).
    const resultado = await matricularAlunoEmCurso(admin, {
      cursoPretendido: curso_pretendido,
      nomeCompleto: nome_completo,
      cpf,
      email,
      telefone,
      campoMinisterioId: campo_ministerio_id,
      origem: "INSCRICAO_PUBLICA",
    });

    if (!resultado.ok) {
      redirect("/inscricao?error=" + encodeURIComponent(resultado.erro));
    }

    await admin
      .from("ead_inscricoes")
      .update({
        status: "APROVADA",
        aluno_id: resultado.alunoId,
        matricula_gerada: resultado.matricula,
        analisado_em: new Date().toISOString(),
      })
      .eq("id", inscricao!.id);

    redirect("/inscricao/obrigado?matricula=" + encodeURIComponent(resultado.matricula));
  }

  let preferencia;
  try {
    preferencia = await criarPreferenciaCheckout({
      orderId: inscricao!.id,
      itens: [
        {
          titulo: `Matrícula — ${labelCurso(curso_pretendido)}`,
          quantidade: 1,
          precoUnitarioCentavos: precoCentavos,
        },
      ],
      emailComprador: email,
      backUrlPath: "/inscricao/pagamento",
    });
  } catch (e) {
    console.error("[inscricao] Falha ao criar preferência no Mercado Pago:", e);
    redirect(
      `/inscricao/pagamento/${inscricao!.id}?error=` +
        encodeURIComponent("Erro ao iniciar o pagamento. Tente novamente.")
    );
  }

  await admin
    .from("ead_inscricoes")
    .update({ mercadopago_preference_id: preferencia!.id })
    .eq("id", inscricao!.id);

  redirect(preferencia!.sandbox_init_point || preferencia!.init_point);
}
