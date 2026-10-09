-- 135_auditoria_acoes.sql
-- 09/10/2026, pedido do Joaquim: auditoria "quem fez, em qual papel" para
-- pessoas que acumulam papeis (secretaria + professor(a) + aluno(a)).
-- Cada acao sensivel (matricula, parcelas, concessao de acesso) e
-- tentativa BLOQUEADA de autoatendimento grava uma linha aqui.
--
-- Seguranca: RLS ligado e NENHUMA policy (acesso so por service_role, no
-- servidor — mesmo padrao de monitor_backups/monitor_alertas); anon e
-- authenticated sem nenhum privilegio. A tela /admin/auditoria (so admin
-- global, nivel 0) le via service_role. Idempotente.

create table if not exists public.auditoria_acoes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  ator_user_id  uuid,            -- login de quem fez (sem FK: o registro sobrevive a exclusao do usuario)
  ator_nome     text,            -- nome no momento da acao
  papel         text not null,   -- PROFESSOR | SECRETARIA | ADMIN_GLOBAL
  acao          text not null,   -- ex.: BAIXAR_PARCELA, CRIAR_MATRICULA, AUTOATENDIMENTO_BLOQUEADO
  entidade      text,            -- ex.: fin_contas_receber, ead_matriculas, admin_roles
  entidade_id   text,
  aluno_id      uuid,            -- aluno(a) afetado(a), quando houver (sem FK)
  detalhe       jsonb
);

create index if not exists auditoria_acoes_created_at_idx on public.auditoria_acoes (created_at desc);
create index if not exists auditoria_acoes_ator_idx on public.auditoria_acoes (ator_user_id, created_at desc);
create index if not exists auditoria_acoes_acao_idx on public.auditoria_acoes (acao, created_at desc);

alter table public.auditoria_acoes enable row level security;
revoke all on public.auditoria_acoes from anon, authenticated;

comment on table public.auditoria_acoes is
  'Auditoria de acoes sensiveis (quem fez, em qual papel). So service_role; leitura em /admin/auditoria (nivel 0).';
