-- ============================================================
-- M6 — Migrar profiles.system_role para admin_roles (bridge)
--
-- 100% data-driven (lê profiles/churches/sectors/units direto —
-- não precisa que ninguém me diga quem são os usuários hoje).
-- Idempotente via NOT EXISTS. profiles.system_role NÃO é apagado
-- nem alterado — continua funcionando exatamente como hoje até o
-- M7+ trocar as policies de verdade pra usar admin_roles.
--
-- Mapeamento:
--   GLOBAL_ADMIN                              → level 0 (Super-Master), unit_id NULL
--   SECTOR_ADMIN cuja igreja é a própria Sede  → level 2 (Admin-Sede),  unit_id = unit da Sede
--   SECTOR_ADMIN cuja igreja tem setor         → level 3 (Admin-Setor), unit_id = unit do Setor
--   LOCAL_ADMIN                                → level 4 (Usuário-Local), unit_id = unit da própria igreja
--   MEMBER                                     → não é staff, não ganha linha em admin_roles
-- ============================================================

-- GLOBAL_ADMIN → Super-Master
INSERT INTO public.admin_roles (user_id, level, unit_id)
SELECT p.id, 0, NULL
FROM public.profiles p
WHERE p.system_role = 'GLOBAL_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p.id AND ar.level = 0
  );

-- SECTOR_ADMIN cuja igreja é a Sede (sector_id null) → Admin-Sede
INSERT INTO public.admin_roles (user_id, level, unit_id)
SELECT p.id, 2, c.unit_id
FROM public.profiles p
JOIN public.churches c ON c.id = p.church_id
JOIN public.units u ON u.id = c.unit_id
WHERE p.system_role = 'SECTOR_ADMIN'
  AND c.sector_id IS NULL
  AND u.type = 'SEDE'
  AND c.unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p.id AND ar.unit_id = c.unit_id
  );

-- SECTOR_ADMIN cuja igreja pertence a um setor → Admin-Setor
INSERT INTO public.admin_roles (user_id, level, unit_id)
SELECT p.id, 3, s.unit_id
FROM public.profiles p
JOIN public.churches c ON c.id = p.church_id
JOIN public.sectors s ON s.id = c.sector_id
WHERE p.system_role = 'SECTOR_ADMIN'
  AND s.unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p.id AND ar.unit_id = s.unit_id
  );

-- LOCAL_ADMIN → Usuário-Local da própria igreja
INSERT INTO public.admin_roles (user_id, level, unit_id)
SELECT p.id, 4, c.unit_id
FROM public.profiles p
JOIN public.churches c ON c.id = p.church_id
WHERE p.system_role = 'LOCAL_ADMIN'
  AND c.unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p.id AND ar.unit_id = c.unit_id
  );

-- Resumo pra conferência (aparece como resultado desta query)
SELECT level, count(*) AS quantidade FROM public.admin_roles GROUP BY level ORDER BY level;
