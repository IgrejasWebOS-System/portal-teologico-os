-- ============================================================
-- Separa "CARTAO" (genérico) em DEBITO e CREDITO em
-- fin_contas_receber.forma_pagamento_prevista — pedido do Joaquim
-- (20/09/2026), para a tela de conferência de mensalidades do mutirão
-- de cadastro do aluno (aluno escolhe forma de pagamento parcela a
-- parcela ao completar a ficha em /completar-cadastro).
--
-- Confirmado por consulta direta (staging, 20/09/2026): zero linhas
-- usavam 'CARTAO' até este momento — só dados de teste, sem nenhum
-- registro real, então a troca é limpa (sem UPDATE de dados existentes
-- necessário). Aplicado em staging via MCP em 20/09/2026 — rodar
-- manualmente em produção antes do merge que depende disso.
--
-- Só afeta fin_contas_receber (mensalidade/matrícula do aluno) — NÃO
-- mexe em fin_contas_a_pagar nem em fin_caixa_diario/fin_lancamentos,
-- que são fluxos financeiros à parte (fornecedor e caixa físico da
-- secretaria) e continuam com "CARTAO" genérico até serem revistos
-- separadamente, se um dia for pedido.
-- ============================================================

alter table fin_contas_receber
  drop constraint fin_contas_receber_forma_pagamento_prevista_check;

alter table fin_contas_receber
  add constraint fin_contas_receber_forma_pagamento_prevista_check
  check (forma_pagamento_prevista in ('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'BOLETO', 'TRANSFERENCIA'));
