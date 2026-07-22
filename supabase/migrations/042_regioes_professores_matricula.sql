-- 042_regioes_professores_matricula.sql
-- Novas entidades pedidas por Joaquim para /dashboard/configuracoes:
--   1) Região (agrupamento geográfico de igrejas, cruza setores)
--   2) Professores (setor + igreja + responsável buscado por matrícula)
--   3) Snapshot de cargo do responsável em churches (Sub-congregações/Células/Igrejas)

-- ── 1) Região ──────────────────────────────────────────────────
create table if not exists regioes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table churches
  add column if not exists regiao_id uuid references regioes(id) on delete set null;

alter table regioes enable row level security;

create policy regioes_select_authenticated on regioes
  for select
  using (true);

create policy regioes_write_staff on regioes
  for all
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  ));

-- ── 2) Cargo do responsável (snapshot) em churches ────────────────
alter table churches
  add column if not exists pastor_role text;

-- ── 3) Professores ────────────────────────────────────────────
create table if not exists professores (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid references sectors(id) on delete set null,
  church_id uuid references churches(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  matricula text,
  nome_completo text not null,
  cargo text,
  telefone text,
  created_at timestamptz not null default now()
);

alter table professores enable row level security;

create policy professores_select_authenticated on professores
  for select
  using (true);

create policy professores_write_staff on professores
  for all
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  ));
