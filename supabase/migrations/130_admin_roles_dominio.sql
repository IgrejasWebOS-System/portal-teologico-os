-- 130_admin_roles_dominio.sql
-- 04/10/2026 — pedido do Joaquim: o secretário de setor da CETADP NÃO pode
-- ver as movimentações da igreja, e o secretário de setor da igreja NÃO
-- pode ver a CETADP. Até aqui admin_roles só tinha level + unit_id, e a
-- mesma função de escopo (get_accessible_unit_ids) protegia as tabelas dos
-- dois sistemas — quem tinha o setor 001 via TUDO do setor 001.
--
-- Solução: marca de domínio em admin_roles.
--   CETADP = só escola/financeiro/professores da CETADP
--   IGREJA = só membros/transações da igreja
--   AMBOS  = os dois (ex.: secretário geral)
-- Super-Master (level 0) e GLOBAL_ADMIN continuam vendo tudo (as policies
-- já os liberam antes de olhar o escopo).
--
-- Padrão = CETADP (menor privilégio: esquecer de marcar nunca abre dado da
-- igreja). Hoje todo secretário de setor existente usa só CETADP (confirmado
-- pelo Joaquim). Depois de 129 (fin_contas_pagar por núcleo).
-- Aplicar PRIMEIRO só no staging (cjxdroyyplpknygtcdgr).

-- ── 1. Coluna ────────────────────────────────────────────────────
alter table public.admin_roles
  add column if not exists dominio text not null default 'CETADP';

alter table public.admin_roles
  drop constraint if exists admin_roles_dominio_check;
alter table public.admin_roles
  add constraint admin_roles_dominio_check check (dominio in ('CETADP', 'IGREJA', 'AMBOS'));

comment on column public.admin_roles.dominio is
  'CETADP = vê só a escola (matrículas, financeiro CETADP, professores); IGREJA = vê só membros/transações da igreja; AMBOS = os dois. Level 0 (Super-Master) ignora: vê tudo.';

update public.admin_roles set dominio = 'AMBOS' where level = 0;

-- ── 2. Função de escopo por domínio ──────────────────────────────
-- Mesma lógica de get_accessible_unit_ids (migration 059), mas só considera
-- linhas de admin_roles cujo domínio é o pedido (ou AMBOS). Super-Master
-- continua com tudo. get_accessible_unit_ids() original fica intacta.
create or replace function public.get_accessible_unit_ids_dominio(
  p_dominio text,
  p_user_id uuid default auth.uid()
)
returns table(unit_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  with recursive tree as (
    select u.id
    from public.units u
    where u.id in (
      select ar.unit_id from public.admin_roles ar
      where ar.user_id = p_user_id
        and ar.unit_id is not null
        and ar.dominio in (p_dominio, 'AMBOS')
    )
    union all
    select child.id
    from public.units child
    join tree on child.parent_id = tree.id
  )
  select id from public.units
  where exists (
    select 1 from public.admin_roles ar where ar.user_id = p_user_id and ar.level = 0
  )
  union
  select id from tree;
$$;

-- ── 3. Policies CETADP (escola) ──────────────────────────────────
-- Mesma lógica de antes (migrations 111/115/128 + 129); só troca
-- get_accessible_unit_ids() por get_accessible_unit_ids_dominio('CETADP').

-- ead_alunos
drop policy if exists ead_alunos_select_self_or_scoped on public.ead_alunos;
create policy ead_alunos_select_self_or_scoped on public.ead_alunos
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
  );

drop policy if exists ead_alunos_write_scoped on public.ead_alunos;
create policy ead_alunos_write_scoped on public.ead_alunos
  for all to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
  );

-- ead_matriculas
drop policy if exists ead_matriculas_select_scoped on public.ead_matriculas;
create policy ead_matriculas_select_scoped on public.ead_matriculas
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists ead_matriculas_write_scoped on public.ead_matriculas;
create policy ead_matriculas_write_scoped on public.ead_matriculas
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  );

-- fin_contas_receber
drop policy if exists fin_contas_receber_scoped on public.fin_contas_receber;
create policy fin_contas_receber_scoped on public.fin_contas_receber
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = fin_contas_receber.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = fin_contas_receber.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  );

-- fin_contas_pagar (policy criada na 129)
drop policy if exists fin_contas_pagar_scoped on public.fin_contas_pagar;
create policy fin_contas_pagar_scoped on public.fin_contas_pagar
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = fin_contas_pagar.church_id
        and c.unit_id is not null
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = fin_contas_pagar.church_id
        and c.unit_id is not null
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  );

-- nucleo_despesas (obsoleta, mas ainda legível por staff até ser removida)
drop policy if exists nucleo_despesas_staff_select on public.nucleo_despesas;
create policy nucleo_despesas_staff_select on public.nucleo_despesas
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = nucleo_despesas.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  );

-- professores
drop policy if exists professores_select_scoped on public.professores;
create policy professores_select_scoped on public.professores
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
    or user_id = (select auth.uid())
  );

drop policy if exists professores_write_scoped on public.professores;
create policy professores_write_scoped on public.professores
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (unit_id is not null and unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP')))
  );

-- professor_turmas (escrita; leitura segue aberta a autenticados)
drop policy if exists professor_turmas_write_scoped on public.professor_turmas;
create policy professor_turmas_write_scoped on public.professor_turmas
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.professores p
      where p.id = professor_turmas.professor_id
        and p.unit_id is not null
        and p.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.professores p
      where p.id = professor_turmas.professor_id
        and p.unit_id is not null
        and p.unit_id in (select unit_id from get_accessible_unit_ids_dominio('CETADP'))
    )
  );

-- ── 4. Policies IGREJA (membros e transações) ────────────────────
drop policy if exists members_select_scoped on public.members;
create policy members_select_scoped on public.members
  for select to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = members.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('IGREJA'))
    )
  );

drop policy if exists members_write_scoped on public.members;
create policy members_write_scoped on public.members
  for all to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = members.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('IGREJA'))
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = members.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('IGREJA'))
    )
  );

drop policy if exists transactions_select_scoped on public.transactions;
create policy transactions_select_scoped on public.transactions
  for select to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = transactions.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids_dominio('IGREJA'))
    )
  );
