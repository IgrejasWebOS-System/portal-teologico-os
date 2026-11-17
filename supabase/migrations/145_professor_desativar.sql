-- ============================================================
-- 145_professor_desativar.sql  (17/11/2026)
-- Desativar / reativar professor SEM apagar nada (pedido do Joaquim:
-- "nao vamos excluir nada, mantem o historico"). Professor desativado
-- perde o acesso a /professor (checkIsProfessor passa a exigir ativo = true),
-- mas o cadastro, as turmas antigas, presencas, despesas e auditoria
-- continuam intactos. Reativar devolve o acesso.
--
-- Aditiva: todas as colunas tem default, nenhum dado existente muda
-- (todo professor atual vira ativo = true).
-- ============================================================

alter table public.professores
  add column if not exists ativo boolean not null default true,
  add column if not exists desativado_em timestamptz,
  add column if not exists desativado_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_desativacao text;

create index if not exists idx_professores_ativo on public.professores (ativo);

comment on column public.professores.ativo is
  'false = professor desativado: sem acesso a /professor, fora dos dropdowns de matricula; historico preservado.';
comment on column public.professores.desativado_em is
  'Quando foi desativado (NULL se ativo).';
comment on column public.professores.desativado_por is
  'Login (auth.users) de quem desativou.';
comment on column public.professores.motivo_desativacao is
  'Motivo informado na desativacao (texto livre).';
