-- Ajuste de demonstração: o valor em aberto de Contas a Receber
-- estava menor que o de Contas a Pagar (R$320 vs R$5.839), o que
-- não faz sentido pra apresentar no pitch. Adiciona um recebível
-- consolidado representando as mensalidades pendentes dos demais
-- alunos ativos (6 no total; só Ricardo e Juliana têm parcela
-- individual detalhada nesta fase de demonstração).

INSERT INTO public.fin_contas_receber (
  origem_tipo, responsavel_pagamento, descricao,
  numero_parcela, total_parcelas, valor_bruto_centavos, valor_liquido_centavos,
  forma_pagamento_prevista, data_vencimento, status
)
VALUES (
  'OUTRO', 'ALUNO', 'Mensalidades pendentes — demais alunos ativos (turma 2026, consolidado)',
  1, 1, 620000, 620000,
  'PIX', (CURRENT_DATE + INTERVAL '15 days')::date, 'PENDENTE'
);
