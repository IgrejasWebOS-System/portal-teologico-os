-- ============================================================
-- Seed dos 5 admins master (level 0, Super-Master) do CETADP.
-- Idempotente: ON CONFLICT usando o índice parcial que já garante
-- no máximo 1 linha level=0 por user_id (ver 059_admin_roles_e_escopo.sql).
--
-- Verificado em produção (toduvwtzklntyptcodkf) antes de aplicar:
--   marcelo@cetadp.teo.br, cetadp@cetadp.teo.br, pandolfo@cetadp.teo.br
--   já tinham level=0. Faltavam josias@cetadp.teo.br e
--   joaquim@cetadp.teo.br (o e-mail @cetadp.teo.br — a conta pessoal
--   joaquimmscoelhoam@gmail.com já era Super-Master à parte).
-- ============================================================

INSERT INTO public.admin_roles (user_id, level, unit_id, role_title)
VALUES
  ('2863f041-5445-445a-87f7-52d6e0095540', 0, NULL, 'Super-Master'), -- cetadp@cetadp.teo.br
  ('2ace841a-e8e2-4ac0-8730-a6e5d6957d61', 0, NULL, 'Super-Master'), -- marcelo@cetadp.teo.br
  ('3b079167-cfb4-4a71-91ad-6ac7b2341c0b', 0, NULL, 'Super-Master'), -- pandolfo@cetadp.teo.br
  ('b5db16a6-388d-43d6-be54-e3bc890f0d8a', 0, NULL, 'Super-Master'), -- josias@cetadp.teo.br
  ('7f400120-5195-448b-941c-52a5a34cba84', 0, NULL, 'Super-Master')  -- joaquim@cetadp.teo.br
ON CONFLICT (user_id) WHERE level = 0 DO NOTHING;
