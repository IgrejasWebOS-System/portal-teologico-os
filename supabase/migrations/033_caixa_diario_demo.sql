-- 033_caixa_diario_demo.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 032 — demonstração aproximada,
-- não é garantido bater 1:1 com o que rodou originalmente em produção).
-- Abre o Caixa Diário de hoje com lançamentos de exemplo (matrícula em
-- dinheiro, venda avulsa, sangria). Idempotente: só roda se ainda não
-- houver nenhum caixa diário aberto.

DO $$
DECLARE
  v_caixa_id uuid;
  v_cat_matricula uuid;
  v_cat_venda uuid;
  v_cat_sangria uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.fin_caixa_diario) THEN
    RETURN;
  END IF;

  SELECT id INTO v_cat_matricula FROM public.fin_categorias WHERE nome ILIKE '%matr%cula%' AND tipo = 'RECEITA' LIMIT 1;
  SELECT id INTO v_cat_venda FROM public.fin_categorias WHERE nome ILIKE '%venda%' AND tipo = 'RECEITA' LIMIT 1;
  SELECT id INTO v_cat_sangria FROM public.fin_categorias WHERE nome ILIKE '%sangria%' LIMIT 1;

  INSERT INTO public.fin_caixa_diario (id, data, status, saldo_inicial_centavos, aberto_em)
  VALUES (gen_random_uuid(), CURRENT_DATE, 'ABERTO', 20000, now())
  RETURNING id INTO v_caixa_id;

  INSERT INTO public.fin_lancamentos (caixa_diario_id, categoria_id, tipo, valor_centavos, descricao, forma_pagamento)
  VALUES
    (v_caixa_id, v_cat_matricula, 'ENTRADA', 2500, 'Matrícula em dinheiro — demonstração', 'DINHEIRO'),
    (v_caixa_id, v_cat_venda, 'ENTRADA', 4500, 'Venda avulsa na Loja — demonstração', 'DINHEIRO'),
    (v_caixa_id, v_cat_sangria, 'SAIDA', 10000, 'Sangria para depósito bancário — demonstração', 'DINHEIRO');
END $$;
