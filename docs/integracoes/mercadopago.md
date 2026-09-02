# Integração com Mercado Pago (Checkout Pro)

## Visão geral

O projeto usa o **Checkout Pro** do Mercado Pago (redirecionamento para uma
página de pagamento hospedada pelo Mercado Pago, não um checkout embutido).
Não há SDK oficial instalado — o cliente é um wrapper mínimo sobre a API REST
via `fetch`, pra não adicionar mais uma dependência só pra duas chamadas.

Três fluxos diferentes do sistema geram cobrança pelo Mercado Pago, todos
convergindo no mesmo webhook:

| Fluxo | Onde nasce | Tabela afetada | Action |
|---|---|---|---|
| Loja (cursos avulsos, material físico, PDFs pagos) | `/loja/carrinho` | `orders` / `order_items` | `src/app/[locale]/loja/checkout/actions.ts` |
| Inscrição EAD com matrícula paga | `/inscricao` | `ead_inscricoes` | `src/app/[locale]/inscricao/actions.ts` |
| Matrícula Direta (link gerado manualmente pela secretaria) | `/admin/matriculas/nova` | `fin_contas_receber` | `src/app/[locale]/(admin)/admin/matriculas/actions.ts` |

## Arquivos envolvidos

- **`src/utils/mercadopago/client.ts`** — wrapper da API REST. `criarPreferenciaCheckout()`
  monta a preferência de Checkout Pro (itens, `back_urls`, `notification_url`,
  `external_reference`); `buscarPagamento()` consulta um pagamento pelo id;
  `calcularLiquidoPagamento()` calcula bruto/líquido/taxa a partir da resposta
  real do pagamento (usado pra lançar em Financeiro sem digitação manual de
  percentual).
- **`src/utils/mercadopago/webhookSecurity.ts`** — validação de assinatura do
  webhook (`validarAssinaturaWebhook`) e rate limit em memória
  (`verificarRateLimit`). Sem nenhuma dependência do resto do projeto — é o
  arquivo mais fácil de levar para outro lugar.
- **`src/app/api/webhooks/mercadopago/route.ts`** — o endpoint que recebe a
  notificação, valida a assinatura, busca o pagamento de verdade na API
  (nunca confia só no payload recebido) e atualiza o registro correspondente,
  tentando nesta ordem: `orders` → `ead_inscricoes` → `fin_contas_receber`.

## Variáveis de ambiente

```
MERCADOPAGO_ACCESS_TOKEN=      # Developers -> aplicação -> Credenciais
                                # TEST- em desenvolvimento, produção real em prod
MERCADOPAGO_WEBHOOK_SECRET=    # Developers -> aplicação -> Webhooks -> "Assinatura secreta"
```

**Nunca commitar o Access Token de produção.** Ele só deve existir nas envs do
Vercel (produção) e no `.env.local` local com o valor de teste (`TEST-...`).

## Validação de assinatura do webhook

O Mercado Pago assina cada notificação com um header `x-signature` no formato
`ts=...,v1=...`. A validação (`validarAssinaturaWebhook` em
`webhookSecurity.ts`) recalcula o hash e compara:

1. Monta o manifest: `id:{data.id};request-id:{x-request-id};ts:{ts};`
2. Calcula `HMAC-SHA256(manifest, MERCADOPAGO_WEBHOOK_SECRET)`
3. Compara o hash calculado com o valor `v1` do header, usando
   `crypto.timingSafeEqual` (evita timing attack — nunca usar `===` numa
   comparação de hash).

Algoritmo documentado pelo Mercado Pago em
[developers.mercadopago.com — Webhooks, assinatura](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/webhooks).

**Comportamento fail-open:** se `MERCADOPAGO_WEBHOOK_SECRET` não estiver
configurado, a validação é pulada (loga um aviso, mas deixa passar) — decisão
deliberada pra não derrubar o webhook em produção antes de alguém configurar
o segredo. Isso significa que, sem o segredo configurado, qualquer requisição
pode se passar por uma notificação legítima do Mercado Pago. **Verificar que
`MERCADOPAGO_WEBHOOK_SECRET` está preenchido em produção é um item de
segurança real, não cosmético.**

## Rate limit

`verificarRateLimit()` limita 60 requisições/minuto por IP, guardado em
memória (`Map` no próprio processo). Como o projeto roda em funções
serverless (Vercel), isso é "melhor esforço": cada instância fria tem sua
própria memória, então sob tráfego distribuído entre várias instâncias o
limite real efetivo pode ser maior que 60/min. Suficiente para barrar
automação/scanner batendo direto no endpoint; não é proteção contra um
ataque distribuído sério — isso pediria um rate limiter com storage
compartilhado (Upstash/Redis).

## Idempotência

O webhook pode chegar mais de uma vez para o mesmo evento (o Mercado Pago
reenvia se não receber 200 a tempo). Todos os três fluxos checam o status
atual do registro antes de processar:

- `orders`: se `status === "PAGO"`, retorna `{ ok: true }` sem repetir efeitos
  colaterais (estoque, matrícula, e-mail).
- `ead_inscricoes`: se `status !== "AGUARDANDO_PAGAMENTO"`, considera já
  processado.
- `fin_contas_receber`: se `status !== "PENDENTE"`, considera já processado.

## Nunca confiar só no payload da notificação

O `route.ts` usa o `type`/`data.id` do payload (ou dos query params) só pra
saber **qual pagamento buscar** — o status real (`approved`/`rejected`/etc.)
sempre vem de uma chamada própria a `buscarPagamento()` contra a API do
Mercado Pago, nunca do corpo da notificação recebida. Isso é o que o Mercado
Pago recomenda oficialmente, e é também o que torna a validação de
assinatura "só" uma camada a mais (a principal proteção contra notificação
forjada é essa releitura via API).

## Sandbox / como testar localmente

- Use o Access Token de teste (`TEST-...`) e um comprador de teste
  (Developers → Contas de teste).
- O Mercado Pago precisa alcançar `notification_url` publicamente —
  `localhost` não funciona. Use um túnel (`ngrok http 3000`,
  `cloudflared tunnel`, etc.) e configure `NEXT_PUBLIC_APP_URL` com a URL do
  túnel enquanto testa o webhook ponta a ponta.
- Alternativa sem túnel: simular a notificação chamando
  `POST /api/webhooks/mercadopago` manualmente com um `data.id` de um
  pagamento de teste real (criado via checkout de teste), pra testar só a
  lógica de processamento sem depender do Mercado Pago encontrar seu
  localhost.

## Riscos conhecidos / pontos de atenção

- **Fail-open na assinatura** (ver seção acima) — confirmar
  `MERCADOPAGO_WEBHOOK_SECRET` configurado em produção.
- **Achado histórico não totalmente reconfirmado**: em 10/08/2026 um
  `MERCADOPAGO_ACCESS_TOKEN` com prefixo `APP_USR-` (característico de
  credencial de produção) foi encontrado num `.env.local` comentado como
  "sandbox" — foi confirmado como sandbox de fato antes do lançamento de
  21/08, mas vale reconferir se a rotina de trabalho não reintroduziu esse
  tipo de confusão depois.
- **Rate limit em memória, não distribuído** — não escala como defesa real
  contra abuso coordenado.
- **`auto_return` exige HTTPS** — em `client.ts`, a preferência só ativa
  `auto_return: "approved"` quando `NEXT_PUBLIC_APP_URL` começa com
  `https://`; em desenvolvimento local isso fica desativado de propósito
  (o Mercado Pago rejeita a preferência inteira se `auto_return` vier
  junto de uma `back_url` não-HTTPS).
