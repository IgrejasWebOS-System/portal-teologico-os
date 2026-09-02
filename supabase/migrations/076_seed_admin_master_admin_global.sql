-- ============================================================
-- 6º admin master: admin@cetadp.teo.br (conta já existia em
-- auth.users, criada em 01/09/2026 — só faltava o nível 0 em
-- admin_roles). Mesmo padrão idempotente de 075_seed_admin_master.sql.
-- ============================================================

INSERT INTO public.admin_roles (user_id, level, unit_id, role_title)
VALUES ('6c80478d-215c-4a82-ae59-8a0dd23a1ee6', 0, NULL, 'Super-Master')
ON CONFLICT (user_id) WHERE level = 0 DO NOTHING;
