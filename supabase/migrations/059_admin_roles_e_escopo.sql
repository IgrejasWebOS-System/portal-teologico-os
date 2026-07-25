-- ============================================================
-- M5 — Tabela admin_roles (nível 0-4 + unidade) + funções de escopo
--
-- Substitui, aos poucos, o profiles.system_role fixo por um modelo
-- onde a mesma pessoa pode ter várias linhas (ex: admin de dois
-- setores, ou de um setor E de uma igreja). Não popula dados ainda
-- — isso é o M6 (migra profiles.system_role pra cá). Não altera
-- nenhuma RLS de tabela existente — isso é o M7+.
--
-- Níveis (mesmo significado do igrejas-web-system-os):
--   0 = Super-Master   → unit_id NULL, enxerga tudo
--   1 = Master/Campo   → unit_id aponta pra uma unit tipo CAMPO
--   2 = Admin-Sede      → unit_id aponta pra uma unit tipo SEDE
--   3 = Admin-Setor      → unit_id aponta pra SETOR (ou IGREJA
--                          is_sector_mother = true)
--   4 = Usuário-Local    → unit_id aponta pra IGREJA/SUB_CONGREGACAO/
--                          PONTO_PREGACAO/CELULA
--
-- role_title é só um rótulo informativo (ex: "secretário", "tesoureiro")
-- e NÃO afeta o escopo de acesso — quem decide o que a pessoa vê é
-- level + unit_id, nunca o texto do role_title.
-- ============================================================

CREATE TABLE public.admin_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level smallint NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  role_title text,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_roles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_roles_level_check CHECK (level BETWEEN 0 AND 4),
  CONSTRAINT admin_roles_level0_sem_unit CHECK (
    (level = 0 AND unit_id IS NULL) OR (level > 0 AND unit_id IS NOT NULL)
  ),
  CONSTRAINT admin_roles_user_unit_unique UNIQUE (user_id, unit_id)
);

CREATE UNIQUE INDEX admin_roles_um_super_master_por_usuario
  ON public.admin_roles (user_id) WHERE level = 0;

CREATE INDEX idx_admin_roles_user_id ON public.admin_roles USING btree (user_id);
CREATE INDEX idx_admin_roles_unit_id ON public.admin_roles USING btree (unit_id);

-- ── Funções de escopo (SECURITY DEFINER — nunca subquery direta
--    de admin_roles dentro de uma policy da própria admin_roles,
--    ver regra em AGENTS.md) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_master(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = p_user_id AND level = 0
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_min_level(p_user_id uuid DEFAULT auth.uid())
RETURNS smallint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT MIN(level) FROM public.admin_roles WHERE user_id = p_user_id;
$$;

-- Retorna todas as units acessíveis pro usuário: se for super-master,
-- todas; senão, cada unit atribuída em admin_roles + toda a subárvore
-- dela (WITH RECURSIVE descendo por parent_id).
CREATE OR REPLACE FUNCTION public.get_accessible_unit_ids(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(unit_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH RECURSIVE tree AS (
    SELECT u.id
    FROM public.units u
    WHERE u.id IN (
      SELECT ar.unit_id FROM public.admin_roles ar
      WHERE ar.user_id = p_user_id AND ar.unit_id IS NOT NULL
    )
    UNION ALL
    SELECT child.id
    FROM public.units child
    JOIN tree ON child.parent_id = tree.id
  )
  SELECT id FROM public.units
  WHERE EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = p_user_id AND ar.level = 0
  )
  UNION
  SELECT id FROM tree;
$$;

-- ── RLS ────────────────────────────────────────────────────
-- Provisório (mesmo espírito do M1): cada um vê as próprias linhas,
-- super-master vê tudo, escrita só GLOBAL_ADMIN até o M7+ trazer
-- regra fina (ex: Master de Campo podendo convidar Admin de Setor
-- dentro do próprio campo).
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_roles_select_own_or_super" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_master());

CREATE POLICY "admin_roles_write_global_admin" ON public.admin_roles
  FOR ALL TO authenticated
  USING (public.current_system_role() = 'GLOBAL_ADMIN')
  WITH CHECK (public.current_system_role() = 'GLOBAL_ADMIN');
