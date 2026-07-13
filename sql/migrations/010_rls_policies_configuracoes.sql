-- ============================================================
-- Migration 010 — RLS Policies para módulo Configurações
-- Tabelas: sectors, ecclesiastical_roles, settings_professions,
--          settings_schooling, settings_civil_status, settings_gender
-- Permissão: qualquer usuário autenticado pode ler e escrever
-- ============================================================

-- ── sectors ──────────────────────────────────────────────────
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sectors_select" ON public.sectors;
DROP POLICY IF EXISTS "sectors_insert" ON public.sectors;
DROP POLICY IF EXISTS "sectors_update" ON public.sectors;
DROP POLICY IF EXISTS "sectors_delete" ON public.sectors;

CREATE POLICY "sectors_select" ON public.sectors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sectors_insert" ON public.sectors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sectors_update" ON public.sectors
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "sectors_delete" ON public.sectors
  FOR DELETE TO authenticated USING (true);

-- ── ecclesiastical_roles (Cargos) ────────────────────────────
ALTER TABLE public.ecclesiastical_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eccl_roles_select" ON public.ecclesiastical_roles;
DROP POLICY IF EXISTS "eccl_roles_insert" ON public.ecclesiastical_roles;
DROP POLICY IF EXISTS "eccl_roles_update" ON public.ecclesiastical_roles;
DROP POLICY IF EXISTS "eccl_roles_delete" ON public.ecclesiastical_roles;

CREATE POLICY "eccl_roles_select" ON public.ecclesiastical_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eccl_roles_insert" ON public.ecclesiastical_roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "eccl_roles_update" ON public.ecclesiastical_roles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "eccl_roles_delete" ON public.ecclesiastical_roles
  FOR DELETE TO authenticated USING (true);

-- ── settings_professions (Profissões) ────────────────────────
ALTER TABLE public.settings_professions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professions_select" ON public.settings_professions;
DROP POLICY IF EXISTS "professions_insert" ON public.settings_professions;
DROP POLICY IF EXISTS "professions_update" ON public.settings_professions;
DROP POLICY IF EXISTS "professions_delete" ON public.settings_professions;

CREATE POLICY "professions_select" ON public.settings_professions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "professions_insert" ON public.settings_professions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "professions_update" ON public.settings_professions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "professions_delete" ON public.settings_professions
  FOR DELETE TO authenticated USING (true);

-- ── settings_schooling (Escolaridades) ───────────────────────
ALTER TABLE public.settings_schooling ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schooling_select" ON public.settings_schooling;
DROP POLICY IF EXISTS "schooling_insert" ON public.settings_schooling;
DROP POLICY IF EXISTS "schooling_update" ON public.settings_schooling;
DROP POLICY IF EXISTS "schooling_delete" ON public.settings_schooling;

CREATE POLICY "schooling_select" ON public.settings_schooling
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "schooling_insert" ON public.settings_schooling
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "schooling_update" ON public.settings_schooling
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "schooling_delete" ON public.settings_schooling
  FOR DELETE TO authenticated USING (true);

-- ── settings_civil_status (Estado Civil) ─────────────────────
ALTER TABLE public.settings_civil_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "civil_status_select" ON public.settings_civil_status;
DROP POLICY IF EXISTS "civil_status_insert" ON public.settings_civil_status;
DROP POLICY IF EXISTS "civil_status_update" ON public.settings_civil_status;
DROP POLICY IF EXISTS "civil_status_delete" ON public.settings_civil_status;

CREATE POLICY "civil_status_select" ON public.settings_civil_status
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "civil_status_insert" ON public.settings_civil_status
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "civil_status_update" ON public.settings_civil_status
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "civil_status_delete" ON public.settings_civil_status
  FOR DELETE TO authenticated USING (true);

-- ── settings_gender (Gênero) ─────────────────────────────────
ALTER TABLE public.settings_gender ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gender_select" ON public.settings_gender;
DROP POLICY IF EXISTS "gender_insert" ON public.settings_gender;
DROP POLICY IF EXISTS "gender_update" ON public.settings_gender;
DROP POLICY IF EXISTS "gender_delete" ON public.settings_gender;

CREATE POLICY "gender_select" ON public.settings_gender
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gender_insert" ON public.settings_gender
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "gender_update" ON public.settings_gender
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "gender_delete" ON public.settings_gender
  FOR DELETE TO authenticated USING (true);
