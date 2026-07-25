-- ============================================================
-- M2 — Seed dos nós raiz: Campo Piracicaba + Sede
--
-- Sede = "AD Piracicaba — Congregação Central" (id 9f93958a-f7a5-
-- 4a8d-a388-92e93e7dc385), a única igreja com sector_id null hoje —
-- é a igreja própria do Campo, confirmado com o usuário.
--
-- Idempotente: se "Campo Piracicaba" já existir em units, não faz
-- nada (seguro rodar de novo por engano).
-- ============================================================

DO $$
DECLARE
  v_campo_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.units WHERE type = 'CAMPO' AND name = 'Campo Piracicaba') THEN
    RAISE NOTICE 'Campo Piracicaba já existe em units — nada a fazer.';
    RETURN;
  END IF;

  INSERT INTO public.units (type, name, is_headquarters)
  VALUES ('CAMPO', 'Campo Piracicaba', false)
  RETURNING id INTO v_campo_id;

  INSERT INTO public.units (type, name, parent_id, is_headquarters, legacy_church_id)
  VALUES (
    'SEDE',
    'Sede Piracicaba — AD Piracicaba Congregação Central',
    v_campo_id,
    true,
    '9f93958a-f7a5-4a8d-a388-92e93e7dc385'
  );
END $$;
