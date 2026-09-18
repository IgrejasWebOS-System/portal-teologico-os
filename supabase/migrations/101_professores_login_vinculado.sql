-- ============================================================
-- 101_professores_login_vinculado.sql
--
-- Módulo 1 (RBAC "Professor de turma") — decisão do Joaquim em
-- 13/09/2026: professor passa a ter login próprio, com uma área restrita
-- só aos alunos vinculados a ele (ead_matriculas.professor_id, coluna que
-- já existia desde a migration 044). Antes, `professores` era só um
-- cadastro descritivo usado nos dropdowns de matrícula — não tinha
-- nenhuma ponte com auth.users.
--
-- `user_id` fica NULLABLE de propósito: nem todo professor cadastrado
-- precisa ter login (só quem a secretaria convidar explicitamente).
-- ============================================================

alter table public.professores
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Um mesmo login não pode ser vinculado a dois professores diferentes.
create unique index if not exists professores_user_id_key
  on public.professores (user_id)
  where user_id is not null;

comment on column public.professores.user_id is
  'Login do professor (auth.users), quando a secretaria convida ele a acessar o sistema. NULL = professor só cadastrado, sem acesso.';
