-- 9 cursos preparatórios do catálogo real do CETADP (fonte: apresentação
-- institucional em PDF, slide "Cursos Preparatórios"), modelados como
-- courses (module='cursos') + product CURSO_AVULSO vinculado, mesmo
-- padrão já usado para Homilética. Preços são placeholder — a
-- instituição define o valor real depois.

INSERT INTO public.courses (title, description, module, level, status, instructor_name)
VALUES
  ('Diaconato', 'Instrução preparatória para o Diaconato.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Presbitério', 'Instrução preparatória para o Presbitério.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Dirigentes', 'Instrução preparatória para Dirigentes.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Noivos', 'Instrução preparatória para Noivos.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Casados', 'Instrução preparatória para Casados.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Tesouraria', 'Manual do Livro Caixa — capacitação de tesouraria.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('EBD — Capacitação de Superintendente', 'Curso preparatório para superintendentes da Escola Bíblica Dominical.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Capacitação de Professores', 'Curso preparatório para professores da EBD e cursos teológicos.', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP'),
  ('Devocional — Igreja aos Pés de Jesus', 'Curso devocional (em desenvolvimento no catálogo original do CETADP).', 'cursos', 'iniciante', 'PUBLISHED', 'CETADP');

INSERT INTO public.products (tipo, titulo, descricao, preco_centavos, course_id, status)
SELECT
  'CURSO_AVULSO',
  c.title,
  c.description,
  4000,
  c.id,
  'ATIVO'
FROM public.courses c
WHERE c.title IN (
  'Diaconato', 'Presbitério', 'Dirigentes', 'Noivos', 'Casados',
  'Tesouraria', 'EBD — Capacitação de Superintendente',
  'Capacitação de Professores', 'Devocional — Igreja aos Pés de Jesus'
);
