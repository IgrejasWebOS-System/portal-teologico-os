-- Um certificado de demonstração (Ricardo, já concluiu o curso
-- avulso Diaconato antes de iniciar o Teológico Básico) para
-- testar o novo modelo visual em /certificados e /portal/certificados.

INSERT INTO public.certificates (
  user_id, course_id, numero_certificado, nome_aluno, nome_curso, carga_horaria
)
SELECT
  u.id, c.id,
  'CETADP-CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('certificado_seq')::text, 4, '0'),
  'Ricardo Almeida Santos', 'Diaconato', 20
FROM auth.users u, public.courses c
WHERE u.email = 'aluno.basico@cetadp.teo.br' AND c.title = 'Diaconato';
