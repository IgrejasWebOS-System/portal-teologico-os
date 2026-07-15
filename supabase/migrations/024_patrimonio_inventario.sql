-- Módulo de Patrimônio/Inventário, adaptado do que já existe em
-- igrejas-web-system-os (patrimony_items/movements/depreciations),
-- removendo o que não existe neste projeto (ministry_id, unit_id,
-- party_id) e ligando ao plano de contas próprio (fin_categorias).

CREATE TABLE public.patrimony_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_tombamento text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'OUTRO'
    CHECK (categoria IN ('IMOVEL', 'MOVEL', 'EQUIPAMENTO', 'VEICULO', 'INSTRUMENTO_MUSICAL', 'INFORMATICA', 'OUTRO')),
  valor_aquisicao_centavos integer NOT NULL CHECK (valor_aquisicao_centavos >= 0),
  data_aquisicao date NOT NULL,
  fornecedor text,
  nota_fiscal text,
  vida_util_anos integer CHECK (vida_util_anos > 0),
  taxa_depreciacao_anual numeric(5,2) CHECK (taxa_depreciacao_anual >= 0 AND taxa_depreciacao_anual <= 100),
  valor_residual_centavos integer DEFAULT 0,
  localizacao text,
  responsavel_nome text,
  status text NOT NULL DEFAULT 'ATIVO'
    CHECK (status IN ('ATIVO', 'BAIXADO', 'EM_MANUTENCAO', 'TRANSFERIDO')),
  categoria_financeira_id uuid REFERENCES public.fin_categorias(id) ON DELETE SET NULL,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patrimony_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.patrimony_items(id) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('AQUISICAO', 'TRANSFERENCIA', 'BAIXA', 'MANUTENCAO', 'RETORNO_MANUTENCAO', 'REAVALIACAO')),
  data date NOT NULL,
  localizacao_anterior text,
  localizacao_nova text,
  descricao text NOT NULL,
  responsavel_nome text,
  valor_centavos integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patrimony_depreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.patrimony_items(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_depreciacao_centavos integer NOT NULL,
  valor_contabil_centavos integer NOT NULL,
  lancamento_id uuid REFERENCES public.fin_lancamentos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, ano, mes)
);

CREATE INDEX patrimony_items_categoria_idx ON public.patrimony_items(categoria);
CREATE INDEX patrimony_items_status_idx ON public.patrimony_items(status);
CREATE INDEX patrimony_movements_item_idx ON public.patrimony_movements(item_id);
CREATE INDEX patrimony_depreciations_item_idx ON public.patrimony_depreciations(item_id);

CREATE TRIGGER patrimony_items_updated_at
  BEFORE UPDATE ON public.patrimony_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sequência + função para gerar número de tombamento (mesmo padrão de
-- get_next_matricula_ead / get_next_certificado).
CREATE SEQUENCE public.tombamento_seq START 1;
REVOKE ALL ON SEQUENCE public.tombamento_seq FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_next_tombamento()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria pode cadastrar patrimônio.';
  END IF;

  proximo := nextval('tombamento_seq');
  RETURN 'TOMB-' || LPAD(proximo::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_next_tombamento() FROM anon;

-- Cálculo de valor contábil (aquisição - depreciação acumulada) e da
-- depreciação mensal padrão de um item.
CREATE OR REPLACE FUNCTION public.calcular_valor_contabil(
  p_item_id uuid,
  p_ate_data date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.patrimony_items%ROWTYPE;
  total_dep integer;
BEGIN
  SELECT * INTO item FROM public.patrimony_items WHERE id = p_item_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(valor_depreciacao_centavos), 0) INTO total_dep
  FROM public.patrimony_depreciations
  WHERE item_id = p_item_id
    AND (ano < EXTRACT(YEAR FROM p_ate_data)::int
         OR (ano = EXTRACT(YEAR FROM p_ate_data)::int
             AND mes <= EXTRACT(MONTH FROM p_ate_data)::int));

  RETURN GREATEST(COALESCE(item.valor_residual_centavos, 0), item.valor_aquisicao_centavos - total_dep);
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_depreciacao_mensal(p_item_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.patrimony_items%ROWTYPE;
  base_depreciavel integer;
BEGIN
  SELECT * INTO item FROM public.patrimony_items WHERE id = p_item_id;
  IF NOT FOUND OR item.taxa_depreciacao_anual IS NULL THEN RETURN 0; END IF;

  base_depreciavel := item.valor_aquisicao_centavos - COALESCE(item.valor_residual_centavos, 0);
  RETURN ROUND((base_depreciavel * item.taxa_depreciacao_anual / 100) / 12);
END;
$$;

-- Trigger: atualizar status/localização/valor do item ao registrar
-- uma movimentação.
CREATE OR REPLACE FUNCTION public.patrimony_movement_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo = 'BAIXA' THEN
    UPDATE public.patrimony_items SET status = 'BAIXADO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'MANUTENCAO' THEN
    UPDATE public.patrimony_items SET status = 'EM_MANUTENCAO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'RETORNO_MANUTENCAO' THEN
    UPDATE public.patrimony_items SET status = 'ATIVO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'TRANSFERENCIA' AND NEW.localizacao_nova IS NOT NULL THEN
    UPDATE public.patrimony_items
      SET localizacao = NEW.localizacao_nova, status = 'ATIVO', updated_at = now()
     WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'REAVALIACAO' AND NEW.valor_centavos IS NOT NULL THEN
    UPDATE public.patrimony_items
      SET valor_aquisicao_centavos = NEW.valor_centavos, updated_at = now()
     WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patrimony_movement
  AFTER INSERT ON public.patrimony_movements
  FOR EACH ROW EXECUTE FUNCTION patrimony_movement_trigger();

ALTER TABLE public.patrimony_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_depreciations ENABLE ROW LEVEL SECURITY;

CREATE POLICY patrimony_items_staff ON public.patrimony_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

CREATE POLICY patrimony_movements_staff ON public.patrimony_movements
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

CREATE POLICY patrimony_depreciations_staff ON public.patrimony_depreciations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));
