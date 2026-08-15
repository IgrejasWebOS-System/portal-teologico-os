-- 030_financeiro_contas_a_pagar.sql
-- RECONSTRUÍDA em 15/08/2026: este arquivo nunca tinha sido versionado no
-- git (foi aplicado direto no SQL Editor em produção em algum momento de
-- julho/2026 — confirmado via list_migrations do Supabase, que rastreia o
-- histórico real de produção mas não tinha o .sql correspondente na pasta).
-- Schema abaixo reconstruído por introspecção 1:1 do banco de produção
-- (information_schema + pg_constraint + pg_policies + pg_indexes) — fiel.
-- O seed de despesas de demonstração no final é aproximado (mesmo espírito
-- do README: aluguel, água/luz, professores, gráfica, contabilidade), não
-- é garantido bater centavo a centavo com o que existe em produção hoje.

CREATE TABLE IF NOT EXISTS public.fin_contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES public.fin_categorias(id) ON DELETE SET NULL,
  fornecedor text NOT NULL,
  descricao text NOT NULL,
  numero_parcela integer NOT NULL DEFAULT 1,
  total_parcelas integer NOT NULL DEFAULT 1,
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),
  forma_pagamento_prevista text NOT NULL DEFAULT 'TRANSFERENCIA'
    CHECK (forma_pagamento_prevista IN ('DINHEIRO','PIX','CARTAO','BOLETO','TRANSFERENCIA')),
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
  pago_em timestamptz,
  baixado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fin_lancamento_id uuid REFERENCES public.fin_lancamentos(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_contas_pagar_categoria_idx ON public.fin_contas_pagar (categoria_id);
CREATE INDEX IF NOT EXISTS fin_contas_pagar_status_idx ON public.fin_contas_pagar (status);
CREATE INDEX IF NOT EXISTS fin_contas_pagar_vencimento_idx ON public.fin_contas_pagar (data_vencimento);

ALTER TABLE public.fin_contas_pagar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_contas_pagar_staff ON public.fin_contas_pagar;
CREATE POLICY fin_contas_pagar_staff ON public.fin_contas_pagar
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  );

-- Seed de despesas de demonstração (aproximado — só roda se a tabela
-- estiver vazia, não duplica em cima do que já existe em produção).
INSERT INTO public.fin_contas_pagar (fornecedor, descricao, valor_centavos, forma_pagamento_prevista, data_vencimento, status)
SELECT * FROM (VALUES
  ('Imobiliária Piracicaba Centro', 'Aluguel da sede — mensalidade', 350000, 'TRANSFERENCIA'::text, (CURRENT_DATE + interval '10 days')::date, 'PENDENTE'::text),
  ('CPFL Energia', 'Conta de luz — sede', 42000, 'BOLETO', (CURRENT_DATE + interval '5 days')::date, 'PENDENTE'),
  ('SEMAE Piracicaba', 'Conta de água — sede', 18000, 'BOLETO', (CURRENT_DATE + interval '5 days')::date, 'PENDENTE'),
  ('Gráfica Rápida Piracicaba', 'Impressão de material didático', 65000, 'PIX', (CURRENT_DATE + interval '15 days')::date, 'PENDENTE'),
  ('Escritório Contábil Souza', 'Honorários contábeis — mensalidade', 80000, 'TRANSFERENCIA', (CURRENT_DATE + interval '20 days')::date, 'PENDENTE')
) AS v(fornecedor, descricao, valor_centavos, forma_pagamento_prevista, data_vencimento, status)
WHERE NOT EXISTS (SELECT 1 FROM public.fin_contas_pagar);
