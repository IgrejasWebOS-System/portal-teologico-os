-- ============================================================
-- LIMPEZA-ALUNOS-AGUAS-FORMOSAS-17-11-2026.sql
-- PRODUCAO (toduvwtzklntyptcodkf). Exclusao DEFINITIVA de 5 alunos
-- (Regional 006 Aguas Formosas) e tudo vinculado a eles.
-- Backup previo validado:
--   portal-teologico_PROD_2026-11-17_1007_PRE-pre-limpeza-alunos-aguas-formosas.dump
-- MANTIDOS: turma/course_editions, professores, igrejas, auditoria_acoes, legado_alunos.
--
-- NOTA DE EXECUCAO (17/11/2026): a 1a versao usava BEGIN + tabelas TEMP e o SQL Editor
-- do Supabase acusou "relation _alunos_del does not exist". A versao abaixo e um unico
-- bloco DO (atomico, sem TEMP). Na 2a execucao a trava "Esperados 5 alunos" encontrou 0,
-- e as conferencias de leitura confirmaram producao sem nenhum dado dos 5 alunos
-- (matriculas, parcelas, avaliacoes, mapa legado e logins). Auditoria preservada
-- (18 registros). Se for reutilizar este script, troque os IDs e ESPERE 5 alunos.
-- ============================================================

DO $$
DECLARE
  v_alunos uuid[] := ARRAY[
    'baea8886-5b5f-4bfd-be5b-25f4462f0ea2', -- Eduardo
    '28cd65e2-34bb-4fb6-9d56-5c2a5e0f7dd1', -- Helio
    '51f1d70c-260c-483d-a156-69e22ea54f21', -- Milza
    '2214a6f7-5998-4046-9872-e24dfe53078e', -- Vanilha
    '729423b8-a933-49ca-9ed0-8041dfd1930a'  -- Elida
  ]::uuid[];
  v_users uuid[];
  v_matr uuid[];
  n int;
BEGIN
  SELECT coalesce(array_agg(user_id) FILTER (WHERE user_id IS NOT NULL), '{}'::uuid[])
    INTO v_users FROM public.ead_alunos WHERE id = ANY(v_alunos);

  SELECT count(*) INTO n FROM public.ead_alunos WHERE id = ANY(v_alunos);
  IF n <> 5 THEN
    RAISE EXCEPTION 'Esperados 5 alunos, encontrados %. Abortado.', n;
  END IF;

  SELECT count(*) INTO n FROM public.profiles
   WHERE id = ANY(v_users) AND system_role IS DISTINCT FROM 'MEMBER';
  IF n > 0 THEN
    RAISE EXCEPTION 'Algum login tem papel diferente de MEMBER (%). Abortado.', n;
  END IF;

  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_matr
    FROM public.ead_matriculas WHERE aluno_id = ANY(v_alunos);

  DELETE FROM public.avaliacao_questoes WHERE avaliacao_id IN
    (SELECT id FROM public.avaliacoes WHERE matricula_id = ANY(v_matr));
  DELETE FROM public.avaliacoes WHERE matricula_id = ANY(v_matr);

  DELETE FROM public.fin_contas_receber
   WHERE aluno_id = ANY(v_alunos)
      OR aluno_user_id = ANY(v_users)
      OR origem_id = ANY(v_matr);

  DELETE FROM public.lesson_completions WHERE user_id = ANY(v_users);
  DELETE FROM public.enrollments        WHERE user_id = ANY(v_users);

  DELETE FROM public.legado_mig_matriculas WHERE ead_aluno_id = ANY(v_alunos);
  DELETE FROM public.legado_mig_alunos     WHERE ead_aluno_id = ANY(v_alunos);

  DELETE FROM public.ead_matriculas WHERE id = ANY(v_matr);
  DELETE FROM public.ead_alunos     WHERE id = ANY(v_alunos);

  DELETE FROM public.profiles WHERE id = ANY(v_users);
  DELETE FROM auth.users      WHERE id = ANY(v_users);
END $$;
