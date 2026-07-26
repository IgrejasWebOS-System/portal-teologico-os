-- ============================================================
-- M10a (schema) — Afrouxa a escrita de units: quem administra uma
-- unidade pode criar filhas dela (ex: um Setor admin pode criar uma
-- Igreja nova dentro do próprio setor). Antes disso só GLOBAL_ADMIN/
-- Super-Master conseguiam criar QUALQUER unit — o que ia travar a
-- criação de igreja/setor por um Setor/Sede admin, mesmo depois de o
-- código passar a tentar criar a unit junto.
-- ============================================================

DROP POLICY IF EXISTS units_write_global_admin ON public.units;

CREATE POLICY units_write_scoped ON public.units
  FOR ALL TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  )
  WITH CHECK (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR parent_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  );
