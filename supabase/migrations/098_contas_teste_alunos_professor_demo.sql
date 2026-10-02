-- 098_contas_teste_alunos_professor_demo.sql
-- Contas de teste pedidas pro ambiente de demonstração (ver AGENTS.md
-- / staging-first): dois alunos com progresso parcial na trilha do
-- Curso Teológico Básico (pra mostrar o Teste C/E liberando conforme
-- as lições avançam) e um professor com acesso "global" (mesmo nível
-- do secretário — GLOBAL_ADMIN/nível 0) só pra mostrar login, sem tela
-- de gestão de turma dedicada ainda.
-- Senha padrão (mesma convenção das demais contas demo, ver migration
-- 041): @Cetadp748596#

do $$
declare
  v_user_id uuid;
  v_aluno_id uuid;
  v_campo_id uuid;
  v_matricula_num text;
  v_matricula_id uuid;
  v_course_id uuid;
  v_total_licoes int;
begin
  select id into v_campo_id from ead_campos_ministerios where nome = 'Campo Piracicaba Sede' limit 1;
  select id into v_course_id from courses where title = 'Curso Teológico Básico' limit 1;
  select count(*) into v_total_licoes from lessons where course_id = v_course_id;

  -- ── alunobasico@cetadp.teo.br — 40% da trilha ──────────────────
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'alunobasico@cetadp.teo.br', crypt('@Cetadp748596#', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aluno Teste Basico"}'::jsonb,
    now(), now(), '', '', '', '', false, false
  ) returning id into v_user_id;

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'alunobasico@cetadp.teo.br'),
    'email', now(), now(), now());

  v_matricula_num := 'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0');

  insert into ead_alunos (id, user_id, nome_completo, cpf, email, telefone, campo_ministerio_id, campo_ministerio_nome, matricula, curso_pretendido, status)
  values (gen_random_uuid(), v_user_id, 'Aluno Teste Basico', '111.222.333-40', 'alunobasico@cetadp.teo.br', '(19) 99800-0001',
    v_campo_id, 'Campo Piracicaba Sede', v_matricula_num, 'TEOLOGIA_BASICO', 'ATIVO')
  returning id into v_aluno_id;

  insert into ead_matriculas (id, aluno_id, course_id, curso_nome_snapshot, matricula, status, origem, data_matricula)
  values (gen_random_uuid(), v_aluno_id, v_course_id, 'Curso Teológico Básico', v_matricula_num, 'EM_ANDAMENTO', 'MATRICULA_DIRETA', now() - interval '30 days')
  returning id into v_matricula_id;

  insert into enrollments (user_id, course_id, status, progress_percent, enrolled_at)
  values (v_user_id, v_course_id, 'ENROLLED', 40, now() - interval '30 days');

  insert into lesson_completions (user_id, lesson_id, completed_at)
  select v_user_id, l.id, now() - interval '5 days'
  from lessons l
  where l.course_id = v_course_id
  order by l.order_index
  limit greatest(1, round(v_total_licoes * 0.4));

  -- ── alunomedio@cetadp.teo.br — 60% da trilha ───────────────────
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'alunomedio@cetadp.teo.br', crypt('@Cetadp748596#', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aluno Teste Medio"}'::jsonb,
    now(), now(), '', '', '', '', false, false
  ) returning id into v_user_id;

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'alunomedio@cetadp.teo.br'),
    'email', now(), now(), now());

  v_matricula_num := 'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0');

  insert into ead_alunos (id, user_id, nome_completo, cpf, email, telefone, campo_ministerio_id, campo_ministerio_nome, matricula, curso_pretendido, status)
  values (gen_random_uuid(), v_user_id, 'Aluno Teste Medio', '111.222.333-41', 'alunomedio@cetadp.teo.br', '(19) 99800-0002',
    v_campo_id, 'Campo Piracicaba Sede', v_matricula_num, 'TEOLOGIA_BASICO', 'ATIVO')
  returning id into v_aluno_id;

  insert into ead_matriculas (id, aluno_id, course_id, curso_nome_snapshot, matricula, status, origem, data_matricula)
  values (gen_random_uuid(), v_aluno_id, v_course_id, 'Curso Teológico Básico', v_matricula_num, 'EM_ANDAMENTO', 'MATRICULA_DIRETA', now() - interval '45 days')
  returning id into v_matricula_id;

  insert into enrollments (user_id, course_id, status, progress_percent, enrolled_at)
  values (v_user_id, v_course_id, 'ENROLLED', 60, now() - interval '45 days');

  insert into lesson_completions (user_id, lesson_id, completed_at)
  select v_user_id, l.id, now() - interval '5 days'
  from lessons l
  where l.course_id = v_course_id
  order by l.order_index
  limit greatest(1, round(v_total_licoes * 0.6));

  -- ── professor@cetadp.teo.br — acesso "global" (nível 0, mesmo
  --    critério do secretário), só pra demonstrar login. Ainda não
  --    existe tela de "gestão de turma" — fica pra uma etapa futura.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'professor@cetadp.teo.br', crypt('@Cetadp748596#', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Professor Teste"}'::jsonb,
    now(), now(), '', '', '', '', false, false
  ) returning id into v_user_id;

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'professor@cetadp.teo.br'),
    'email', now(), now(), now());

  -- handle_new_user() (trigger) já criou a linha em profiles — só
  -- completa e sincroniza com o nível concedido, mesmo mapeamento de
  -- systemRoleParaLevel() em configuracoes/actions.ts.
  update profiles set full_name = 'Professor Teste', system_role = 'GLOBAL_ADMIN' where id = v_user_id;

  insert into admin_roles (user_id, level, unit_id, role_title, invited_by)
  values (v_user_id, 0, null, 'Professor (acesso de teste)', v_user_id);
end $$;
