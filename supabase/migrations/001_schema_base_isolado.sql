-- ============================================================
-- Portal EAD CETADP — schema isolado (portado de swczhmhyqygpdzxwpvfo)
-- Fase 1 do plano de isolamento — 13/07/2026
-- Aplicada ao projeto Supabase toduvwtzklntyptcodkf via MCP
-- (apply_migration), com nome remoto "001_schema_base_isolado".
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tipos ──────────────────────────────────────────────────
CREATE TYPE course_module AS ENUM ('escola', 'cursos');
CREATE TYPE course_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE enrollment_status AS ENUM ('ENROLLED', 'COMPLETED', 'CANCELED');

-- ── Sequências ─────────────────────────────────────────────
CREATE SEQUENCE matricula_ativa_seq START WITH 1000 MINVALUE 1;
CREATE SEQUENCE matricula_inativa_seq START WITH 1 MINVALUE 1;
CREATE SEQUENCE ead_matricula_seq START WITH 1 MINVALUE 1;

-- ── Tabelas (fase 1: colunas + PK, sem FK entre tabelas) ────

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  church_id uuid,
  system_role text NOT NULL DEFAULT 'LOCAL_ADMIN',
  email text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_system_role_check CHECK (system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN','MEMBER']))
);

CREATE TABLE public.sectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'ACTIVE',
  updated_at timestamptz DEFAULT now(),
  headquarters_id uuid,
  neighborhoods text,
  mother_church_id uuid,
  CONSTRAINT sectors_pkey PRIMARY KEY (id),
  CONSTRAINT check_sector_status CHECK (status = ANY (ARRAY['ACTIVE','ARCHIVED']))
);

CREATE TABLE public.churches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector_id uuid,
  is_sector_head boolean DEFAULT false,
  cnpj text,
  address text,
  logo_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  city text,
  state text,
  neighborhood text,
  zip_code text,
  status text DEFAULT 'ACTIVE',
  updated_at timestamptz DEFAULT now(),
  ministry_id uuid,
  is_headquarters boolean DEFAULT false,
  is_mother_church boolean DEFAULT false,
  pastor_name text,
  church_phone text,
  pastor_phone text,
  pastor_matricula text,
  address_number text,
  address_complement text,
  church_type text DEFAULT 'CHURCH',
  parent_id uuid,
  is_sede boolean DEFAULT false,
  CONSTRAINT churches_pkey PRIMARY KEY (id),
  CONSTRAINT check_church_status CHECK (status = ANY (ARRAY['ACTIVE','ARCHIVED']))
);

CREATE TABLE public.ecclesiastical_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  suggested_fee numeric(10,2) DEFAULT 0.00,
  hierarchy_level integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ecclesiastical_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT timezone('utc', now()),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.settings_civil_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_civil_status_pkey PRIMARY KEY (id),
  CONSTRAINT settings_civil_status_name_key UNIQUE (name)
);

CREATE TABLE public.settings_schooling (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_schooling_pkey PRIMARY KEY (id),
  CONSTRAINT settings_schooling_name_key UNIQUE (name)
);

CREATE TABLE public.settings_professions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_professions_pkey PRIMARY KEY (id),
  CONSTRAINT settings_professions_name_key UNIQUE (name)
);

CREATE TABLE public.settings_gender (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_gender_pkey PRIMARY KEY (id),
  CONSTRAINT settings_gender_name_key UNIQUE (name)
);

CREATE TABLE public.settings_custom_regions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  state_uf varchar(2) NOT NULL,
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_custom_regions_pkey PRIMARY KEY (id),
  CONSTRAINT settings_custom_regions_state_uf_name_key UNIQUE (state_uf, name)
);

CREATE TABLE public.member_timeline (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid,
  CONSTRAINT member_timeline_pkey PRIMARY KEY (id)
);

CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  full_name text NOT NULL,
  matricula text,
  cpf text,
  role_id uuid,
  email text,
  phone text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  financial_status text DEFAULT 'UP_TO_DATE',
  updated_at timestamptz DEFAULT timezone('utc', now()),
  number text,
  rg text,
  birth_date text,
  gender text,
  profession text,
  ecclesiastical_status text DEFAULT 'ACTIVE',
  civil_status text,
  schooling text,
  rg_issuer text,
  rg_state text,
  nationality_city text,
  nationality_state text,
  spouse_name text,
  mother_name text,
  father_name text,
  address text,
  zip_code text,
  neighborhood text,
  city text,
  state text,
  photo_url text,
  marriage_date text,
  baptism_date text,
  origin_church text,
  registration_number text,
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_status_check CHECK (status = ANY (ARRAY['ACTIVE','INACTIVE','DISCIPLINE'])),
  CONSTRAINT members_financial_status_check CHECK (financial_status = ANY (ARRAY['UP_TO_DATE','PENDING'])),
  CONSTRAINT unique_registration_number UNIQUE (registration_number)
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  receivable_id uuid,
  amount_paid numeric(10,2) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  payment_method text NOT NULL,
  received_by_profile_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  module course_module NOT NULL,
  status course_status NOT NULL DEFAULT 'DRAFT',
  thumbnail_url text,
  instructor_name text,
  duration_hours integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  trailer_url text,
  featured boolean NOT NULL DEFAULT false,
  level text NOT NULL DEFAULT 'iniciante',
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_level_check CHECK (level = ANY (ARRAY['iniciante','intermediario','avancado']))
);

CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  content_url text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  video_url text,
  video_type text NOT NULL DEFAULT 'none',
  video_duration_secs integer,
  thumbnail_url text,
  is_free_preview boolean NOT NULL DEFAULT false,
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_video_type_check CHECK (video_type = ANY (ARRAY['none','youtube','direct','virtual']))
);

CREATE TABLE public.enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status enrollment_status NOT NULL DEFAULT 'ENROLLED',
  progress_percent integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_progress_percent_check CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id)
);

CREATE TABLE public.lesson_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_completions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_completions_user_id_lesson_id_key UNIQUE (user_id, lesson_id)
);

CREATE TABLE public.ebd_quarters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  quarter integer NOT NULL,
  theme text,
  audience text NOT NULL,
  publisher text NOT NULL DEFAULT 'CPAD',
  lesson_count integer NOT NULL DEFAULT 13,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ebd_quarters_pkey PRIMARY KEY (id),
  CONSTRAINT ebd_quarters_quarter_check CHECK (quarter BETWEEN 1 AND 4),
  CONSTRAINT ebd_quarters_year_quarter_audience_publisher_key UNIQUE (year, quarter, audience, publisher)
);

CREATE TABLE public.ebd_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quarter_id uuid NOT NULL,
  lesson_number integer NOT NULL,
  title text NOT NULL,
  aureo_text text,
  aureo_reference text,
  practical_truth text,
  suggested_hymns text,
  class_reading_ref text,
  class_reading_text text,
  lesson_plan text,
  introduction text,
  conclusion text,
  daily_readings jsonb NOT NULL DEFAULT '[]',
  topics jsonb NOT NULL DEFAULT '[]',
  review_questions jsonb NOT NULL DEFAULT '[]',
  source_url text,
  imported_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  video_url text,
  video_type text NOT NULL DEFAULT 'none',
  video_duration_secs integer,
  thumbnail_url text,
  CONSTRAINT ebd_lessons_pkey PRIMARY KEY (id),
  CONSTRAINT ebd_lessons_video_type_check CHECK (video_type = ANY (ARRAY['none','youtube','direct','virtual'])),
  CONSTRAINT ebd_lessons_quarter_id_lesson_number_key UNIQUE (quarter_id, lesson_number)
);

CREATE TABLE public.ebd_lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ebd_lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT ebd_lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id)
);

CREATE TABLE public.ead_campos_ministerios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'CAMPO',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ead_campos_ministerios_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ead_alunos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  nome_completo text NOT NULL,
  cpf text,
  email text NOT NULL,
  telefone text,
  campo_ministerio_id uuid,
  campo_ministerio_nome text,
  matricula text NOT NULL,
  curso_pretendido text,
  status text NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ead_alunos_pkey PRIMARY KEY (id),
  CONSTRAINT ead_alunos_matricula_key UNIQUE (matricula)
);

CREATE TABLE public.ead_inscricoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  cpf text,
  email text NOT NULL,
  telefone text,
  campo_ministerio_id uuid,
  campo_ministerio_nome text,
  curso_pretendido text NOT NULL,
  mensagem text,
  status text NOT NULL DEFAULT 'PENDENTE',
  aluno_id uuid,
  matricula_gerada text,
  analisado_por uuid,
  analisado_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ead_inscricoes_pkey PRIMARY KEY (id)
);

-- ── Foreign keys (fase 2) ────────────────────────────────────
-- Observação: churches.ministry_id e transactions.receivable_id perderam a FK
-- porque as tabelas de destino (ministries, receivables) pertencem a outro
-- escopo do fornecedor e não são usadas pelo código do portal-teologico-os.
-- As colunas continuam existindo (uuid solto), sem referência.

ALTER TABLE public.churches ADD CONSTRAINT churches_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;
ALTER TABLE public.churches ADD CONSTRAINT churches_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.churches(id) ON DELETE SET NULL;

ALTER TABLE public.sectors ADD CONSTRAINT sectors_headquarters_id_fkey FOREIGN KEY (headquarters_id) REFERENCES public.churches(id);
ALTER TABLE public.sectors ADD CONSTRAINT sectors_mother_church_id_fkey FOREIGN KEY (mother_church_id) REFERENCES public.churches(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id);

ALTER TABLE public.members ADD CONSTRAINT members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.ecclesiastical_roles(id);
ALTER TABLE public.members ADD CONSTRAINT members_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id);

ALTER TABLE public.member_timeline ADD CONSTRAINT member_timeline_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.member_timeline ADD CONSTRAINT member_timeline_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.transactions ADD CONSTRAINT transactions_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_received_by_profile_id_fkey FOREIGN KEY (received_by_profile_id) REFERENCES public.profiles(id);

ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_completions ADD CONSTRAINT lesson_completions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_completions ADD CONSTRAINT lesson_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ebd_lessons ADD CONSTRAINT ebd_lessons_quarter_id_fkey FOREIGN KEY (quarter_id) REFERENCES public.ebd_quarters(id) ON DELETE CASCADE;
ALTER TABLE public.ebd_lesson_progress ADD CONSTRAINT ebd_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.ebd_lessons(id) ON DELETE CASCADE;
ALTER TABLE public.ebd_lesson_progress ADD CONSTRAINT ebd_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ead_alunos ADD CONSTRAINT ead_alunos_campo_ministerio_id_fkey FOREIGN KEY (campo_ministerio_id) REFERENCES public.ead_campos_ministerios(id) ON DELETE SET NULL;
ALTER TABLE public.ead_alunos ADD CONSTRAINT ead_alunos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ead_inscricoes ADD CONSTRAINT ead_inscricoes_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.ead_alunos(id) ON DELETE SET NULL;
ALTER TABLE public.ead_inscricoes ADD CONSTRAINT ead_inscricoes_analisado_por_fkey FOREIGN KEY (analisado_por) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ead_inscricoes ADD CONSTRAINT ead_inscricoes_campo_ministerio_id_fkey FOREIGN KEY (campo_ministerio_id) REFERENCES public.ead_campos_ministerios(id) ON DELETE SET NULL;

-- ── Índices adicionais ───────────────────────────────────────
CREATE INDEX idx_churches_church_type ON public.churches USING btree (church_type);
CREATE INDEX idx_churches_sector_id ON public.churches USING btree (sector_id);
CREATE INDEX idx_churches_parent_id ON public.churches USING btree (parent_id);
CREATE INDEX idx_courses_featured ON public.courses USING btree (featured, module) WHERE (featured = true);
CREATE INDEX idx_ead_alunos_user_id ON public.ead_alunos USING btree (user_id);
CREATE INDEX idx_ead_alunos_matricula ON public.ead_alunos USING btree (matricula);
CREATE INDEX idx_ead_inscricoes_status ON public.ead_inscricoes USING btree (status);
CREATE INDEX idx_ebd_progress_user ON public.ebd_lesson_progress USING btree (user_id);
CREATE INDEX idx_ebd_lessons_quarter ON public.ebd_lessons USING btree (quarter_id, lesson_number);
CREATE INDEX idx_ebd_quarters_audience ON public.ebd_quarters USING btree (audience, year DESC);
CREATE INDEX idx_lessons_video_type ON public.lessons USING btree (video_type) WHERE (video_type <> 'none');
CREATE INDEX idx_lessons_course_order ON public.lessons USING btree (course_id, order_index);
CREATE UNIQUE INDEX unique_cpf_if_not_empty ON public.members USING btree (cpf) WHERE (cpf IS NOT NULL AND cpf <> '');
