-- Loja: cursos avulsos, material físico e PDFs (download/virtual) para
-- público externo ao ministério, com checkout via Mercado Pago (sandbox).
-- Valores em centavos (integer) para evitar erro de arredondamento.

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('CURSO_AVULSO', 'MATERIAL_FISICO', 'PDF_DOWNLOAD', 'PDF_VIRTUAL')),
  titulo text NOT NULL,
  descricao text,
  preco_centavos integer NOT NULL CHECK (preco_centavos >= 0),
  estoque integer, -- null = digital/ilimitado; só relevante para MATERIAL_FISICO
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL, -- só p/ CURSO_AVULSO
  arquivo_path text, -- storage path, só p/ PDF_DOWNLOAD/PDF_VIRTUAL
  imagem_url text,
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO'
    CHECK (status IN ('AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO', 'REEMBOLSADO')),
  total_centavos integer NOT NULL CHECK (total_centavos >= 0),
  mercadopago_preference_id text,
  mercadopago_payment_id text,
  endereco_entrega jsonb, -- só quando o pedido tem item físico
  fulfillment_status text NOT NULL DEFAULT 'NAO_APLICAVEL'
    CHECK (fulfillment_status IN ('NAO_APLICAVEL', 'AGUARDANDO_ENVIO', 'ENVIADO', 'ENTREGUE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  titulo_snapshot text NOT NULL,
  preco_unitario_centavos integer NOT NULL CHECK (preco_unitario_centavos >= 0),
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_tipo_idx ON public.products(tipo);
CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX orders_mp_payment_idx ON public.orders(mercadopago_payment_id);
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX order_items_product_id_idx ON public.order_items(product_id);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- products: catálogo público (só itens ativos) + escrita só staff
CREATE POLICY products_select_active ON public.products
  FOR SELECT
  USING (status = 'ATIVO');

CREATE POLICY products_write_staff ON public.products
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- orders: cada um vê/cria só o seu; staff vê e atualiza tudo (fulfillment)
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

CREATE POLICY orders_insert_own ON public.orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_update_staff ON public.orders
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- order_items: segue a visibilidade do pedido pai
CREATE POLICY order_items_select ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
    )
  );

CREATE POLICY order_items_insert_own ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

CREATE POLICY order_items_write_staff ON public.order_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));
