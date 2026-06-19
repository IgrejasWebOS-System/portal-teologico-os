-- ============================================================
-- 002_video_content.sql
-- Migração aditiva — suporte a vídeo nas tabelas de conteúdo
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── lessons ─────────────────────────────────────────────────
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS description          TEXT,
  ADD COLUMN IF NOT EXISTS video_url            TEXT,
  ADD COLUMN IF NOT EXISTS video_type           TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS video_duration_secs  INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail_url        TEXT,
  ADD COLUMN IF NOT EXISTS is_free_preview      BOOLEAN NOT NULL DEFAULT false;

-- Constraint de segurança no tipo
ALTER TABLE lessons
  DROP CONSTRAINT IF EXISTS lessons_video_type_check;
ALTER TABLE lessons
  ADD CONSTRAINT lessons_video_type_check
  CHECK (video_type IN ('none', 'youtube', 'direct', 'virtual'));

-- ── courses ─────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS thumbnail_url  TEXT,
  ADD COLUMN IF NOT EXISTS trailer_url    TEXT,
  ADD COLUMN IF NOT EXISTS featured       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS level          TEXT NOT NULL DEFAULT 'iniciante';

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_level_check;
ALTER TABLE courses
  ADD CONSTRAINT courses_level_check
  CHECK (level IN ('iniciante', 'intermediario', 'avancado'));

-- Só um curso pode ser featured por módulo (recomendado, não obrigatório)
-- Se quiser enforçar: CREATE UNIQUE INDEX ... WHERE featured = true

-- ── ebd_lessons ─────────────────────────────────────────────
ALTER TABLE ebd_lessons
  ADD COLUMN IF NOT EXISTS video_url            TEXT,
  ADD COLUMN IF NOT EXISTS video_type           TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS video_duration_secs  INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail_url        TEXT;

ALTER TABLE ebd_lessons
  DROP CONSTRAINT IF EXISTS ebd_lessons_video_type_check;
ALTER TABLE ebd_lessons
  ADD CONSTRAINT ebd_lessons_video_type_check
  CHECK (video_type IN ('none', 'youtube', 'direct', 'virtual'));

-- ── Índices úteis para o painel admin ───────────────────────
CREATE INDEX IF NOT EXISTS idx_lessons_video_type
  ON lessons (video_type) WHERE video_type <> 'none';

CREATE INDEX IF NOT EXISTS idx_lessons_course_order
  ON lessons (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_courses_featured
  ON courses (featured, module) WHERE featured = true;
