-- ============================================================
-- EBD — Escola Bíblica Dominical
-- Portal Teológico · CETADP
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Trimestres
CREATE TABLE IF NOT EXISTS ebd_quarters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year         int  NOT NULL,
  quarter      int  NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  theme        text,
  audience     text NOT NULL,   -- 'ADULTOS' | 'JOVENS' | 'ADOLESCENTES' | 'JUNIORES' | 'PRIMARIOS'
  publisher    text NOT NULL DEFAULT 'CPAD', -- 'CPAD' | 'BETEL' | 'PECC'
  lesson_count int  NOT NULL DEFAULT 13,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (year, quarter, audience, publisher)
);

-- 2. Lições
CREATE TABLE IF NOT EXISTS ebd_lessons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id         uuid NOT NULL REFERENCES ebd_quarters(id) ON DELETE CASCADE,
  lesson_number      int  NOT NULL,
  title              text NOT NULL,

  -- Campos estruturados (indexáveis / buscáveis)
  aureo_text         text,
  aureo_reference    text,
  practical_truth    text,
  suggested_hymns    text,
  class_reading_ref  text,
  class_reading_text text,
  lesson_plan        text,
  introduction       text,
  conclusion         text,

  -- Campos JSONB (conteúdo rico, mas é um documento)
  -- daily_readings: [{day: "Segunda", reference: "Gn 12.3", description: "O chamado..."}]
  daily_readings     jsonb NOT NULL DEFAULT '[]',

  -- topics: [{number: 1, title: "DEUS CHAMA ABRÃO", subtopics: [{number: 1, title: "...", content: "..."}],
  --           synopsis: "...", bibliological_aid: "...", knowledge_expansion: "..."}]
  topics             jsonb NOT NULL DEFAULT '[]',

  -- review_questions: [{number: 1, question: "...", answer: "..."}]
  review_questions   jsonb NOT NULL DEFAULT '[]',

  source_url         text,
  imported_at        timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now(),
  UNIQUE (quarter_id, lesson_number)
);

-- 3. Progresso de leitura por usuário
CREATE TABLE IF NOT EXISTS ebd_lesson_progress (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES ebd_lessons(id) ON DELETE CASCADE,
  read_at    timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE ebd_quarters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebd_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebd_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Trimestres: qualquer usuário autenticado pode ler
CREATE POLICY "ebd_quarters: authenticated read"
  ON ebd_quarters FOR SELECT TO authenticated USING (true);

-- Lições: qualquer usuário autenticado pode ler
CREATE POLICY "ebd_lessons: authenticated read"
  ON ebd_lessons FOR SELECT TO authenticated USING (true);

-- Progresso: usuário só vê e gerencia o seu próprio
CREATE POLICY "ebd_lesson_progress: own rows"
  ON ebd_lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Índices para performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ebd_quarters_audience ON ebd_quarters (audience, year DESC);
CREATE INDEX IF NOT EXISTS idx_ebd_lessons_quarter   ON ebd_lessons (quarter_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_ebd_progress_user     ON ebd_lesson_progress (user_id);
