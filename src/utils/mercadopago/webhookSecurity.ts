import { createHmac, timingSafeEqual } from "crypto";

// ============================================================
// Segurança do webhook do Mercado Pago (/api/webhooks/mercadopago)
//
// 1) validarAssinaturaWebhook — confere o header x-signature contra
//    o segredo configurado no painel do Mercado Pago (Developers ->
//    sua aplicação -> Webhooks -> "Assinatura secreta"). Algoritmo
//    documentado pelo Mercado Pago: HMAC-SHA256 sobre o manifest
//    "id:{data.id};request-id:{x-request-id};ts:{ts};", comparando
//    o hash calculado com o valor "v1" do header x-signature.
//    Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/webhooks
//
//    Se MERCADOPAGO_WEBHOOK_SECRET não estiver configurado ainda,
//    a validação é pulada (fail-open) para não quebrar o webhook em
//    produção antes de alguém configurar o segredo — mas fica um
//    aviso no log toda vez que isso acontece.
//
// 2) verificarRateLimit — limite básico em memória por IP. Como o
//    processo roda em funções serverless (Vercel), isto é "melhor
//    esforço": cada instância fria tem sua própria memória, então o
//    limite real pode ser um pouco maior que o configurado sob
//    tráfego distribuído entre várias instâncias. Suficiente para
//    barrar automação abusiva/scanner batendo direto no endpoint;
//    não é proteção contra um ataque distribuído sério (isso pede
//    um rate limiter com storage compartilhado, ex. Upstash/Redis).
// ============================================================

function extrairDadosAssinatura(xSignature: string): { ts: string; v1: string } | null {
  const partes = Object.fromEntries(
    xSignature.split(",").map((par) => {
      const [chave, ...resto] = par.trim().split("=");
      return [chave, resto.join("=")];
    })
  );
  if (!partes.ts || !partes.v1) return null;
  return { ts: partes.ts, v1: partes.v1 };
}

export function validarAssinaturaWebhook(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[webhook mercadopago] MERCADOPAGO_WEBHOOK_SECRET não configurado — assinatura NÃO está sendo validada. Configure o segredo no painel do Mercado Pago e na env do projeto assim que possível."
    );
    return true; // fail-open enquanto o segredo não é configurado
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const dados = extrairDadosAssinatura(xSignature);
  if (!dados) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${dados.ts};`;
  const hashCalculado = createHmac("sha256", secret).update(manifest).digest("hex");

  const bufCalculado = Buffer.from(hashCalculado, "hex");
  const bufRecebido = Buffer.from(dados.v1, "hex");
  if (bufCalculado.length !== bufRecebido.length) return false;

  return timingSafeEqual(bufCalculado, bufRecebido);
}

const JANELA_MS = 60_000; // 1 minuto
const LIMITE_POR_JANELA = 60; // 60 requisições/minuto por IP

const historicoPorIp = new Map<string, number[]>();

export function obterIpRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}

export function verificarRateLimit(ip: string): boolean {
  const agora = Date.now();
  const chamadas = (historicoPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);

  if (chamadas.length >= LIMITE_POR_JANELA) {
    historicoPorIp.set(ip, chamadas);
    return false;
  }

  chamadas.push(agora);
  historicoPorIp.set(ip, chamadas);

  // limpeza oportunista pra não crescer sem limite em memória
  if (historicoPorIp.size > 5000) {
    for (const [chaveIp, tempos] of historicoPorIp) {
      const ativos = tempos.filter((t) => agora - t < JANELA_MS);
      if (ativos.length === 0) historicoPorIp.delete(chaveIp);
      else historicoPorIp.set(chaveIp, ativos);
    }
  }

  return true;
}
