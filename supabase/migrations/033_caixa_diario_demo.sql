-- Caixa diário de demonstração: abre o caixa de hoje com saldo
-- inicial (troco) e alguns lançamentos típicos — matrícula paga em
-- dinheiro na secretaria, venda de material na hora e uma sangria
-- (depósito bancário) — para o "Caixa do dia" não aparecer zerado
-- na demonstração.

DO $$
DECLARE
  v_caixa_id uuid;
  v_cat_matriculas uuid;
  v_cat_vendas uuid;
  v_cat_sangria uuid;
BEGIN
  SELECT id INTO v_cat_matriculas FROM public.fin_categorias WHERE codigo = '1.1';
  SELECT id INTO v_cat_vendas     FROM public.fin_categorias WHERE codigo = '1.3';
  SELECT id INTO v_cat_sangria    FROM public.fin_categorias WHERE codigo = 'SANGRIA';

  INSERT INTO public.fin_caixa_diario (data, status, saldo_inicial_centavos)
  VALUES (CURRENT_DATE, 'ABERTO', 20000)
  ON CONFLICT (data) DO NOTHING
  RETURNING id INTO v_caixa_id;

  IF v_caixa_id IS NULL THEN
    SELECT id INTO v_caixa_id FROM public.fin_caixa_diario WHERE data = CURRENT_DATE;
  END IF;

  INSERT INTO public.fin_lancamentos (caixa_diario_id, categoria_id, tipo, valor_centavos, descricao, forma_pagamento)
  VALUES
    (v_caixa_id, v_cat_matriculas, 'ENTRADA', 25000, 'Matrícula presencial — Curso Teológico Básico (dinheiro)', 'DINHEIRO'),
    (v_caixa_id, v_cat_vendas, 'ENTRADA', 8000, 'Venda de apostila avulsa na secretaria', 'DINHEIRO'),
    (v_caixa_id, v_cat_sangria, 'SAIDA', 20000, 'Sangria — depósito bancário no fim da manhã', 'DINHEIRO');
END $$;
