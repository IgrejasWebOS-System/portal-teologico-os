-- Matrícula de demonstração completa para o pitch: 1 aluno no Curso
-- Teológico Básico, 1 no Curso Teológico Médio. Cobre os dois
-- sistemas em paralelo (ead_alunos/ead_matriculas = matrícula oficial
-- e financeiro; enrollments/lesson_completions = player de aula em
-- /escola), avaliação de exemplo e parcelas de mensalidade.
-- Os logins (auth.users) já foram criados via SQL direto (fora de
-- migração, por conter senha) para aluno.basico@cetadp.teo.br e
-- aluno.medio@cetadp.teo.br.
--
-- Guarda de portabilidade (adicionada ao versionar este arquivo):
-- em qualquer ambiente onde essas 2 contas demo não existam (branch
-- nova, restore, etc.) a migração vira um no-op seguro em vez de
-- quebrar a cadeia inteira com "null value in column user_id of
-- relation enrollments violates not-null constraint" — mesma lógica
-- já aplicada em 014_seed_produtos_loja.sql.

-- Igreja de demonstração, para ilustrar o financiamento interno
-- (igreja responsável pelo pagamento da mensalidade do aluno).
INSERT INTO public.churches (name, city, state, status)
SELECT 'AD Piracicaba — Congregação Central', 'Piracicaba', 'SP', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.churches WHERE name = 'AD Piracicaba — Congregação Central');

DO $$
DECLARE
  v_user_basico   uuid;
  v_user_medio    uuid;
  v_curso_basico  uuid;
  v_curso_medio   uuid;
  v_aluno_basico  uuid;
  v_aluno_medio   uuid;
  v_matricula_basico_id uuid;
  v_matricula_medio_id  uuid;
  v_matricula_basico_num text;
  v_matricula_medio_num  text;
  v_church_id     uuid;
  v_lesson        RECORD;
  v_avaliacao_id  uuid;
  v_ordem         integer;
  v_questao       RECORD;
BEGIN
  SELECT id INTO v_user_basico FROM auth.users WHERE email = 'aluno.basico@cetadp.teo.br';
  SELECT id INTO v_user_medio  FROM auth.users WHERE email = 'aluno.medio@cetadp.teo.br';

  IF v_user_basico IS NULL OR v_user_medio IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_curso_basico FROM public.courses WHERE title = 'Curso Teológico Básico';
  SELECT id INTO v_curso_medio  FROM public.courses WHERE title = 'Curso Teológico Médio';
  SELECT id INTO v_church_id FROM public.churches WHERE name = 'AD Piracicaba — Congregação Central';

  -- ── ead_alunos (ficha oficial) ────────────────────────────────
  INSERT INTO public.ead_alunos (user_id, nome_completo, cpf, email, telefone, campo_ministerio_id, campo_ministerio_nome, matricula, curso_pretendido, status)
  VALUES (v_user_basico, 'Ricardo Almeida Santos', '123.456.789-01', 'aluno.basico@cetadp.teo.br', '(19) 99811-2233',
          (SELECT id FROM public.ead_campos_ministerios WHERE nome = 'Campo Piracicaba Sede'), 'Campo Piracicaba Sede',
          'CETADP-2026-' || LPAD(nextval('ead_matricula_seq')::text, 4, '0'), 'TEOLOGIA_BASICO', 'ATIVO')
  RETURNING id, matricula INTO v_aluno_basico, v_matricula_basico_num;

  INSERT INTO public.ead_alunos (user_id, nome_completo, cpf, email, telefone, campo_ministerio_id, campo_ministerio_nome, matricula, curso_pretendido, status)
  VALUES (v_user_medio, 'Juliana Prado Martins', '987.654.321-00', 'aluno.medio@cetadp.teo.br', '(19) 99822-4455',
          (SELECT id FROM public.ead_campos_ministerios WHERE nome = 'Campo Piracicaba Sede'), 'Campo Piracicaba Sede',
          'CETADP-2026-' || LPAD(nextval('ead_matricula_seq')::text, 4, '0'), 'TEOLOGIA_MEDIO', 'ATIVO')
  RETURNING id, matricula INTO v_aluno_medio, v_matricula_medio_num;

  -- ── ead_matriculas (matrícula oficial por curso) ────────────────
  INSERT INTO public.ead_matriculas (aluno_id, course_id, curso_nome_snapshot, matricula, status, origem)
  VALUES (v_aluno_basico, v_curso_basico, 'Curso Teológico Básico', v_matricula_basico_num, 'EM_ANDAMENTO', 'MATRICULA_DIRETA')
  RETURNING id INTO v_matricula_basico_id;

  INSERT INTO public.ead_matriculas (aluno_id, course_id, curso_nome_snapshot, matricula, status, origem)
  VALUES (v_aluno_medio, v_curso_medio, 'Curso Teológico Médio', v_matricula_medio_num, 'EM_ANDAMENTO', 'MATRICULA_DIRETA')
  RETURNING id INTO v_matricula_medio_id;

  -- ── enrollments (player de aula em /escola) ─────────────────────
  INSERT INTO public.enrollments (user_id, course_id, status, progress_percent)
  VALUES (v_user_basico, v_curso_basico, 'ENROLLED', 40);

  INSERT INTO public.enrollments (user_id, course_id, status, progress_percent)
  VALUES (v_user_medio, v_curso_medio, 'ENROLLED', 60);

  -- Conclui as 4 primeiras aulas do Básico para o Ricardo
  FOR v_lesson IN SELECT id, order_index FROM public.lessons WHERE course_id = v_curso_basico AND order_index <= 4 ORDER BY order_index LOOP
    INSERT INTO public.lesson_completions (user_id, lesson_id, completed_at)
    VALUES (v_user_basico, v_lesson.id, now() - ((5 - v_lesson.order_index) || ' days')::interval);
  END LOOP;

  -- Conclui as 6 primeiras aulas do Médio para a Juliana
  FOR v_lesson IN SELECT id, order_index FROM public.lessons WHERE course_id = v_curso_medio AND order_index <= 6 ORDER BY order_index LOOP
    INSERT INTO public.lesson_completions (user_id, lesson_id, completed_at)
    VALUES (v_user_medio, v_lesson.id, now() - ((7 - v_lesson.order_index) || ' days')::interval);
  END LOOP;

  -- ── Avaliação de exemplo (só o Básico tem banco de questões) ────
  INSERT INTO public.avaliacoes (matricula_id, tipo, status, num_questoes, acertos, nota, aprovado, iniciada_em, finalizada_em)
  VALUES (v_matricula_basico_id, 'SIMULADO', 'FINALIZADA', 5, 4, 8.00, true, now() - interval '3 days', now() - interval '3 days' + interval '25 minutes')
  RETURNING id INTO v_avaliacao_id;

  v_ordem := 1;
  FOR v_questao IN
    SELECT enunciado, opcoes, resposta_correta_index
    FROM public.avaliacoes_banco_questoes
    WHERE course_id = v_curso_basico
    ORDER BY created_at
    LIMIT 5
  LOOP
    INSERT INTO public.avaliacao_questoes (avaliacao_id, ordem, enunciado, opcoes, resposta_correta_index, resposta_aluno_index, correta, respondida_em)
    VALUES (
      v_avaliacao_id, v_ordem, v_questao.enunciado, v_questao.opcoes, v_questao.resposta_correta_index,
      CASE WHEN v_ordem = 3 THEN (v_questao.resposta_correta_index + 1) % 4 ELSE v_questao.resposta_correta_index END,
      CASE WHEN v_ordem = 3 THEN false ELSE true END,
      now() - interval '3 days'
    );
    v_ordem := v_ordem + 1;
  END LOOP;

  -- ── Financeiro: parcelas de mensalidade ─────────────────────────
  -- Ricardo (Básico) paga a própria mensalidade via PIX.
  INSERT INTO public.fin_contas_receber (origem_tipo, origem_id, aluno_id, aluno_user_id, responsavel_pagamento, descricao, numero_parcela, total_parcelas, valor_bruto_centavos, valor_liquido_centavos, forma_pagamento_prevista, data_vencimento, status, pago_em)
  VALUES
    ('MATRICULA_DIRETA', v_matricula_basico_id, v_aluno_basico, v_user_basico, 'ALUNO', 'Mensalidade Curso Teológico Básico — maio/2026', 4, 10, 10000, 10000, 'PIX', (CURRENT_DATE - INTERVAL '45 days')::date, 'PAGO', (CURRENT_DATE - INTERVAL '44 days')::timestamptz),
    ('MATRICULA_DIRETA', v_matricula_basico_id, v_aluno_basico, v_user_basico, 'ALUNO', 'Mensalidade Curso Teológico Básico — junho/2026', 5, 10, 10000, 10000, 'PIX', (CURRENT_DATE - INTERVAL '10 days')::date, 'ATRASADO', NULL),
    ('MATRICULA_DIRETA', v_matricula_basico_id, v_aluno_basico, v_user_basico, 'ALUNO', 'Mensalidade Curso Teológico Básico — julho/2026', 6, 10, 10000, 10000, 'PIX', (CURRENT_DATE + INTERVAL '20 days')::date, 'PENDENTE', NULL);

  -- Juliana (Médio) — financiamento interno: a igreja paga por ela.
  INSERT INTO public.fin_contas_receber (origem_tipo, origem_id, aluno_id, aluno_user_id, responsavel_pagamento, church_id, descricao, numero_parcela, total_parcelas, valor_bruto_centavos, valor_liquido_centavos, forma_pagamento_prevista, data_vencimento, status, pago_em)
  VALUES
    ('MATRICULA_DIRETA', v_matricula_medio_id, v_aluno_medio, v_user_medio, 'IGREJA', v_church_id, 'Mensalidade Curso Teológico Médio — maio/2026 (financiamento interno)', 5, 10, 12000, 12000, 'TRANSFERENCIA', (CURRENT_DATE - INTERVAL '45 days')::date, 'PAGO', (CURRENT_DATE - INTERVAL '43 days')::timestamptz),
    ('MATRICULA_DIRETA', v_matricula_medio_id, v_aluno_medio, v_user_medio, 'IGREJA', v_church_id, 'Mensalidade Curso Teológico Médio — junho/2026 (financiamento interno)', 6, 10, 12000, 12000, 'TRANSFERENCIA', (CURRENT_DATE - INTERVAL '15 days')::date, 'PAGO', (CURRENT_DATE - INTERVAL '14 days')::timestamptz),
    ('MATRICULA_DIRETA', v_matricula_medio_id, v_aluno_medio, v_user_medio, 'IGREJA', v_church_id, 'Mensalidade Curso Teológico Médio — julho/2026 (financiamento interno)', 7, 10, 12000, 12000, 'TRANSFERENCIA', (CURRENT_DATE + INTERVAL '15 days')::date, 'PENDENTE', NULL);
END $$;
