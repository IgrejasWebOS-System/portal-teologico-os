"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { labelCurso, precoMatriculaCentavos } from "@/utils/cursos-ead";
import { redirect } from "next/navigation";

// ============================================================
// Inscrição pública no Portal EAD do CETADP
// Não exige login (RLS permite INSERT para "anon", mas usamos o
// cliente admin aqui para poder também gerar a cobrança da matrícula
// sem depender de política extra de UPDATE para "anon").
//
// Dois caminhos a partir daqui (decisão do CETADP, 14/07/2026):
// - Curso SEM preço de matrícula definido (a maioria hoje): segue
//   igual a sempre — status PENDENTE, aguarda análise da secretaria.
// - Curso COM preço de matrícula (ex: Teologia Básico, R$25):
//   status AGUARDANDO_PAGAMENTO e redireciona para o Checkout Pro do
//   Mercado Pago. Só quando o webhook confirmar o pagamento é que a
//   inscrição vira PENDENTE e entra na fila da secretaria — a
//   aprovação continua 100% manual, só que agora depois do pagamento.
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
    redirect("/inscricao/obrigado");
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
  } catch {
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
