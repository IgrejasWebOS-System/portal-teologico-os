-- 134_rls_course_editions_backup_20261002.sql
-- 06/10/2026 — achado pelo painel /admin/saude-sistema (migration 133) e
-- pelo advisor do Supabase: a tabela de sobra de backup
-- public.course_editions_backup_20261002 estava no schema public SEM RLS,
-- ou seja, legivel/alteravel por qualquer um com a chave publica (anon) via
-- API REST.
--
-- Correcao: liga RLS e NAO cria policy (acesso so por service_role/postgres,
-- que ignoram RLS) e revoga os privilegios de anon/authenticated. Os dados
-- sao preservados (nada e apagado). Idempotente e segura em ambientes onde a
-- tabela nao existe (staging): so age se a tabela existir.

do $$
begin
  if to_regclass('public.course_editions_backup_20261002') is not null then
    alter table public.course_editions_backup_20261002 enable row level security;
    revoke all on public.course_editions_backup_20261002 from anon, authenticated;
  end if;
end
$$;
