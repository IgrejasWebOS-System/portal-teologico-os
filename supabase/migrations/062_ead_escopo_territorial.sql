-- ============================================================
-- M8 — Escopo territorial em EAD/matrícula (fundação)
--
-- Decisões (confirmadas com o usuário):
--   • Aluno de outras igrejas/ministérios fica FORA da árvore units
--     — continua como hoje (campo_ministerio_nome texto livre).
--     Só aluno da própria igreja ganha unit_id de verdade.
--   • Turma (course_editions) pode ser limitada a uma unidade —
--     unit_id opcional; vazio continua aberta pra todo mundo.
--
-- Este módulo é só a FUNDAÇÃO de schema + a função de "está dentro
-- de". Não mexe ainda em: formulário de matrícula (pra escolher
-- tipo_aluno/igreja), nem trava matrícula fora da unidade da turma
-- — isso é código de aplicação, fica pra depois, quando formos
-- alterar as Server Actions de matrícula/EAD.
--
-- ead_alunos existentes ficam com unit_id/tipo_aluno NULL (não dá
-- pra inferir com segurança a partir de campo_ministerio_id, que é
-- um conceito solto, não ligado à árvore) — não chuto isso.
-- ============================================================

-- ── ead_alunos: unidade de origem + classificação ────────────
ALTER TABLE public.ead_alunos
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_aluno text
    CHECK (tipo_aluno IS NULL OR tipo_aluno IN ('IGREJA', 'INTERNET', 'OUTRA_IGREJA'));

CREATE INDEX IF NOT EXISTS idx_ead_alunos_unit_id ON public.ead_alunos USING btree (unit_id);

-- ── course_editions (turma): unidade opcional de restrição ──
ALTER TABLE public.course_editions
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_editions_unit_id ON public.course_editions USING btree (unit_id);

COMMENT ON COLUMN public.course_editions.unit_id IS
  'Se preenchido, a turma é restrita a essa unidade e suas descendentes (via public.unit_is_within). Se NULL, continua aberta a qualquer aluno, como sempre foi.';

-- ── Função: p_unit_id está dentro de (é igual a, ou descendente de) p_ancestor_id? ──
-- Diferente de get_accessible_unit_ids() (que é sobre o que um STAFF
-- pode administrar): esta é sobre elegibilidade de matrícula — "o
-- aluno X pertence à árvore que essa turma restringe?".
CREATE OR REPLACE FUNCTION public.unit_is_within(p_unit_id uuid, p_ancestor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id FROM public.units WHERE id = p_unit_id
    UNION ALL
    SELECT u.id, u.parent_id FROM public.units u JOIN up ON u.id = up.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM up WHERE id = p_ancestor_id);
$$;

-- ── RLS de ead_alunos: mesmo padrão de escopo do M7.1 ────────
-- Aluno sem unit_id (internet/outra igreja) só aparece pra
-- GLOBAL_ADMIN/Super-Master — não tem "dono" territorial.
DROP POLICY IF EXISTS ead_alunos_select_self_or_staff ON public.ead_alunos;
DROP POLICY IF EXISTS ead_alunos_write_staff ON public.ead_alunos;

CREATE POLICY ead_alunos_select_self_or_scoped ON public.ead_alunos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR (unit_id IS NOT NULL AND unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids()))
  );

CREATE POLICY ead_alunos_write_scoped ON public.ead_alunos
  FOR ALL TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR (unit_id IS NOT NULL AND unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids()))
  )
  WITH CHECK (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR (unit_id IS NOT NULL AND unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids()))
  );
