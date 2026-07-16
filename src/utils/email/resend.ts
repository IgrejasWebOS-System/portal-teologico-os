// ============================================================
// enviarEmail — envio transacional via Resend (raw fetch, sem SDK,
// mesmo padrão usado no cliente do Mercado Pago — ver
// src/utils/mercadopago/client.ts).
//
// Requer RESEND_API_KEY no .env.local (conta grátis em
// https://resend.com). Sem a chave configurada, a função só
// registra um aviso no log e retorna false — não lança erro, para
// nunca quebrar o fluxo que chamou (ex.: o webhook do Mercado Pago
// não pode falhar por causa de e-mail).
// ============================================================

interface EnviarEmailParams {
  para: string;
  assunto: string;
  html: string;
}

export async function enviarEmail({ para, assunto, html }: EnviarEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL || "CETADP <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY não configurada — e-mail para ${para} não foi enviado.`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html }),
    });

    if (!res.ok) {
      console.error(`[email] Falha ao enviar para ${para}:`, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] Erro ao enviar para ${para}:`, e);
    return false;
  }
}

/**
 * E-mail de acompanhamento pós-compra na Loja, para quem comprou
 * (livro, apostila, curso avulso, PDF) mas ainda não é aluno
 * matriculado — convite para conhecer a formação teológica.
 */
export async function enviarConviteParaSerAluno(email: string, nome: string) {
  const primeiroNome = nome?.trim().split(" ")[0] || "";
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!";

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <p style="font-size: 16px;">${saudacao}</p>
      <p style="font-size: 15px; line-height: 1.6;">
        Obrigado por comprar na Loja do CETADP — Centro Educacional Teológico
        das Assembleias de Deus Piracicaba. Esperamos que o material seja
        útil na sua caminhada.
      </p>
      <p style="font-size: 15px; line-height: 1.6;">
        Você sabia que também pode se formar em teologia com a gente?
        Oferecemos cursos presenciais e a distância, em vários níveis, para
        quem está começando na obra e para quem busca aprofundamento
        ministerial.
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/inscricao"
           style="background: #c9973b; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 28px; border-radius: 8px; display: inline-block;">
          Conhecer os cursos e me inscrever
        </a>
      </p>
      <p style="font-size: 12px; color: #6b6b6b; margin-top: 32px;">
        CETADP · Centro Educacional Teológico das Assembleias de Deus Piracicaba
      </p>
    </div>
  `.trim();

  return enviarEmail({
    para: email,
    assunto: "Obrigado pela compra — conheça a formação teológica do CETADP",
    html,
  });
}
