-- 041_demo_aluno_com_simulados_e_provas.sql
-- Cria o usuario de demonstracao alunoprova@cetadp.teo.br, ja
-- matriculado (e aprovado) em Curso Teologico Basico e Curso
-- Teologico Medio, com 100% das aulas concluidas nos dois, 2
-- simulados e 1 prova ja realizados e aprovados (nota 8.0) em cada
-- curso. Objetivo: dar ao cliente uma conta pronta para visualizar a
-- tela de simulados/prova ja preenchida, sem precisar refazer o
-- fluxo manualmente.
-- Senha padrao (mesma convencao das demais contas demo): @Cetadp748596#

do $$
declare
  v_user_id uuid;
  v_aluno_id uuid;
  v_matricula_num text;
  v_matricula_curso text;
  v_course record;
  v_matricula_id uuid;
  v_avaliacao_id uuid;
  v_q record;
  v_ordem int;
  v_tipo text;
  v_acertos_alvo int := 8;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'alunoprova@cetadp.teo.br',
    crypt('@Cetadp748596#', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aluno Demonstracao Provas"}'::jsonb,
    now(), now(), '', '', '', '',
    false, false
  )
  returning id into v_user_id;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'alunoprova@cetadp.teo.br'),
    'email', now(), now(), now()
  );

  v_matricula_num := 'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0');

  insert into ead_alunos (
    id, user_id, nome_completo, cpf, email, telefone,
    campo_ministerio_id, campo_ministerio_nome, matricula,
    curso_pretendido, status
  ) values (
    gen_random_uuid(), v_user_id, 'Aluno Demonstracao Provas', '555.666.777-88',
    'alunoprova@cetadp.teo.br', '(19) 99800-0000',
    '284418c1-0564-4a78-8ce9-389c4bded1e3', 'Campo Piracicaba Sede', v_matricula_num,
    'TEOLOGIA_BASICO', 'ATIVO'
  )
  returning id into v_aluno_id;

  for v_course in
    select id as course_id, title
    from courses
    where id in ('266ceb6a-1792-4ac6-921e-df4b4412b811', '90a6c3d2-bcde-469c-bd8c-dee4b7716598')
  loop
    v_matricula_curso := 'CETADP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ead_matricula_seq')::text, 4, '0');

    insert into ead_matriculas (
      id, aluno_id, course_id, curso_nome_snapshot, matricula,
      status, origem, data_matricula, data_conclusao, nota_final
    ) values (
      gen_random_uuid(), v_aluno_id, v_course.course_id, v_course.title, v_matricula_curso,
      'APROVADO', 'MATRICULA_DIRETA', now() - interval '60 days', now() - interval '2 days', 8.0
    )
    returning id into v_matricula_id;

    insert into enrollments (user_id, course_id, status, progress_percent, enrolled_at, completed_at)
    values (v_user_id, v_course.course_id, 'COMPLETED', 100, now() - interval '60 days', now() - interval '3 days');

    insert into lesson_completions (user_id, lesson_id, completed_at)
    select v_user_id, l.id, now() - interval '10 days'
    from lessons l
    where l.course_id = v_course.course_id;

    for v_tipo in select unnest(array['SIMULADO','SIMULADO','PROVA'])
    loop
      insert into avaliacoes (
        id, matricula_id, tipo, status, num_questoes, acertos, nota, aprovado,
        iniciada_em, finalizada_em
      ) values (
        gen_random_uuid(), v_matricula_id, v_tipo, 'FINALIZADA', 10, v_acertos_alvo, 8.00,
        case when v_tipo = 'PROVA' then true else null end,
        now() - interval '15 days', now() - interval '15 days'
      )
      returning id into v_avaliacao_id;

      v_ordem := 0;
      for v_q in
        select id, enunciado, opcoes, resposta_correta_index
        from avaliacoes_banco_questoes
        where course_id = v_course.course_id and ativo
        order by created_at
        limit 10
      loop
        v_ordem := v_ordem + 1;
        insert into avaliacao_questoes (
          avaliacao_id, ordem, enunciado, opcoes, resposta_correta_index,
          resposta_aluno_index, correta, respondida_em
        ) values (
          v_avaliacao_id, v_ordem, v_q.enunciado, v_q.opcoes, v_q.resposta_correta_index,
          case when v_ordem <= v_acertos_alvo then v_q.resposta_correta_index
               else (v_q.resposta_correta_index + 1) % jsonb_array_length(v_q.opcoes) end,
          v_ordem <= v_acertos_alvo,
          now() - interval '15 days'
        );
      end loop;
    end loop;
  end loop;
end $$;
