-- Controle de estoque da Loja com histórico de movimentações
-- (mesmo espírito do módulo de Patrimônio): toda entrada, saída ou
-- ajuste de quantidade em `products.estoque` fica registrada aqui,
-- pra auditoria. Vendas pagas geram SAIDA automática (webhook do
-- Mercado Pago); a secretaria lança ENTRADA/AJUSTE manualmente na
-- tela de Produtos.

CREATE TABLE public.product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
  quantidade integer NOT NULL,
  estoque_resultante integer,
  motivo text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_stock_movements_product_idx ON public.product_stock_movements(product_id);
CREATE INDEX product_stock_movements_order_idx ON public.product_stock_movements(order_id);

ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_stock_movements_staff ON public.product_stock_movements
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- Estoque inicial de demonstração pros produtos MATERIAL_FISICO que
-- já existem (migração 014), pra tela de Produtos não nascer zerada.
UPDATE public.products SET estoque = 25 WHERE tipo = 'MATERIAL_FISICO' AND estoque IS NULL;

INSERT INTO public.product_stock_movements (product_id, tipo, quantidade, estoque_resultante, motivo)
SELECT id, 'ENTRADA', 25, 25, 'Estoque inicial de demonstração'
FROM public.products WHERE tipo = 'MATERIAL_FISICO';
