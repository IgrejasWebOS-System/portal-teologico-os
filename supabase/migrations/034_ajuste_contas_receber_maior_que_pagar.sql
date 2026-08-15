-- 034_ajuste_contas_receber_maior_que_pagar.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 032/033 — demonstração
-- aproximada). Adiciona um recebível de demonstração pra o total de
-- Contas a Receber ficar maior que o de Contas a Pagar no dashboard.
-- Idempotente via descrição distinta.

INSERT INTO public.fin_contas_receber (
  origem_tipo, responsavel_pagamento, descricao, numero_parcela, total_parcelas,
  valor_bruto_centavos, forma_pagamento_prevista, data_vencimento, status
)
SELECT 'OUTRO', 'IGREJA', 'Recebível consolidado — demonstração (ajuste 034)', 1, 1,
  800000, 'TRANSFERENCIA', (CURRENT_DATE + interval '25 days')::date, 'PENDENTE'
WHERE NOT EXISTS (
  SELECT 1 FROM public.fin_contas_receber WHERE descricao = 'Recebível consolidado — demonstração (ajuste 034)'
);
