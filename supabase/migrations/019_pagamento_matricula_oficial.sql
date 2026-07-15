-- Cobrança real da matrícula do curso teológico oficial via Mercado
-- Pago. Decisão do CETADP (14/07/2026): a matrícula paga passa a ser
-- cobrada no ato da inscrição, antes da análise da secretaria — quem
-- aprova continua sendo a secretaria, mas só depois de o pagamento
-- estar confirmado. Cursos sem preço de matrícula definido continuam
-- no fluxo gratuito/manual de sempre (ver src/utils/cursos-ead.ts).

ALTER TABLE public.ead_inscricoes
  ADD COLUMN preco_matricula_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN mercadopago_preference_id text,
  ADD COLUMN mercadopago_payment_id text,
  ADD COLUMN pago_em timestamptz;

COMMENT ON COLUMN public.ead_inscricoes.preco_matricula_centavos IS
  'Valor cobrado da matrícula em centavos (0 = curso gratuito/manual, sem cobrança via Mercado Pago)';

-- Novos valores de status usados neste fluxo (coluna é text livre, sem
-- CHECK constraint — não precisa de ALTER de constraint):
--   AGUARDANDO_PAGAMENTO -> inscrição criada, matrícula ainda não paga
--   PAGAMENTO_RECUSADO   -> Mercado Pago recusou/cancelou o pagamento
--   PENDENTE              -> pagamento confirmado (ou curso gratuito), aguardando análise da secretaria (fluxo já existente)
