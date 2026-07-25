-- ============================================================
-- M4a — Expandir unit_type: SUB_CONGREGACAO e PONTO_PREGACAO
--
-- Pedido do usuário: dentro de uma IGREJA pode haver Sub-Congregação,
-- Ponto de Pregação e Células — como tiers distintos (não só CELULA),
-- pensando em reuso do produto por outros ministérios com estruturas
-- diferentes.
--
-- IMPORTANTE: rodar este arquivo SOZINHO (sua própria execução no SQL
-- Editor) e só depois rodar o 058. Postgres não permite usar um valor
-- de enum recém-criado na mesma transação em que foi adicionado.
-- ============================================================

ALTER TYPE unit_type ADD VALUE IF NOT EXISTS 'SUB_CONGREGACAO';
ALTER TYPE unit_type ADD VALUE IF NOT EXISTS 'PONTO_PREGACAO';

-- Regras de hierarquia atualizadas:
--   CAMPO            → raiz, sem pai
--   SEDE             → pai precisa ser CAMPO
--   SETOR            → pai precisa ser SEDE
--   IGREJA           → pai precisa ser SETOR
--   SUB_CONGREGACAO  → pai precisa ser IGREJA
--   PONTO_PREGACAO   → pai precisa ser IGREJA
--   CELULA           → pai precisa ser IGREJA, SUB_CONGREGACAO ou PONTO_PREGACAO
--                       (uma célula pode pertencer direto à igreja mãe
--                       ou a uma sub-congregação/ponto de pregação dela)
CREATE OR REPLACE FUNCTION public.validate_unit_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_type unit_type;
BEGIN
  IF NEW.type = 'CAMPO' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'CAMPO não pode ter parent_id (é sempre raiz)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL THEN
    RAISE EXCEPTION '% precisa de parent_id', NEW.type;
  END IF;

  SELECT type INTO parent_type FROM public.units WHERE id = NEW.parent_id;

  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'parent_id % não existe em units', NEW.parent_id;
  END IF;

  IF NEW.type = 'SEDE' AND parent_type <> 'CAMPO' THEN
    RAISE EXCEPTION 'SEDE só pode ter pai CAMPO (veio %)', parent_type;
  ELSIF NEW.type = 'SETOR' AND parent_type <> 'SEDE' THEN
    RAISE EXCEPTION 'SETOR só pode ter pai SEDE (veio %)', parent_type;
  ELSIF NEW.type = 'IGREJA' AND parent_type <> 'SETOR' THEN
    RAISE EXCEPTION 'IGREJA só pode ter pai SETOR (veio %)', parent_type;
  ELSIF NEW.type IN ('SUB_CONGREGACAO', 'PONTO_PREGACAO') AND parent_type <> 'IGREJA' THEN
    RAISE EXCEPTION '% só pode ter pai IGREJA (veio %)', NEW.type, parent_type;
  ELSIF NEW.type = 'CELULA' AND parent_type NOT IN ('IGREJA', 'SUB_CONGREGACAO', 'PONTO_PREGACAO') THEN
    RAISE EXCEPTION 'CELULA só pode ter pai IGREJA, SUB_CONGREGACAO ou PONTO_PREGACAO (veio %)', parent_type;
  END IF;

  RETURN NEW;
END;
$$;
