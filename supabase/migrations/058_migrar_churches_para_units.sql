-- ============================================================
-- M4b — Migrar churches para units (IGREJA / SUB_CONGREGACAO / CELULA)
--
-- Mapeamento aplicado aos 7 registros reais de churches (decidido
-- junto com o usuário, ver chat/00-ANALISE-CONSOLIDADA.md):
--
--   • VILA REZENDE (CHURCH, Setor Vila Rezende)
--       → IGREJA, mãe do setor (is_sector_mother = true)
--   • Congregação Jardim Monumento (SUB, Setor acef337f — nenhuma
--     CHURCH cadastrada nesse setor)
--       → promovida a IGREJA, mãe do setor
--   • Congregação Nova Piracicaba (SUB, mesmo setor de Vila Rezende,
--     que já tem uma IGREJA)
--       → SUB_CONGREGACAO, filha de Vila Rezende
--   • Célula Shalom (CELL, Setor Vila Rezende)
--       → CELULA, filha de Vila Rezende
--   • Célula Vida Nova (CELL, Setor acef337f — pai legado era a
--     Sede, que não é mais um pai válido pra célula na árvore nova)
--       → CELULA, filha de Jardim Monumento
--   • Célula Betel (CELL, sector_id = Setor Piracicamirim, único
--     registro desse setor, pai legado de OUTRO setor)
--       → promovida a IGREJA, mãe do Setor Piracicamirim.
--         Sinalizado no doc de análise como possível inconsistência
--         de cadastro (sector_id pode estar errado) — não trava a
--         migração, mas vale revisar com calma depois.
--   • AD Piracicaba — Congregação Central: já é a SEDE (M2/055),
--     ignorada aqui (sector_id null).
--
-- Pré-requisito: rodar 057_expandir_unit_type.sql ANTES deste, em
-- execução separada.
-- ============================================================

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id);
CREATE INDEX IF NOT EXISTS idx_churches_unit_id ON public.churches USING btree (unit_id);

DO $$
DECLARE
  v_setor_vila_rezende  uuid;
  v_setor_acef          uuid;
  v_setor_piracicamirim uuid;
  v_igreja_vila_rezende uuid;
  v_igreja_jardim       uuid;
  v_igreja_betel        uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.units WHERE legacy_church_id = 'e985c350-e60d-4c8d-ab41-d4580cadc2c4') THEN
    RAISE NOTICE 'M4b já aplicado — nada a fazer.';
    RETURN;
  END IF;

  SELECT unit_id INTO v_setor_vila_rezende  FROM public.sectors WHERE id = 'e8eaaacf-75a3-40ec-845c-ada66797eaeb';
  SELECT unit_id INTO v_setor_acef          FROM public.sectors WHERE id = 'acef337f-a54f-4f25-a220-ada1c013729d';
  SELECT unit_id INTO v_setor_piracicamirim FROM public.sectors WHERE id = '8da01130-f7f9-4af6-af99-bdf0da88608e';

  IF v_setor_vila_rezende IS NULL OR v_setor_acef IS NULL OR v_setor_piracicamirim IS NULL THEN
    RAISE EXCEPTION 'sectors.unit_id não preenchido para algum dos 3 setores — rode o M3 (056) antes deste.';
  END IF;

  -- IGREJA: Vila Rezende, mãe do setor
  INSERT INTO public.units (type, name, parent_id, is_sector_mother, legacy_church_id)
  VALUES ('IGREJA', 'VILA REZENDE', v_setor_vila_rezende, true, 'e985c350-e60d-4c8d-ab41-d4580cadc2c4')
  RETURNING id INTO v_igreja_vila_rezende;

  -- IGREJA: Jardim Monumento (promovida de SUB), mãe do Setor acef337f
  INSERT INTO public.units (type, name, parent_id, is_sector_mother, legacy_church_id)
  VALUES ('IGREJA', 'Congregação Jardim Monumento', v_setor_acef, true, 'a1000000-0000-4000-8000-000000000001')
  RETURNING id INTO v_igreja_jardim;

  -- IGREJA: Célula Betel (promovida — único nó do Setor Piracicamirim)
  INSERT INTO public.units (type, name, parent_id, is_sector_mother, legacy_church_id)
  VALUES ('IGREJA', 'Célula Betel — Piracicamirim', v_setor_piracicamirim, true, 'a2000000-0000-4000-8000-000000000003')
  RETURNING id INTO v_igreja_betel;

  -- SUB_CONGREGACAO: Nova Piracicaba, filha de Vila Rezende
  INSERT INTO public.units (type, name, parent_id, legacy_church_id)
  VALUES ('SUB_CONGREGACAO', 'Congregação Nova Piracicaba', v_igreja_vila_rezende, 'a1000000-0000-4000-8000-000000000002');

  -- CELULA: Shalom, filha de Vila Rezende
  INSERT INTO public.units (type, name, parent_id, legacy_church_id)
  VALUES ('CELULA', 'Célula Shalom — Vila Rezende', v_igreja_vila_rezende, 'a2000000-0000-4000-8000-000000000002');

  -- CELULA: Vida Nova, filha de Jardim Monumento (reatribuída)
  INSERT INTO public.units (type, name, parent_id, legacy_church_id)
  VALUES ('CELULA', 'Célula Vida Nova — Bairro Areião', v_igreja_jardim, 'a2000000-0000-4000-8000-000000000001');

  -- Bridge: liga cada churches.unit_id à unit correspondente
  UPDATE public.churches SET unit_id = v_igreja_vila_rezende WHERE id = 'e985c350-e60d-4c8d-ab41-d4580cadc2c4';
  UPDATE public.churches SET unit_id = v_igreja_jardim       WHERE id = 'a1000000-0000-4000-8000-000000000001';
  UPDATE public.churches SET unit_id = v_igreja_betel        WHERE id = 'a2000000-0000-4000-8000-000000000003';
  UPDATE public.churches SET unit_id = (SELECT id FROM public.units WHERE legacy_church_id = 'a1000000-0000-4000-8000-000000000002') WHERE id = 'a1000000-0000-4000-8000-000000000002';
  UPDATE public.churches SET unit_id = (SELECT id FROM public.units WHERE legacy_church_id = 'a2000000-0000-4000-8000-000000000002') WHERE id = 'a2000000-0000-4000-8000-000000000002';
  UPDATE public.churches SET unit_id = (SELECT id FROM public.units WHERE legacy_church_id = 'a2000000-0000-4000-8000-000000000001') WHERE id = 'a2000000-0000-4000-8000-000000000001';

  -- A Sede (criada no M2) também ganha o bridge, pra ficar completo
  UPDATE public.churches SET unit_id = (SELECT id FROM public.units WHERE legacy_church_id = '9f93958a-f7a5-4a8d-a388-92e93e7dc385')
  WHERE id = '9f93958a-f7a5-4a8d-a388-92e93e7dc385';

  -- Mantém o dado legado coerente: sinaliza is_sector_head nas 3 igrejas-mãe
  UPDATE public.churches SET is_sector_head = true
  WHERE id IN (
    'e985c350-e60d-4c8d-ab41-d4580cadc2c4',
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000003'
  );
END $$;
