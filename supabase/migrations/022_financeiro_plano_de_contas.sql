-- Plano de contas do módulo financeiro (Fase pedida em 15/07/2026):
-- categorias hierárquicas de receita/despesa, usadas nos lançamentos
-- do caixa diário (migration seguinte) e, futuramente, no
-- patrimônio/inventário (depreciação lançada como despesa).

CREATE TABLE public.fin_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
  categoria_pai_id uuid REFERENCES public.fin_categorias(id) ON DELETE SET NULL,
  codigo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fin_categorias_tipo_idx ON public.fin_categorias(tipo);
CREATE INDEX fin_categorias_pai_idx ON public.fin_categorias(categoria_pai_id);

CREATE TRIGGER fin_categorias_updated_at
  BEFORE UPDATE ON public.fin_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.fin_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_categorias_staff ON public.fin_categorias
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- Seed inicial (editável depois pela secretaria)
INSERT INTO public.fin_categorias (nome, tipo, codigo) VALUES
  ('Matrículas', 'RECEITA', '1.1'),
  ('Mensalidades', 'RECEITA', '1.2'),
  ('Vendas — Loja', 'RECEITA', '1.3'),
  ('Doações', 'RECEITA', '1.4'),
  ('Outras receitas', 'RECEITA', '1.9'),
  ('Salários e encargos', 'DESPESA', '2.1'),
  ('Material didático', 'DESPESA', '2.2'),
  ('Aluguel e condomínio', 'DESPESA', '2.3'),
  ('Água, luz e internet', 'DESPESA', '2.4'),
  ('Manutenção e limpeza', 'DESPESA', '2.5'),
  ('Serviços de terceiros', 'DESPESA', '2.6'),
  ('Outras despesas', 'DESPESA', '2.9');
