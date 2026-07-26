-- 052_funcoes_membros.sql
-- Separa "Cargo" (posição eclesiástica/hierárquica, já existente em
-- members.role_id -> ecclesiastical_roles) de "Função" (responsabilidade
-- operacional que o membro exerce numa área/departamento, num escopo
-- de Igreja local ou de Setor inteiro). Uma pessoa pode acumular
-- várias funções ao mesmo tempo (ex: Líder da CIBEPI local + Secretário
-- do Setor). O escopo Setor deriva por padrão do setor da própria
-- igreja do membro, mas pode ser escolhido manualmente.

-- ── Papéis de função (Líder, Secretário, Tesoureiro...) ─────────
create table if not exists function_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table function_roles enable row level security;

create policy function_roles_select_authenticated on function_roles
  for select to authenticated
  using (true);

create policy function_roles_write_staff on function_roles
  for all to authenticated
  using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));

-- ── Atribuição de função a um membro ────────────────────────────
create table if not exists member_functions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  function_role_id uuid not null references function_roles(id) on delete cascade,
  escopo text not null check (escopo in ('IGREJA','SETOR')),
  church_id uuid references churches(id) on delete cascade,
  sector_id uuid references sectors(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint member_functions_escopo_coerente check (
    (escopo = 'IGREJA' and church_id is not null and sector_id is null)
    or
    (escopo = 'SETOR' and sector_id is not null and church_id is null)
  )
);

create index if not exists member_functions_member_idx on member_functions(member_id);
create index if not exists member_functions_sector_idx on member_functions(sector_id);
create index if not exists member_functions_church_idx on member_functions(church_id);

alter table member_functions enable row level security;

create policy member_functions_select_authenticated on member_functions
  for select to authenticated
  using (true);

create policy member_functions_write_staff on member_functions
  for all to authenticated
  using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));
