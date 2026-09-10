-- Fase 2 do plano de "Ministério, Campo e revisão geral" —
-- vínculo Campo -> Ministério. Campo é `units.type = 'CAMPO'`;
-- ministerio_id fica nulo até o usuário atribuir (não quebra
-- Campos existentes). Não mexe em validate_unit_hierarchy nem em
-- get_accessible_unit_ids — é só um rótulo de agrupamento.

ALTER TABLE public.units
  ADD COLUMN ministerio_id uuid REFERENCES public.ministerios(id) ON DELETE SET NULL;

CREATE INDEX idx_units_ministerio_id ON public.units (ministerio_id) WHERE ministerio_id IS NOT NULL;
