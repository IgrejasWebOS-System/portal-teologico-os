-- Substitui o conteúdo placeholder de "Curso Teológico Básico" e
-- "Curso Teológico Médio" pelo currículo oficial do CETADP (1
-- disciplina por mês, fevereiro a novembro, com recesso em
-- julho), conforme grade impressa do curso. Publica os dois
-- cursos (estavam em Rascunho) para aparecerem em /escola e
-- permitirem matrícula/aula de verdade na demonstração.

DO $$
DECLARE
  v_basico uuid;
  v_medio uuid;
BEGIN
  SELECT id INTO v_basico FROM public.courses WHERE title = 'Curso Teológico Básico';
  SELECT id INTO v_medio  FROM public.courses WHERE title = 'Curso Teológico Médio';

  -- Remove aulas placeholder
  DELETE FROM public.lessons WHERE course_id IN (v_basico, v_medio);

  -- Curso Teológico Básico — Ensino Básico (10 disciplinas, 1 ano)
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  VALUES
    (v_basico, 'Doutrina de Deus', 'Módulo previsto para fevereiro.', 1, 'none'),
    (v_basico, 'Cristologia', 'Módulo previsto para março.', 2, 'none'),
    (v_basico, 'Pneumatologia — O Espírito Santo', 'Módulo previsto para abril.', 3, 'none'),
    (v_basico, 'Anjos, Homem e Pecado', 'Módulo previsto para maio.', 4, 'none'),
    (v_basico, 'Panorama do Antigo Testamento', 'Módulo previsto para junho. Recesso em julho.', 5, 'none'),
    (v_basico, 'Panorama do Novo Testamento', 'Módulo previsto para agosto.', 6, 'none'),
    (v_basico, 'História da Igreja', 'Módulo previsto para o final de agosto.', 7, 'none'),
    (v_basico, 'Escatologia', 'Módulo previsto para setembro.', 8, 'none'),
    (v_basico, 'Ética Cristã', 'Módulo previsto para outubro.', 9, 'none'),
    (v_basico, 'Bibliologia', 'Módulo previsto para novembro. Férias em dezembro.', 10, 'none');

  -- Curso Teológico Médio — Ensino Médio (10 disciplinas, 1 ano)
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  VALUES
    (v_medio, 'Família Cristã', 'Módulo previsto para fevereiro.', 1, 'none'),
    (v_medio, 'Homilética', 'Módulo previsto para março.', 2, 'none'),
    (v_medio, 'Hermenêutica', 'Módulo previsto para abril.', 3, 'none'),
    (v_medio, 'Teologia do Obreiro', 'Módulo previsto para maio.', 4, 'none'),
    (v_medio, 'Soteriologia — Doutrina da Salvação', 'Módulo previsto para junho. Recesso em julho.', 5, 'none'),
    (v_medio, 'Eclesiologia — Doutrina da Igreja', 'Módulo previsto para agosto.', 6, 'none'),
    (v_medio, 'Educação Cristã', 'Módulo previsto para o final de agosto.', 7, 'none'),
    (v_medio, 'Apologética — Defesa da Fé', 'Módulo previsto para setembro.', 8, 'none'),
    (v_medio, 'Missiologia', 'Módulo previsto para outubro.', 9, 'none'),
    (v_medio, 'Liderança Cristã', 'Módulo previsto para novembro. Férias em dezembro.', 10, 'none');

  -- Publica os dois cursos
  UPDATE public.courses SET status = 'PUBLISHED' WHERE id IN (v_basico, v_medio);
END $$;
