-- 036_certificado_demo_visual.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 032/033/034 — demonstração
-- aproximada). 1 certificado de demonstração (curso avulso Diaconato) pra
-- testar o modelo visual de certificado. Idempotente via numero_certificado.
-- Só roda se existir o curso avulso "Diaconato" (migration 018) e o aluno
-- de demonstração criado na 032 — senão não faz nada (não é crítico).

DO $$
DECLARE
  v_course_id uuid;
  v_user_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.certificates WHERE numero_certificado = 'CETADP-CERT-2026-0001') THEN
    RETURN;
  END IF;

  SELECT id INTO v_course_id FROM public.courses WHERE title ILIKE '%Diaconato%' LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'aluno.demo.curriculo@teste.cetadp.org.br';

  IF v_course_id IS NULL OR v_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.certificates (
    user_id, enrollment_id, course_id, course_edition_id, numero_certificado,
    nome_aluno, nome_curso, carga_horaria, assinatura_presidente, assinatura_coordenador,
    emitido_em
  ) VALUES (
    v_user_id, NULL, v_course_id, NULL, 'CETADP-CERT-2026-0001',
    'Aluno Demonstração Currículo', 'Diaconato', 20,
    'Pr. Presidente CETADP', 'Coordenador(a) Acadêmico(a)',
    now()
  );
END $$;
