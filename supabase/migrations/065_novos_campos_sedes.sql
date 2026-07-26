-- ============================================================
-- M11 — Novos Campos do Ministério Madureira (fora de Piracicaba)
--
-- Cada Campo é uma raiz própria na árvore units, isolada das
-- demais (é exatamente o que get_accessible_unit_ids() e as RLS
-- escopadas do M7.1/M10 já garantem — um professor/setor/igreja
-- de Caruaru nunca aparece pra quem só administra Piracicaba, e
-- vice-versa).
--
-- Sede sem nome próprio (confirmado com o usuário — "a Sede" é só
-- a igreja principal daquele campo, sem apelido especial). Sem
-- churches vinculada ainda (esses campos não têm dados em
-- churches/sectors/members nesta base — só a estrutura Campo+Sede
-- por enquanto; Setores/Igrejas de cada um entram depois, módulo a
-- módulo, quando houver dado real).
--
-- Idempotente via NOT EXISTS por nome do Campo.
-- ============================================================

DO $$
DECLARE
  v_campo_id uuid;
BEGIN
  -- Campo Caruaru - PE
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE type = 'CAMPO' AND name = 'Campo Caruaru - PE') THEN
    INSERT INTO public.units (type, name) VALUES ('CAMPO', 'Campo Caruaru - PE') RETURNING id INTO v_campo_id;
    INSERT INTO public.units (type, name, parent_id, is_headquarters) VALUES ('SEDE', 'Sede Caruaru', v_campo_id, true);
  END IF;

  -- Campo Centenário do Sul - PR
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE type = 'CAMPO' AND name = 'Campo Centenário do Sul - PR') THEN
    INSERT INTO public.units (type, name) VALUES ('CAMPO', 'Campo Centenário do Sul - PR') RETURNING id INTO v_campo_id;
    INSERT INTO public.units (type, name, parent_id, is_headquarters) VALUES ('SEDE', 'Sede Centenário do Sul', v_campo_id, true);
  END IF;

  -- Campo Nova Andradina - MS
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE type = 'CAMPO' AND name = 'Campo Nova Andradina - MS') THEN
    INSERT INTO public.units (type, name) VALUES ('CAMPO', 'Campo Nova Andradina - MS') RETURNING id INTO v_campo_id;
    INSERT INTO public.units (type, name, parent_id, is_headquarters) VALUES ('SEDE', 'Sede Nova Andradina', v_campo_id, true);
  END IF;

  -- Campo Pau da Lima (Salvador) - BA
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE type = 'CAMPO' AND name = 'Campo Pau da Lima (Salvador) - BA') THEN
    INSERT INTO public.units (type, name) VALUES ('CAMPO', 'Campo Pau da Lima (Salvador) - BA') RETURNING id INTO v_campo_id;
    INSERT INTO public.units (type, name, parent_id, is_headquarters) VALUES ('SEDE', 'Sede Pau da Lima', v_campo_id, true);
  END IF;
END $$;

-- Conferência: deve trazer 5 CAMPOs (Piracicaba + os 4 novos) e 5 SEDEs.
SELECT type, name FROM public.units WHERE type IN ('CAMPO', 'SEDE') ORDER BY type, name;
