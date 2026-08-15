-- 031_curriculo_real_teologico_basico_medio.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 030 — aplicada em produção,
-- nunca versionada). Conteúdo abaixo é uma cópia EXATA do estado real
-- das 20 aulas em produção hoje (extraído via query direta em `lessons`
-- para os cursos "Curso Teológico Básico" e "Curso Teológico Médio"),
-- não uma aproximação — alta confiança de fidelidade ao original.
--
-- Substitui as aulas placeholder pelo currículo oficial (10 disciplinas
-- cada, fev-nov com recesso em julho) e publica os dois cursos.
-- Idempotente: só mexe no curso se a primeira disciplina real ainda não
-- existir (evita duplicar em produção, onde isso já rodou).

DO $$
DECLARE
  v_curso_id uuid;
BEGIN
  -- ── Curso Teológico Básico ──────────────────────────────────
  SELECT id INTO v_curso_id FROM public.courses WHERE title = 'Curso Teológico Básico';

  IF v_curso_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE course_id = v_curso_id AND title = 'Doutrina de Deus'
  ) THEN
    DELETE FROM public.lessons WHERE course_id = v_curso_id;

    INSERT INTO public.lessons (course_id, title, description, order_index, video_type, is_free_preview) VALUES
      (v_curso_id, 'Doutrina de Deus', 'Módulo previsto para fevereiro.', 1, 'none', false),
      (v_curso_id, 'Cristologia', 'Módulo previsto para março.', 2, 'none', false),
      (v_curso_id, 'Pneumatologia — O Espírito Santo', 'Módulo previsto para abril.', 3, 'none', false),
      (v_curso_id, 'Anjos, Homem e Pecado', 'Módulo previsto para maio.', 4, 'none', false),
      (v_curso_id, 'Panorama do Antigo Testamento', 'Módulo previsto para junho. Recesso em julho.', 5, 'none', false),
      (v_curso_id, 'Panorama do Novo Testamento', 'Módulo previsto para agosto.', 6, 'none', false),
      (v_curso_id, 'História da Igreja', 'Módulo previsto para o final de agosto.', 7, 'none', false),
      (v_curso_id, 'Escatologia', 'Módulo previsto para setembro.', 8, 'none', false),
      (v_curso_id, 'Ética Cristã', 'Módulo previsto para outubro.', 9, 'none', false),
      (v_curso_id, 'Bibliologia', 'Módulo previsto para novembro. Férias em dezembro.', 10, 'none', false);

    UPDATE public.courses SET status = 'PUBLISHED' WHERE id = v_curso_id;
  END IF;

  -- ── Curso Teológico Médio ───────────────────────────────────
  SELECT id INTO v_curso_id FROM public.courses WHERE title = 'Curso Teológico Médio';

  IF v_curso_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE course_id = v_curso_id AND title = 'Família Cristã'
  ) THEN
    DELETE FROM public.lessons WHERE course_id = v_curso_id;

    INSERT INTO public.lessons (course_id, title, description, order_index, video_type, is_free_preview) VALUES
      (v_curso_id, 'Família Cristã', 'Módulo previsto para fevereiro.', 1, 'none', false),
      (v_curso_id, 'Homilética', 'Módulo previsto para março.', 2, 'none', false),
      (v_curso_id, 'Hermenêutica', 'Módulo previsto para abril.', 3, 'none', false),
      (v_curso_id, 'Teologia do Obreiro', 'Módulo previsto para maio.', 4, 'none', false),
      (v_curso_id, 'Soteriologia — Doutrina da Salvação', 'Módulo previsto para junho. Recesso em julho.', 5, 'none', false),
      (v_curso_id, 'Eclesiologia — Doutrina da Igreja', 'Módulo previsto para agosto.', 6, 'none', false),
      (v_curso_id, 'Educação Cristã', 'Módulo previsto para o final de agosto.', 7, 'none', false),
      (v_curso_id, 'Apologética — Defesa da Fé', 'Módulo previsto para setembro.', 8, 'none', false),
      (v_curso_id, 'Missiologia', 'Módulo previsto para outubro.', 9, 'none', false),
      (v_curso_id, 'Liderança Cristã', 'Módulo previsto para novembro. Férias em dezembro.', 10, 'none', false);

    UPDATE public.courses SET status = 'PUBLISHED' WHERE id = v_curso_id;
  END IF;
END $$;
