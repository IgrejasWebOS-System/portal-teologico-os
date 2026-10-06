-- 133_monitoramento_saude_sistema.sql
-- 06/10/2026 — pedido do Joaquim: um módulo que monitora o Supabase do
-- projeto e, quando algo sair do normal, avisa o que aconteceu (causa
-- técnica) e qual procedimento adotar. Este arquivo cria só a base de
-- dados do módulo (a tela /admin/saude-sistema e a rota de verificação
-- diária /api/cron/saude-supabase usam estas tabelas e a função abaixo).
--
-- Segurança: as duas tabelas têm RLS ligado e NENHUMA policy (acesso só
-- por service_role, no servidor — mesmo padrão de provas_publicas*). A
-- função de saúde é SECURITY DEFINER, fixa o search_path e só o
-- service_role pode executá-la (anon/authenticated NÃO).
-- Idempotente.

-- ── 1. Registro dos backups (preenchido pelo backup-manager-v2.ps1) ──
create table if not exists public.monitor_backups (
  id             uuid primary key default gen_random_uuid(),
  registrado_em  timestamptz not null default now(),
  rotulo         text,
  arquivo        text,
  tamanho_bytes  bigint,
  sha256         text,
  entradas       integer,
  origem         text not null default 'backup-manager-v2'
);
create index if not exists monitor_backups_registrado_em_idx
  on public.monitor_backups (registrado_em desc);
alter table public.monitor_backups enable row level security;
revoke all on public.monitor_backups from anon, authenticated;

-- ── 2. Alertas abertos/resolvidos (deduplicados por código) ──────────
create table if not exists public.monitor_alertas (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  severidade    text not null check (severidade in ('INFO', 'AVISO', 'CRITICO')),
  titulo        text not null,
  detalhe       text,
  primeiro_em   timestamptz not null default now(),
  ultimo_em     timestamptz not null default now(),
  resolvido_em  timestamptz,
  notificado_em timestamptz,
  ocorrencias   integer not null default 1
);
-- No máximo UM alerta aberto por código (evita e-mail repetido).
create unique index if not exists monitor_alertas_aberto_uidx
  on public.monitor_alertas (codigo)
  where resolvido_em is null;
create index if not exists monitor_alertas_ultimo_em_idx
  on public.monitor_alertas (ultimo_em desc);
alter table public.monitor_alertas enable row level security;
revoke all on public.monitor_alertas from anon, authenticated;

-- ── 3. Métricas do banco para o painel ───────────────────────────────
create or replace function public.monitor_saude_banco()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
stable
as $$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'tamanho_banco_bytes', pg_database_size(current_database()),
    'conexoes_ativas', (select count(*) from pg_stat_activity where datname = current_database()),
    'conexoes_maximo', current_setting('max_connections')::int,
    'tabelas_sem_rls', coalesce((
      select jsonb_agg(c.relname order by c.relname)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    ), '[]'::jsonb),
    'maiores_tabelas', coalesce((
      select jsonb_agg(jsonb_build_object('tabela', t.relname, 'bytes', t.total))
        from (
          select c.relname, pg_total_relation_size(c.oid) as total
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'
           order by 2 desc
           limit 5
        ) t
    ), '[]'::jsonb),
    'convites_alunos_falhos', (select count(*) from public.ead_alunos where convite_status = 'FALHOU'),
    'convites_professores_falhos', (select count(*) from public.professores where convite_status = 'FALHOU'),
    'admins_globais', (select count(*) from public.admin_roles where level = 0),
    'perfis_total', (select count(*) from public.profiles)
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.monitor_saude_banco() from public, anon, authenticated;
grant execute on function public.monitor_saude_banco() to service_role;

comment on function public.monitor_saude_banco() is
  'Métricas de saúde do banco para /admin/saude-sistema. Só service_role executa.';
