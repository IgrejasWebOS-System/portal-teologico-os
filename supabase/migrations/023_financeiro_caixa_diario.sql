-- Caixa diário: abertura/fechamento por dia + lançamentos de entrada
-- e saída, vinculados a uma categoria do plano de contas (022).

CREATE TABLE public.fin_caixa_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
  saldo_inicial_centavos integer NOT NULL DEFAULT 0,
  saldo_final_centavos integer,
  aberto_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_em timestamptz,
  observacoes text
);

CREATE TABLE public.fin_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_diario_id uuid NOT NULL REFERENCES public.fin_caixa_diario(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.fin_categorias(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),
  descricao text NOT NULL,
  forma_pagamento text NOT NULL DEFAULT 'DINHEIRO'
    CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO', 'TRANSFERENCIA', 'OUTRO')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fin_caixa_diario_status_idx ON public.fin_caixa_diario(status);
CREATE INDEX fin_lancamentos_caixa_idx ON public.fin_lancamentos(caixa_diario_id);
CREATE INDEX fin_lancamentos_categoria_idx ON public.fin_lancamentos(categoria_id);

ALTER TABLE public.fin_caixa_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_caixa_diario_staff ON public.fin_caixa_diario
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

CREATE POLICY fin_lancamentos_staff ON public.fin_lancamentos
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));
