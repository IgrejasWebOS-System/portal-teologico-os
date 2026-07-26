-- ============================================================
-- M9a — Base pro fluxo de convite (troca de senha obrigatória)
--
-- profiles.must_change_password: setado true quando um admin
-- convida outro (M9b), false por padrão pros que já existem hoje.
-- A aplicação (middleware/layout) vai checar essa flag e forçar
-- a tela de troca de senha antes de liberar o dashboard — isso
-- é código de aplicação, entra no M9b junto com a Server Action
-- de convite.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
