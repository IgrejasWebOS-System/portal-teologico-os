-- Turmas/edições anuais de um curso (ex: "Edição Dezembro 2026").
-- Reflete o padrão real do CETADP: o EAD é gravado e liberado por
-- edições anuais, não em matrícula avulsa contínua (fonte: apresentação
-- institucional em PDF, slide "Aulas EAD").
-- Pós-pitch, sem prazo — enrollments.course_edition_id fica nullable
-- para não quebrar nada já matriculado sem edição definida.

CREATE TABLE public.course_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ano integer NOT NULL,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'PLANEJADA'
    CHECK (status IN ('PLANEJADA', 'ABERTA', 'EM_ANDAMENTO', 'ENCERRADA')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX course_editions_course_id_idx ON public.course_editions(course_id);

CREATE TRIGGER course_editions_updated_at
  BEFORE UPDATE ON public.course_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.enrollments
  ADD COLUMN course_edition_id uuid REFERENCES public.course_editions(id) ON DELETE SET NULL;

ALTER TABLE public.course_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_editions_select_published ON public.course_editions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_editions.course_id AND c.status = 'PUBLISHED'
    )
  );

CREATE POLICY course_editions_write_staff ON public.course_editions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );
