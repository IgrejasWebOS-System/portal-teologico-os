-- 046_contas_receber_mercadopago.sql
-- Permite gerar, na Matrícula Direta, uma cobrança única via Mercado
-- Pago (Checkout Pro) em vez do parcelamento manual — mesmo padrão já
-- usado na Loja. A linha nasce PENDENTE em fin_contas_receber e o
-- webhook (/api/webhooks/mercadopago) marca PAGO quando aprovado.

alter table fin_contas_receber
  add column if not exists mercadopago_preference_id text;
