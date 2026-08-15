-- 037_estoque_movimentacoes_produtos.sql
-- RECONSTRUÍDA em 15/08/2026 (aplicada em produção, nunca versionada —
-- ver nota no início da 030). Schema abaixo é reconstrução EXATA por
-- introspecção do banco de produção (information_schema + pg_constraint
-- + pg_policies + pg_indexes).
-- Tabela `product_stock_movements` — histórico de entradas/saídas/
-- ajustes de estoque dos produtos da Loja, com baixa automática nas
-- vendas pagas via webhook.

CREATE TABLE IF NOT EXISTS public.product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA','AJUSTE')),
  quantidade integer NOT NULL,
  estoque_resultante integer,
  motivo text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_stock_movements_product_idx ON public.product_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS product_stock_movements_order_idx ON public.product_stock_movements (order_id);

ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_stock_movements_staff ON public.product_stock_movements;
CREATE POLICY product_stock_movements_staff ON public.product_stock_movements
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  );
