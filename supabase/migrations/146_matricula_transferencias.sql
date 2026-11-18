-- ============================================================
-- 146_matricula_transferencias.sql  (17/11/2026)
-- Historico de TRANSFERENCIA DE ALUNO entre turmas/nucleos (pedido do Joaquim:
-- "aluno estava numa turma numa igreja e passou para outra, mantendo o
-- historico"). A matricula e a MESMA (provas, presenca e parcelas continuam
-- nela); so a turma (course_edition_id) e o professor mudam. Cada troca
-- grava uma linha aqui, so de inclusao.
--
-- Sem FK de proposito (mesmo padrao de aula_presencas_historico/legado_mig_*):
-- o historico sobrevive a qualquer exclusao futura. Guarda tambem o NOME da
-- turma/professor no momento, para ler o historico sem depender de joins.
-- RLS ligado SEM policy: so service_role (as Server Actions) le e grava.
-- Aditiva: tabela nova, nenhum dado existente muda.
-- ============================================================

create table if not exists public.matricula_transferencias (
  id                      uuid primary key default gen_random_uuid(),
  matricula_id            uuid not null,
  aluno_id                uuid not null,
  turma_origem_id         uuid,
  turma_origem_nome       text,
  turma_destino_id        uuid,
  turma_destino_nome      text,
  professor_origem_id     uuid,
  professor_origem_nome   text,
  professor_destino_id    uuid,
  professor_destino_nome  text,
  motivo                  text,
  transferido_por         uuid,
  papel                   text,
  created_at              timestamptz not null default now()
);

create index if not exists idx_matricula_transferencias_matricula
  on public.matricula_transferencias (matricula_id, created_at desc);
create index if not exists idx_matricula_transferencias_aluno
  on public.matricula_transferencias (aluno_id, created_at desc);

alter table public.matricula_transferencias enable row level security;
revoke all on public.matricula_transferencias from anon, authenticated;

comment on table public.matricula_transferencias is
  'Historico (so inclusao) de transferencias de aluno entre turmas/nucleos. Mesma matricula, troca turma e professor. Acesso so via service_role.';
