-- ============================================================
-- Dados de demonstração para o ensaio do pitch de 24/07.
-- Aplicada ao projeto toduvwtzklntyptcodkf via MCP, nome remoto
-- "006_dados_demonstracao".
--
-- IMPORTANTE: conteúdo placeholder (títulos e textos plausíveis,
-- não conteúdo oficial da CPAD/CETADP). Substituir antes do
-- lançamento real por conteúdo curricular de verdade.
-- ============================================================

-- ── Escola Teológica ──────────────────────────────────────────
WITH c1 AS (
  INSERT INTO public.courses (title, description, module, status, instructor_name, level, featured, duration_hours)
  VALUES ('Fundamentos da Fé Cristã', 'Introdução às doutrinas centrais do cristianismo evangélico: revelação, Trindade, salvação e vida cristã.', 'escola', 'PUBLISHED', 'Pr. Ezequiel Torres', 'iniciante', true, 12)
  RETURNING id
), c2 AS (
  INSERT INTO public.courses (title, description, module, status, instructor_name, level, featured, duration_hours)
  VALUES ('Hermenêutica Bíblica', 'Princípios de interpretação bíblica: contexto histórico, gêneros literários e aplicação contemporânea.', 'escola', 'PUBLISHED', 'Pra. Miriam Castro', 'intermediario', false, 16)
  RETURNING id
), c3 AS (
  INSERT INTO public.courses (title, description, module, status, instructor_name, level, featured, duration_hours)
  VALUES ('Teologia Sistemática', 'Estudo organizado da doutrina cristã por temas: Deus, homem, pecado, cristologia e escatologia.', 'escola', 'PUBLISHED', 'Pr. Ezequiel Torres', 'avancado', false, 24)
  RETURNING id
),
-- ── Cursos & Treinamentos ────────────────────────────────────
c4 AS (
  INSERT INTO public.courses (title, description, module, status, instructor_name, level, featured, duration_hours)
  VALUES ('Liderança e Ministério Pastoral', 'Fundamentos de liderança cristã aplicados à condução de igrejas e ministérios locais.', 'cursos', 'PUBLISHED', 'Pr. Davi Nogueira', 'intermediario', true, 10)
  RETURNING id
), c5 AS (
  INSERT INTO public.courses (title, description, module, status, instructor_name, level, featured, duration_hours)
  VALUES ('Homilética — A Arte de Pregar', 'Técnicas de preparação e comunicação de sermões bíblicos.', 'cursos', 'PUBLISHED', 'Pra. Miriam Castro', 'iniciante', false, 8)
  RETURNING id
),
lessons1 AS (
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  SELECT id, t, d, i, 'none' FROM c1, (VALUES
    ('Aula 1 — O que é a Revelação', 'Como Deus se revela às pessoas.', 1),
    ('Aula 2 — A Trindade', 'O conceito bíblico de um só Deus em três pessoas.', 2),
    ('Aula 3 — Salvação pela Graça', 'A doutrina da salvação e seus fundamentos bíblicos.', 3)
  ) AS v(t, d, i)
),
lessons2 AS (
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  SELECT id, t, d, i, 'none' FROM c2, (VALUES
    ('Aula 1 — Contexto Histórico e Cultural', 'Por que o contexto importa na leitura bíblica.', 1),
    ('Aula 2 — Gêneros Literários da Bíblia', 'Narrativa, poesia, profecia e epístola.', 2),
    ('Aula 3 — Da Interpretação à Aplicação', 'Como transformar exegese em prática de vida.', 3)
  ) AS v(t, d, i)
),
lessons3 AS (
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  SELECT id, t, d, i, 'none' FROM c3, (VALUES
    ('Aula 1 — Doutrina de Deus', 'Atributos e natureza de Deus.', 1),
    ('Aula 2 — Doutrina do Homem e do Pecado', 'Origem e natureza do pecado.', 2),
    ('Aula 3 — Cristologia', 'A pessoa e obra de Jesus Cristo.', 3),
    ('Aula 4 — Escatologia', 'As últimas coisas segundo a Escritura.', 4)
  ) AS v(t, d, i)
),
lessons4 AS (
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  SELECT id, t, d, i, 'none' FROM c4, (VALUES
    ('Aula 1 — Perfil do Líder Cristão', 'Caráter e chamado na liderança.', 1),
    ('Aula 2 — Gestão de Conflitos na Igreja', 'Como mediar situações delicadas com sabedoria.', 2),
    ('Aula 3 — Discipulado e Multiplicação', 'Formando novos líderes.', 3)
  ) AS v(t, d, i)
),
lessons5 AS (
  INSERT INTO public.lessons (course_id, title, description, order_index, video_type)
  SELECT id, t, d, i, 'none' FROM c5, (VALUES
    ('Aula 1 — Estrutura de um Sermão', 'Introdução, desenvolvimento e conclusão.', 1),
    ('Aula 2 — Comunicação e Oratória', 'Técnicas de fala e presença de púlpito.', 2)
  ) AS v(t, d, i)
)
SELECT 1;

-- ── EBD (Escola Bíblica Dominical) ───────────────────────────
WITH q1 AS (
  INSERT INTO public.ebd_quarters (year, quarter, theme, audience, publisher, lesson_count)
  VALUES (2026, 3, 'A Igreja e sua Missão', 'Adultos', 'CPAD', 13)
  RETURNING id
)
INSERT INTO public.ebd_lessons (quarter_id, lesson_number, title, aureo_text, aureo_reference, practical_truth)
SELECT id, n, t, at, ar, pt FROM q1, (VALUES
  (1, 'A Igreja: Origem e Propósito', 'Edificarei a minha igreja, e as portas do inferno não prevalecerão contra ela.', 'Mateus 16:18', 'A igreja é obra de Cristo, não do homem.'),
  (2, 'A Grande Comissão', 'Ide, portanto, fazei discípulos de todas as nações.', 'Mateus 28:19', 'Toda igreja é chamada a evangelizar.'),
  (3, 'Os Dons Espirituais a Serviço da Missão', 'Há diversidade de dons, mas o Espírito é o mesmo.', '1 Coríntios 12:4', 'Cada membro tem um papel no corpo de Cristo.'),
  (4, 'A Igreja Local e a Comunidade', 'Fazei o bem a todos, mas principalmente aos domésticos da fé.', 'Gálatas 6:10', 'A igreja serve também fora de si mesma.')
) AS v(n, t, at, ar, pt);

-- ── Inscrições pendentes de demonstração (para aprovar ao vivo no pitch) ──
INSERT INTO public.ead_inscricoes (nome_completo, cpf, email, telefone, campo_ministerio_nome, curso_pretendido, mensagem, status)
VALUES
  ('Mariana Alves Ferreira', '111.111.111-11', 'demo.mariana@example.com', '(19) 99999-0001', 'Campo Piracicaba Sede', 'TEOLOGIA_BASICO', 'Tenho interesse em iniciar os estudos teológicos este ano.', 'PENDENTE'),
  ('Carlos Eduardo Lima', '222.222.222-22', 'demo.carlos@example.com', '(19) 99999-0002', 'Ministério de Jovens', 'TREINAMENTO', 'Sou líder de jovens e quero me capacitar melhor.', 'PENDENTE'),
  ('Fernanda Souza Ribeiro', '333.333.333-33', 'demo.fernanda@example.com', '(19) 99999-0003', 'Ministério de Missões', 'OFICIAL', NULL, 'PENDENTE');
