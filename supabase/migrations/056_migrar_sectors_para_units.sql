-- ============================================================
-- M3 — Migrar sectors existentes para units (tipo SETOR)
--
-- Não precisa saber a lista de setores de antemão: o INSERT...SELECT
-- lê a tabela sectors direto e cria 1 unit tipo SETOR pra cada linha
-- que ainda não tenha uma unit correspondente (via legacy_sector_id).
-- Idempotente — pode rodar de novo sem duplicar.
--
-- sectors.unit_id é uma coluna-ponte: liga o setor legado à nova
-- unit, sem quebrar nada que já lê "sectors" hoje. Nenhuma query
-- existente da aplicação é afetada por este módulo.
-- ============================================================

ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id);
CREATE INDEX IF NOT EXISTS idx_sectors_unit_id ON public.sectors USING btree (unit_id);

DO $$
DECLARE
  v_sede_id uuid;
BEGIN
  SELECT id INTO v_sede_id
  FROM public.units
  WHERE type = 'SEDE' AND name = 'Sede Piracicaba — AD Piracicaba Congregação Central';

  IF v_sede_id IS NULL THEN
    RAISE EXCEPTION 'Sede Piracicaba não encontrada em units — rode o M2 (055) antes deste.';
  END IF;

  -- Cria 1 unit SETOR pra cada sector ainda não migrado
  INSERT INTO public.units (type, name, parent_id, legacy_sector_id)
  SELECT 'SETOR', s.name, v_sede_id, s.id
  FROM public.sectors s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.legacy_sector_id = s.id
  );

  -- Liga sectors.unit_id de volta pra unit recém-criada (ou já existente)
  UPDATE public.sectors s
  SET unit_id = u.id
  FROM public.units u
  WHERE u.legacy_sector_id = s.id
    AND s.unit_id IS DISTINCT FROM u.id;
END $$;
