-- Concede nível 0 (Super-Master) a mais um e-mail (admin global),
-- mesmo padrão da 075.
--
-- Guarda de portabilidade (adicionada ao versionar este arquivo):
-- mesmo motivo da 075 — este UUID de auth.users só existe em
-- produção.

INSERT INTO public.admin_roles (user_id, level, unit_id, role_title)
SELECT '6c80478d-215c-4a82-ae59-8a0dd23a1ee6'::uuid, 0, NULL, 'Super-Master'
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = '6c80478d-215c-4a82-ae59-8a0dd23a1ee6'::uuid)
ON CONFLICT (user_id) WHERE level = 0 DO NOTHING;
