-- Matrícula por curso (relação aluno x curso). Até aqui, ead_alunos
-- guardava um único "curso_pretendido" por pessoa — o que impedia
-- modelar um aluno com mais de um curso, e a regra pedida pelo CETADP
-- (14/07/2026): o CPF do aluno não pode se matricular de novo no
-- MESMO curso, a não ser que a matrícula anterior tenha sido
-- REPROVADO. ead_alunos continua sendo a identidade da pessoa
-- (1 linha por CPF); cada curso que ela faz vira uma linha aqui.

CREATE TABLE public.ead_matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.ead_alunos(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  curso_nome_snapshot text NOT NULL,
  matricula text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'EM_ANDAMENTO'
    CHECK (status IN ('EM_ANDAMENTO', 'APROVADO', 'REPROVADO', 'CANCELADO')),
  origem text NOT NULL DEFAULT 'INSCRICAO_PUBLICA'
    CHECK (origem IN ('INSCRICAO_PUBLICA', 'MATRICULA_DIRETA')),
  matriculado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_matricula timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  nota_final numeric(4,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ead_matriculas_aluno_id_idx ON public.ead_matriculas(aluno_id);
CREATE INDEX ead_matriculas_course_id_idx ON public.ead_matriculas(course_id);
CREATE INDEX ead_matriculas_status_idx ON public.ead_matriculas(status);

CREATE TRIGGER ead_matriculas_updated_at
  BEFORE UPDATE ON public.ead_matriculas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Regra de negócio: bloqueia nova matrícula no mesmo curso se já existe
-- uma EM_ANDAMENTO ou APROVADO para o mesmo aluno (permite se a
-- anterior foi REPROVADO ou CANCELADO).
CREATE OR REPLACE FUNCTION public.check_matricula_unica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ead_matriculas m
    WHERE m.aluno_id = NEW.aluno_id
      AND m.course_id = NEW.course_id
      AND m.status IN ('EM_ANDAMENTO', 'APROVADO')
      AND m.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Este aluno já possui matrícula em andamento ou aprovada neste curso.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ead_matriculas_unica
  BEFORE INSERT OR UPDATE ON public.ead_matriculas
  FOR EACH ROW EXECUTE FUNCTION public.check_matricula_unica();

ALTER TABLE public.ead_matriculas ENABLE ROW LEVEL SECURITY;

CREATE POLICY ead_matriculas_select ON public.ead_matriculas
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN'))
    OR EXISTS (SELECT 1 FROM public.ead_alunos a WHERE a.id = ead_matriculas.aluno_id AND a.user_id = auth.uid())
  );

CREATE POLICY ead_matriculas_write_staff ON public.ead_matriculas
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- Backfill: os 2 alunos já aprovados nesta sessão de testes viram a
-- primeira linha de ead_matriculas cada um.
INSERT INTO public.ead_matriculas (aluno_id, course_id, curso_nome_snapshot, matricula, status, origem, data_matricula)
SELECT a.id, NULL, a.curso_pretendido, a.matricula, 'EM_ANDAMENTO', 'INSCRICAO_PUBLICA', a.created_at
FROM public.ead_alunos a
WHERE NOT EXISTS (SELECT 1 FROM public.ead_matriculas m WHERE m.aluno_id = a.id);
