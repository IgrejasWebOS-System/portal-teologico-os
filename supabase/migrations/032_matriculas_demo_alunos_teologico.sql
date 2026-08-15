-- 032_matriculas_demo_alunos_teologico.sql
-- RECONSTRUÍDA em 15/08/2026 — assim como as demais deste bloco (030-039),
-- foi aplicada em produção sem nunca ter sido versionada no git. Diferente
-- da 031, esta é conteúdo de DEMONSTRAÇÃO (não dado real de aluno) e, em
-- produção, a tabela já cresceu com uso real desde então — não dá pra
-- extrair com certeza absoluta quais das linhas atuais eram as originais
-- desta migração. Reconstrução APROXIMADA, no mesmo espírito descrito no
-- README (1 aluno de demonstração no Básico, 1 no Médio, com progresso
-- parcial) — não é garantido bater 1:1 com o que rodou originalmente.
-- Idempotente via e-mail de demonstração distinto.

DO $$
DECLARE
  v_campo_id uuid;
  v_curso_basico_id uuid;
  v_curso_medio_id uuid;
  v_aluno_id uuid;
  v_user_id uuid;
  v_matricula_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ead_alunos WHERE email = 'aluno.demo.curriculo@teste.cetadp.org.br') THEN
    RETURN;
  END IF;

  SELECT id INTO v_campo_id FROM public.ead_campos_ministerios WHERE nome = 'Campo Piracicaba Sede';
  SELECT id INTO v_curso_basico_id FROM public.courses WHERE title = 'Curso Teológico Básico';
  SELECT id INTO v_curso_medio_id FROM public.courses WHERE title = 'Curso Teológico Médio';

  IF v_curso_basico_id IS NULL OR v_curso_medio_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'aluno.demo.curriculo@teste.cetadp.org.br';
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'aluno.demo.curriculo@teste.cetadp.org.br', crypt('@Cetadp748596#', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Aluno Demonstração Currículo"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    ) RETURNING id INTO v_user_id;

    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'aluno.demo.curriculo@teste.cetadp.org.br'),
      'email', now(), now(), now());
  END IF;

  INSERT INTO public.ead_alunos (
    id, user_id, nome_completo, cpf, email, telefone,
    campo_ministerio_id, campo_ministerio_nome, matricula, curso_pretendido, status
  ) VALUES (
    gen_random_uuid(), v_user_id, 'Aluno Demonstração Currículo', '444.555.666-77',
    'aluno.demo.curriculo@teste.cetadp.org.br', '(19) 99700-0000',
    v_campo_id, 'Campo Piracicaba Sede',
    'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0'),
    'TEOLOGIA_BASICO', 'ATIVO'
  ) RETURNING id INTO v_aluno_id;

  -- Matrícula no Básico (em andamento, progresso parcial)
  INSERT INTO public.ead_matriculas (id, aluno_id, course_id, curso_nome_snapshot, matricula, status, origem, data_matricula)
  VALUES (gen_random_uuid(), v_aluno_id, v_curso_basico_id, 'Curso Teológico Básico',
    'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0'),
    'EM_ANDAMENTO', 'MATRICULA_DIRETA', now() - interval '30 days')
  RETURNING id INTO v_matricula_id;

  INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, enrolled_at)
  VALUES (v_user_id, v_curso_basico_id, 'ENROLLED', 40, now() - interval '30 days');

  INSERT INTO public.lesson_completions (user_id, lesson_id, completed_at)
  SELECT v_user_id, l.id, now() - interval '10 days'
  FROM public.lessons l WHERE l.course_id = v_curso_basico_id ORDER BY l.order_index LIMIT 4;

  -- Matrícula no Médio (também em andamento)
  INSERT INTO public.ead_matriculas (id, aluno_id, course_id, curso_nome_snapshot, matricula, status, origem, data_matricula)
  VALUES (gen_random_uuid(), v_aluno_id, v_curso_medio_id, 'Curso Teológico Médio',
    'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0'),
    'EM_ANDAMENTO', 'MATRICULA_DIRETA', now() - interval '20 days');

  INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, enrolled_at)
  VALUES (v_user_id, v_curso_medio_id, 'ENROLLED', 20, now() - interval '20 days');

  INSERT INTO public.lesson_completions (user_id, lesson_id, completed_at)
  SELECT v_user_id, l.id, now() - interval '5 days'
  FROM public.lessons l WHERE l.course_id = v_curso_medio_id ORDER BY l.order_index LIMIT 2;
END $$;
