// ============================================================
// Cliente mínimo do Mercado Pago via fetch direto na API REST —
// evita adicionar o SDK oficial como dependência nova por enquanto
// (menos uma instalação de pacote no meio do caminho). Cobre só o
// necessário: criar preferência de checkout (Checkout Pro) e
// consultar um pagamento pelo id (usado no webhook).
//
// Usar SEMPRE no servidor — MERCADOPAGO_ACCESS_TOKEN nunca deve
// chegar ao browser.
// ============================================================

const MP_API = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado. Cole o Access Token de teste no .env.local."
    );
  }
  return token;
}

export interface ItemPreferencia {
  titulo: string;
  quantidade: number;
  precoUnitarioCentavos: number;
}

interface CriarPreferenciaParams {
  orderId: string;
  itens: ItemPreferencia[];
  emailComprador?: string;
  // Caminho base do back_url, ex: "/loja/pedido" (padrão) ou
  // "/inscricao/pagamento" — o id é sempre anexado no final.
  backUrlPath?: string;
}

interface PreferenciaResposta {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function criarPreferenciaCheckout(
  params: CriarPreferenciaParams
): Promise<PreferenciaResposta> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // auto_return só é aceito pelo Mercado Pago quando as back_urls são
  // https — em desenvolvimento local (http://localhost) ele rejeita a
  // preferência inteira se auto_return vier junto. Então só ativamos
  // o retorno automático quando o app está publicado em https.
  const usaHttps = appUrl?.startsWith("https://");

  const body = {
    items: params.itens.map((item) => ({
      title: item.titulo,
      quantity: item.quantidade,
      currency_id: "BRL",
      unit_price: Number((item.precoUnitarioCentavos / 100).toFixed(2)),
    })),
    payer: params.emailComprador ? { email: params.emailComprador } : undefined,
    external_reference: params.orderId,
    back_urls: {
      success: `${appUrl}${params.backUrlPath ?? "/loja/pedido"}/${params.orderId}`,
      pending: `${appUrl}${params.backUrlPath ?? "/loja/pedido"}/${params.orderId}`,
      failure: `${appUrl}${params.backUrlPath ?? "/loja/pedido"}/${params.orderId}`,
    },
    ...(usaHttps ? { auto_return: "approved" } : {}),
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
  };

  const resposta = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Mercado Pago recusou a preferência: ${detalhe}`);
  }

  return resposta.json();
}

// Calcula bruto/líquido/percentual de taxa a partir da resposta real do
// pagamento — usado para lançar a "conta a receber" já baixada em
// Financeiro sem precisar a secretaria digitar taxa manualmente pros
// pagamentos que vieram pelo Checkout Pro (loja + inscrição paga).
export function calcularLiquidoPagamento(pagamento: PagamentoMercadoPago) {
  const brutoCentavos = Math.round((pagamento.transaction_amount ?? 0) * 100);
  const liquidoDecimal =
    pagamento.transaction_details?.net_received_amount ??
    (pagamento.transaction_amount ?? 0) -
      (pagamento.fee_details ?? []).reduce((acc, f) => acc + (f.amount ?? 0), 0);
  const liquidoCentavos = Math.round(liquidoDecimal * 100);
  const percentualTaxa = brutoCentavos > 0 ? ((brutoCentavos - liquidoCentavos) / brutoCentavos) * 100 : 0;

  return { brutoCentavos, liquidoCentavos, percentualTaxa: Number(percentualTaxa.toFixed(2)) };
}

export interface PagamentoMercadoPago {
  id: number;
  status: "approved" | "pending" | "rejected" | "cancelled" | "refunded" | string;
  external_reference: string | null;
  transaction_amount?: number;
  fee_details?: { type: string; amount: number; fee_payer?: string }[];
  transaction_details?: { net_received_amount?: number; total_paid_amount?: number };
}

export async function buscarPagamento(paymentId: string): Promise<PagamentoMercadoPago> {
  const resposta = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Não foi possível consultar o pagamento ${paymentId}: ${detalhe}`);
  }

  return resposta.json();
}
