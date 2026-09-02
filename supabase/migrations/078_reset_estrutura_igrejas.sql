-- ============================================================
-- Reset da estrutura de igrejas/setores/units — confirmado pelo
-- Joaquim em 01/09/2026: churches/sectors/units eram dados de
-- teste (24/35/67 registros, alguns corretos, outros errados).
-- Apagados e reconstruídos do zero a partir de 2 PDFs oficiais
-- ("lista de igrejas - regionais.pdf" e "- setoriais.pdf").
--
-- Estrutura nova: 1 CAMPO ("Campo AD Brás Piracicaba") -> 1 SEDE
-- ("AD Brás Piracicaba — Sede") -> 38 units tipo SETOR (23
-- REGIONAL + 15 SETOR locais) -> igrejas (ver migrations
-- 079-088). O trigger validate_unit_hierarchy() exige essa cadeia
-- exata (CAMPO raiz -> SEDE -> SETOR -> IGREJA -> ...).
--
-- Só as 15 unidades SETOR locais (Piracicaba) recebem registro em
-- `sectors` — é o que os formulários de matrícula usam nos
-- dropdowns de Setor/Igreja. As 23 REGIONAL ficam só em `units`.
-- ============================================================

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS member_count integer;
DELETE FROM public.transactions;
UPDATE public.sectors SET headquarters_id = NULL, mother_church_id = NULL;
DELETE FROM public.churches;
DELETE FROM public.sectors;
DELETE FROM public.units WHERE type IN ('CELULA','SUB_CONGREGACAO','PONTO_PREGACAO');
DELETE FROM public.units WHERE type = 'IGREJA';
DELETE FROM public.units WHERE type = 'SETOR';
DELETE FROM public.units WHERE type = 'SEDE';
DELETE FROM public.units WHERE type = 'CAMPO';

INSERT INTO public.units (type, name, is_headquarters, is_sector_mother, status)
VALUES ('CAMPO', 'Campo AD Brás Piracicaba', false, false, 'ACTIVE');

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'SEDE', 'AD Brás Piracicaba — Sede', (SELECT id FROM public.units WHERE type='CAMPO'), true, false, 'ACTIVE';

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'SETOR', v.nome, (SELECT id FROM public.units WHERE type='SEDE'), false, false, 'ACTIVE'
FROM (VALUES
  ('REGIONAL 001'),('REGIONAL 002'),('REGIONAL 003'),('REGIONAL 004'),('REGIONAL 005'),
  ('REGIONAL 006'),('REGIONAL 007'),('REGIONAL 008'),('REGIONAL 009'),('REGIONAL 010'),
  ('REGIONAL 012'),('REGIONAL 013'),('REGIONAL 015'),('REGIONAL 016'),('REGIONAL 017'),
  ('REGIONAL 018'),('REGIONAL 019'),('REGIONAL 020'),('REGIONAL 021'),('REGIONAL 022'),
  ('REGIONAL 023'),('REGIONAL 025'),('REGIONAL 026'),
  ('SETOR 001'),('SETOR 002'),('SETOR 003'),('SETOR 004'),('SETOR 005'),
  ('SETOR 006'),('SETOR 007'),('SETOR 008'),('SETOR 009'),('SETOR 010'),
  ('SETOR 011'),('SETOR 012'),('SETOR 013'),('SETOR 014'),('SETOR 015')
) AS v(nome);

INSERT INTO public.sectors (name, region, unit_id)
SELECT v.nome, 'Piracicaba/SP', (SELECT id FROM public.units WHERE type='SETOR' AND name = v.nome)
FROM (VALUES
  ('SETOR 001'),('SETOR 002'),('SETOR 003'),('SETOR 004'),('SETOR 005'),
  ('SETOR 006'),('SETOR 007'),('SETOR 008'),('SETOR 009'),('SETOR 010'),
  ('SETOR 011'),('SETOR 012'),('SETOR 013'),('SETOR 014'),('SETOR 015')
) AS v(nome);

-- Admin de escopo real (não é um dos 6 masters) cujo unit_id antigo
-- (SETOR 01 - VILA REZENDE) seria apagado em cascata — remapeado
-- pro equivalente novo em vez de perder o acesso dela.
UPDATE public.admin_roles
SET unit_id = (SELECT id FROM public.units WHERE type='SETOR' AND name='SETOR 001')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'luciahelenabscoelhoam@gmail.com')
  AND level = 3;
