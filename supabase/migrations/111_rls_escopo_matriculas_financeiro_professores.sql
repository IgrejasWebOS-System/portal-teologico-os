-- 111_rls_escopo_matriculas_financeiro_professores.sql
--
-- 21/09/2026, achado em teste (Joaquim): um professor com "Acesso ao
-- núcleo de ensino" (admin_roles.level = 4 / profiles.system_role =
-- LOCAL_ADMIN, escopado a um unit_id específico) conseguia, na prática,
-- ver e editar matrículas, contas a receber e a lista completa de
-- professores de QUALQUER unidade do sistema -- não só do próprio núcleo.
--
-- Causa raiz: as policies de ead_matriculas, fin_contas_receber e
-- professores (021/027/042) só checavam "profiles.system_role é algum
-- tipo de staff?" (GLOBAL_ADMIN/SECTOR_ADMIN/LOCAL_ADMIN), sem olhar
-- unit_id nenhum -- diferente de churches/sectors/members/transactions
-- (061) e ead_alunos (062), que já usam get_accessible_unit_ids() (059)
-- pra escopar por unidade. Esta migration alinha as 3 tabelas que
-- ficaram de fora com o mesmo padrão já validado.
--
-- Importante: get_accessible_unit_ids() já devolve TODAS as unidades pra
-- quem tem admin_roles.level = 0 (Super-Master) -- e GLOBAL_ADMIN/
-- is_super_master() continuam com bypass explícito abaixo, igual às
-- policies de referência, então nada muda pro Super-Master/GLOBAL_ADMIN.
--
-- ead_matriculas e fin_contas_receber não têm unit_id próprio -- o
-- escopo vem de ead_alunos.unit_id via aluno_id (mesma lógica de
-- ead_alunos_write_scoped em 062). Se o aluno estiver sem unit_id
-- (não deveria acontecer no cadastro atual, mas por segurança), a linha
-- fica visível só pro Super-Master/GLOBAL_ADMIN até o unit_id do aluno
-- ser corrigido -- postura conservadora (nega por padrão), nunca o
-- contrário.
--
-- ATENÇÃO: esta migration cobre o acesso via RLS (cliente anon/normal).
-- Várias Server Actions destas áreas usam o cliente service_role
-- (createAdminClient()), que ignora RLS -- essas seguem precisando de
-- uma checagem de nível/unidade dentro da própria action (fora do
-- escopo desta migration; ver aviso na resposta ao Joaquim).

-- ── professores ──────────────────────────────────────────────
drop policy if exists professores_select_authenticated on public.professores;
drop policy if exists professores_write_staff on public.professores;

create policy professores_select_scoped on public.professores
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (
      unit_id is not null
      and unit_id in (select unit_id from get_accessible_unit_ids())
    )
    or user_id = auth.uid()
  );

create policy professores_write_scoped on public.professores
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (
      unit_id is not null
      and unit_id in (select unit_id from get_accessible_unit_ids())
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or (
      unit_id is not null
      and unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );

-- ── ead_matriculas ───────────────────────────────────────────
drop policy if exists ead_matriculas_select on public.ead_matriculas;
drop policy if exists ead_matriculas_write_staff on public.ead_matriculas;

create policy ead_matriculas_select_scoped on public.ead_matriculas
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids())
    )
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id and a.user_id = auth.uid()
    )
  );

create policy ead_matriculas_write_scoped on public.ead_matriculas
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );

-- ── fin_contas_receber ───────────────────────────────────────
drop policy if exists fin_contas_receber_staff on public.fin_contas_receber;

create policy fin_contas_receber_scoped on public.fin_contas_receber
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = fin_contas_receber.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_alunos a
      where a.id = fin_contas_receber.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );
