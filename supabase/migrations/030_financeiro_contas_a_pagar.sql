-- Contas a pagar: despesas com fornecedor/prestador e data de
-- vencimento (aluguel, água/luz, professores, material didático,
-- serviços de terceiros etc.), espelhando a estrutura de
-- fin_contas_receber. Baixa em dinheiro gera lançamento SAIDA
-- vinculado no Caixa Diário; outras formas só registram a baixa
-- aqui mesmo (pagamento por transferência/pix/boleto direto do
-- banco da instituição, fora do caixa físico).

CREATE TABLE public.fin_contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  categoria_id uuid REFERENCES public.fin_categorias(id) ON DELETE SET NULL,
  fornecedor text NOT NULL,
  descricao text NOT NULL,

  numero_parcela integer NOT NULL DEFAULT 1,
  total_parcelas integer NOT NULL DEFAULT 1,

  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),

  forma_pagamento_prevista text NOT NULL DEFAULT 'TRANSFERENCIA'
    CHECK (forma_pagamento_prevista IN ('DINHEIRO', 'PIX', 'CARTAO', 'BOLETO', 'TRANSFERENCIA')),

  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO')),

  pago_em timestamptz,
  baixado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fin_lancamento_id uuid REFERENCES public.fin_lancamentos(id) ON DELETE SET NULL,

  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fin_contas_pagar_status_idx ON public.fin_contas_pagar(status);
CREATE INDEX fin_contas_pagar_vencimento_idx ON public.fin_contas_pagar(data_vencimento);
CREATE INDEX fin_contas_pagar_categoria_idx ON public.fin_contas_pagar(categoria_id);

CREATE TRIGGER fin_contas_pagar_updated_at
  BEFORE UPDATE ON public.fin_contas_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.fin_contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_contas_pagar_staff ON public.fin_contas_pagar
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- Dados de demonstração: mix de pendente/atrasado/pago para o pitch.
INSERT INTO public.fin_contas_pagar (categoria_id, fornecedor, descricao, valor_centavos, forma_pagamento_prevista, data_vencimento, status, pago_em)
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.3'), 'Imobiliária Piracicaba Ltda', 'Aluguel do prédio sede — julho/2026', 350000, 'TRANSFERENCIA', (CURRENT_DATE - INTERVAL '3 days')::date, 'ATRASADO', NULL::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.4'), 'CPFL Energia', 'Conta de luz — julho/2026', 48000, 'BOLETO', (CURRENT_DATE + INTERVAL '5 days')::date, 'PENDENTE', NULL::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.4'), 'SABESP', 'Conta de água — julho/2026', 21000, 'BOLETO', (CURRENT_DATE + INTERVAL '5 days')::date, 'PENDENTE', NULL::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.4'), 'Vivo Fibra', 'Internet — julho/2026', 15900, 'BOLETO', (CURRENT_DATE + INTERVAL '10 days')::date, 'PENDENTE', NULL::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.1'), 'Pr. Ezequiel Torres', 'Hora-aula — Teologia Sistemática (junho/2026)', 120000, 'TRANSFERENCIA', (CURRENT_DATE - INTERVAL '15 days')::date, 'PAGO', (CURRENT_DATE - INTERVAL '15 days')::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.1'), 'Pra. Miriam Castro', 'Hora-aula — Hermenêutica Bíblica (junho/2026)', 96000, 'TRANSFERENCIA', (CURRENT_DATE - INTERVAL '15 days')::date, 'PAGO', (CURRENT_DATE - INTERVAL '15 days')::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.2'), 'Gráfica Universo', 'Apostilas — Curso Teológico Básico (turma 2026)', 84000, 'PIX', (CURRENT_DATE + INTERVAL '7 days')::date, 'PENDENTE', NULL::timestamptz
UNION ALL
SELECT (SELECT id FROM public.fin_categorias WHERE codigo = '2.6'), 'Contabilidade Fernandes ME', 'Honorários contábeis — julho/2026', 65000, 'BOLETO', (CURRENT_DATE + INTERVAL '12 days')::date, 'PENDENTE', NULL::timestamptz;
