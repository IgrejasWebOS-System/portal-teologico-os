-- ============================================================
-- 138_legado_log_migracao.sql  (16/10/2026)
-- Migracao do sistema antigo - tabelas de LOG/REVERSAO da migracao.
-- Registram exatamente o que a migracao criou, para auditoria e desfazer.
-- Isoladas como as demais legado_*: sem FK, RLS ligado sem policy (so service_role).
-- ============================================================

create table if not exists public.legado_mig_alunos (
  matricula_antiga       text primary key,
  ead_aluno_id           uuid not null,
  criado_pela_migracao   boolean not null,   -- false = ja existia no portal (so anexamos matriculas)
  migrado_em             timestamptz not null default now()
);

create table if not exists public.legado_mig_editions (
  cod_turma_legado       text primary key,
  course_edition_id      uuid not null,
  migrado_em             timestamptz not null default now()
);

create table if not exists public.legado_mig_matriculas (
  cod_matricula_legado   text primary key,
  ead_matricula_id       uuid not null,
  ead_aluno_id           uuid not null,
  numero_matricula       text not null,
  ano                    text not null,
  status_final           text not null,
  regra                  text,
  observacao             text,
  migrado_em             timestamptz not null default now()
);

alter table public.legado_mig_alunos     enable row level security;
alter table public.legado_mig_editions   enable row level security;
alter table public.legado_mig_matriculas enable row level security;
revoke all on public.legado_mig_alunos, public.legado_mig_editions, public.legado_mig_matriculas from anon, authenticated;
