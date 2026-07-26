-- ============================================================
-- M12a — churches ganha e-mail (não existia — só telefone/endereço/pastor)
-- Necessário pro cadastro de Campo/Sede capturar contato completo.
-- ============================================================

ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS email text;
