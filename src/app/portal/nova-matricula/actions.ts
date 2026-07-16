"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { labelCurso, precoMatriculaCentavos } from "@/utils/cursos-ead";
import { matricularAlunoEmCurso } from "@/utils/ead/matricular";
import { redirect } from "next/navigation";

// ============================================================
// Auto-matrícula — aluno já logado no portal escolhe o curso e se
// matricula na hora, sem passar pela secretaria (decisão do CETADP
// de 16/07/2026). Curso gratuito: matrícula sai na hora. Curso com
// matrícula paga: vai pro Checkout Pro do Mercado Pago primeiro — a
// matrícula só é criada quando o webhook confirmar o pagamento
// (mesma rotina automática usada pela inscrição pública).
// ============================================================

export async function autoMatricularAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=" + encodeURIComponent("/portal/nova-matricula"));
  }

  const curso_pretendido = formData.get("curso_pretendido") as string;
  const cpf = (formData.get("cpf") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;

  if (!curso_pretendido || !cpf) {
    redirect(
      "/portal/nova-matricula?error=" + encodeURIComponent("Selecione o curso e informe seu CPF.")
    );
  }

  const admin = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const nomeCompleto = profile?.full_name ?? user!.email?.split("@")[0] ?? "Aluno";
  const email = user!.email!;
  const precoCentavos = precoMatriculaCentavos(curso_pretendido);

  if (precoCentavos === 0) {
    const resultado = await matricularAlunoEmCurso(admin, {
      cursoPretendido: curso_pretendido,
      nomeCompleto,
      cpf,
      email,
      telefone,
      campoMinisterioId: campo_ministerio_id,
      userIdConhecido: user!.id,
      origem: "AUTO_MATRICULA",
    });

    if (!resultado.ok) {
      redirect("/portal/nova-matricula?error=" + encodeURIComponent(resultado.erro));
    }

    redirect("/portal/nova-matricula?matricula=" + encodeURIComponent(resultado.matricula));
  }

  // Curso pago: cria a inscrição (aguardando pagamento) já vinculada a
  // este usuário e manda pro Checkout Pro — a matrícula em si só é
  // criada pelo webhook, depois do pagamento aprovado.
  const { data: inscricao, error } = await admin
    .from("ead_inscricoes")
    .insert({
      nome_completo: nomeCompleto,
      cpf,
      email,
      telefone,
      campo_ministerio_id,
      curso_pretendido,
      status: "AGUARDANDO_PAGAMENTO",
      preco_matricula_centavos: precoCentavos,
    })
    .select("id")
    .single();

  if (error || !inscricao) {
    redirect(
      "/portal/nova-matricula?error=" +
        encodeURIComponent("Não foi possível iniciar a matrícula. Tente novamente.")
    );
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
    console.error("[portal/nova-matricula] Falha ao criar preferência no Mercado Pago:", e);
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
