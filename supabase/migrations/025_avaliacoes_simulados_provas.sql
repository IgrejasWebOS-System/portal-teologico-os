-- Módulo de simulados e provas — versão sem IA (fase de teste):
-- banco de questões estático por curso, sorteio aleatório por aluno
-- (embaralhando questões e opções), correção automática (só múltipla
-- escolha por enquanto). Estrutura já pronta para, no futuro, trocar
-- o sorteio por geração via IA e habilitar questões dissertativas —
-- ver função gerarQuestoes() no código, isolada de propósito.

CREATE TABLE public.avaliacoes_banco_questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enunciado text NOT NULL,
  opcoes jsonb NOT NULL,
  resposta_correta_index integer NOT NULL CHECK (resposta_correta_index BETWEEN 0 AND 3),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avaliacoes_banco_questoes_course_idx ON public.avaliacoes_banco_questoes(course_id);

CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.ead_matriculas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('SIMULADO', 'PROVA')),
  status text NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO', 'FINALIZADA')),
  num_questoes integer NOT NULL CHECK (num_questoes >= 1),
  acertos integer,
  nota numeric(4,2),
  aprovado boolean,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Regra do CETADP: a prova só pode ser feita UMA vez por matrícula
-- (mesmo depois de finalizada) — índice único parcial garante isso
-- no banco, não só na tela.
CREATE UNIQUE INDEX avaliacoes_prova_unica ON public.avaliacoes(matricula_id) WHERE (tipo = 'PROVA');

CREATE INDEX avaliacoes_matricula_idx ON public.avaliacoes(matricula_id);

CREATE TABLE public.avaliacao_questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  enunciado text NOT NULL,
  opcoes jsonb NOT NULL,
  resposta_correta_index integer NOT NULL,
  resposta_aluno_index integer,
  correta boolean,
  respondida_em timestamptz,
  UNIQUE (avaliacao_id, ordem)
);

CREATE INDEX avaliacao_questoes_avaliacao_idx ON public.avaliacao_questoes(avaliacao_id);

ALTER TABLE public.avaliacoes_banco_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_questoes ENABLE ROW LEVEL SECURITY;

-- Banco de questões: staff administra; leitura só via service role nas
-- server actions (o aluno nunca deve ver o gabarito direto do banco).
CREATE POLICY avaliacoes_banco_questoes_staff ON public.avaliacoes_banco_questoes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));

-- avaliacoes / avaliacao_questoes: só SELECT direto (o aluno vê o
-- próprio histórico; staff vê tudo). Toda escrita (iniciar, responder,
-- finalizar) passa pelas server actions com o cliente admin, para
-- garantir a regra de 1 tentativa e a correção no servidor.
CREATE POLICY avaliacoes_select ON public.avaliacoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ead_matriculas m
      JOIN public.ead_alunos al ON al.id = m.aluno_id
      WHERE m.id = avaliacoes.matricula_id AND al.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN'))
  );

CREATE POLICY avaliacao_questoes_select ON public.avaliacao_questoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.avaliacoes av
      JOIN public.ead_matriculas m ON m.id = av.matricula_id
      JOIN public.ead_alunos al ON al.id = m.aluno_id
      WHERE av.id = avaliacao_questoes.avaliacao_id AND al.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN'))
  );

-- Seed de exemplo: 12 questões para o Curso Teológico Básico, para dar
-- para testar o fluxo de simulado/prova sem depender de IA.
INSERT INTO public.avaliacoes_banco_questoes (course_id, enunciado, opcoes, resposta_correta_index)
SELECT c.id, q.enunciado, q.opcoes::jsonb, q.resposta_correta_index
FROM public.courses c
CROSS JOIN (VALUES
  ('Qual destes é considerado um dos livros históricos do Antigo Testamento?', '["Gênesis", "Josué", "Salmos", "Isaías"]', 1),
  ('O Novo Testamento é composto por quantos livros?', '["24", "27", "39", "66"]', 1),
  ('Quem foi o apóstolo responsável por grande parte das epístolas do Novo Testamento?', '["Pedro", "João", "Paulo", "Tiago"]', 2),
  ('A hermenêutica bíblica trata principalmente de:', '["Música sacra", "Interpretação dos textos", "Organização eclesiástica", "Finanças da igreja"]', 1),
  ('O termo "teologia sistemática" se refere a:', '["Estudo organizado das doutrinas cristãs", "História da igreja primitiva", "Estudo de línguas bíblicas", "Prática de aconselhamento"]', 0),
  ('Qual destes é um dos dons espirituais citados em 1 Coríntios 12?', '["Profecia", "Culinária", "Administração pública", "Engenharia"]', 0),
  ('A Reforma Protestante teve início no século:', '["XIV", "XV", "XVI", "XVIII"]', 2),
  ('O Pentateuco corresponde aos primeiros livros de que parte da Bíblia?', '["Novo Testamento", "Antigo Testamento", "Livros apócrifos", "Epístolas paulinas"]', 1),
  ('Homilética é a disciplina que estuda:', '["A arte de pregar", "A administração eclesiástica", "A música litúrgica", "O direito canônico"]', 0),
  ('Qual destes concílios é considerado central na formulação do cânon bíblico?', '["Concílio de Cartago", "Concílio de Trento (apenas)", "Concílio Vaticano II (apenas)", "Nenhum concílio teve relação com o cânon"]', 0),
  ('A Assembleia de Deus tem origem histórica associada a qual movimento?', '["Movimento pentecostal", "Movimento luterano", "Movimento anglicano", "Movimento ortodoxo"]', 0),
  ('O termo "EBD" utilizado no portal se refere a:', '["Escola Bíblica Dominical", "Estudo Bíblico Diário", "Encontro de Bispos e Diáconos", "Ensino Básico Denominacional"]', 0)
) AS q(enunciado, opcoes, resposta_correta_index)
WHERE c.title = 'Curso Teológico Básico';
