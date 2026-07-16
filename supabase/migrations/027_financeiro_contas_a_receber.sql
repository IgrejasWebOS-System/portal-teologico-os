-- Contas a receber: parcelas de matrícula (presencial ou paga online),
-- pagas pelo próprio aluno ou por uma igreja responsável (financiamento
-- interno). Vendas online (Loja/inscrição paga) entram aqui já
-- baixadas pelo webhook do Mercado Pago, sem tocar no Caixa Diário
-- físico.

CREATE TABLE public.fin_contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  origem_tipo text NOT NULL CHECK (origem_tipo IN ('MATRICULA_DIRETA', 'INSCRICAO_EAD', 'LOJA', 'OUTRO')),
  origem_id uuid,

  aluno_id uuid REFERENCES public.ead_alunos(id) ON DELETE SET NULL,
  aluno_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  responsavel_pagamento text NOT NULL DEFAULT 'ALUNO' CHECK (responsavel_pagamento IN ('ALUNO', 'IGREJA')),
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,

  descricao text NOT NULL,
  numero_parcela integer NOT NULL DEFAULT 1,
  total_parcelas integer NOT NULL DEFAULT 1,

  valor_bruto_centavos integer NOT NULL CHECK (valor_bruto_centavos > 0),
  valor_liquido_centavos integer,
  taxa_operadora_percentual numeric(5,2),
  taxa_antecipacao_percentual numeric(5,2),

  forma_pagamento_prevista text NOT NULL DEFAULT 'DINHEIRO'
    CHECK (forma_pagamento_prevista IN ('DINHEIRO', 'PIX', 'CARTAO', 'BOLETO', 'TRANSFERENCIA')),

  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO')),

  pago_em timestamptz,
  baixado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fin_lancamento_id uuid REFERENCES public.fin_lancamentos(id) ON DELETE SET NULL,
  mercadopago_payment_id text,

  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fin_contas_receber_status_idx ON public.fin_contas_receber(status);
CREATE INDEX fin_contas_receber_vencimento_idx ON public.fin_contas_receber(data_vencimento);
CREATE INDEX fin_contas_receber_aluno_idx ON public.fin_contas_receber(aluno_id);
CREATE INDEX fin_contas_receber_church_idx ON public.fin_contas_receber(church_id);
CREATE INDEX fin_contas_receber_origem_idx ON public.fin_contas_receber(origem_tipo, origem_id);

ALTER TABLE public.fin_contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_contas_receber_staff ON public.fin_contas_receber
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- Categorias padrão usadas pelos fluxos automáticos (sangria e vendas
-- online), se ainda não existirem.
INSERT INTO public.fin_categorias (nome, tipo, codigo)
SELECT 'Sangria / Depósito Bancário', 'DESPESA', 'SANGRIA'
WHERE NOT EXISTS (SELECT 1 FROM public.fin_categorias WHERE codigo = 'SANGRIA');

INSERT INTO public.fin_categorias (nome, tipo, codigo)
SELECT 'Vendas Online (Loja/Inscrição)', 'RECEITA', 'VENDAS_ONLINE'
WHERE NOT EXISTS (SELECT 1 FROM public.fin_categorias WHERE codigo = 'VENDAS_ONLINE');
