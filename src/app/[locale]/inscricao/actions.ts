"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { criarPreferenciaCheckout } from "@/utils/mercadopago/client";
import { labelCurso, precoMatriculaCentavos } from "@/utils/cursos-ead";
import { matricularAlunoEmCurso } from "@/utils/ead/matricular";
// "redirect" de next/navigation é usado só para a URL externa do Mercado
// Pago (não é uma rota interna, não deve levar prefixo de idioma). Todo
// redirect para dentro do site usa "redirect" de @/i18n/navigation, que
// preserva o idioma — mesmo bug já corrigido em login/cadastro/recuperar-senha.
import { redirect } from "next/navigation";
import { redirect as localizedRedirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

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
  // getLocale() não é confiável em Server Actions — idioma vem de campo
  // oculto preenchido pela página com os parâmetros de rota.
  const localeRaw = formData.get("locale");
  const locale = hasLocale(routing.locales, localeRaw) ? localeRaw : routing.defaultLocale;
  const nome_completo    = (formData.get("nome_completo") as string)?.trim();
  const cpf              = (formData.get("cpf") as string)?.trim();
  const email            = (formData.get("email") as string)?.trim();
  const telefone         = (formData.get("telefone") as string)?.trim();
  const campo_ministerio_id = (formData.get("campo_ministerio_id") as string) || null;
  const curso_pretendido = formData.get("curso_pretendido") as string;
  const mensagem         = (formData.get("mensagem") as string)?.trim();

  if (!nome_completo || !email || !curso_pretendido) {
    localizedRedirect({
      href: "/inscricao?error=" + encodeURIComponent("Preencha nome, e-mail e o curso pretendido."),
      locale,
    });
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
    localizedRedirect({
      href:
        "/inscricao?error=" +
        encodeURIComponent("Não foi possível enviar sua inscrição. Tente novamente."),
      locale,
    });
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
      // O redirect de next-intl não é tipado como "never" (diferente do
      // redirect puro do Next), então o TypeScript não estreita a união
      // MatricularResultado sozinho depois do if — o "return" explícito
      // resolve isso sem depender de detalhe interno da lib.
      localizedRedirect({
        href: "/inscricao?error=" + encodeURIComponent(resultado.erro),
        locale,
      });
      return;
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

    localizedRedirect({
      href: "/inscricao/obrigado?matricula=" + encodeURIComponent(resultado.matricula),
      locale,
    });
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
    localizedRedirect({
      href:
        `/inscricao/pagamento/${inscricao!.id}?error=` +
        encodeURIComponent("Erro ao iniciar o pagamento. Tente novamente."),
      locale,
    });
  }

  await admin
    .from("ead_inscricoes")
    .update({ mercadopago_preference_id: preferencia!.id })
    .eq("id", inscricao!.id);

  // URL externa (Checkout Pro do Mercado Pago) — não é rota interna, usa o
  // redirect padrão do Next (sem prefixo de idioma).
  redirect(preferencia!.sandbox_init_point || preferencia!.init_point);
}
