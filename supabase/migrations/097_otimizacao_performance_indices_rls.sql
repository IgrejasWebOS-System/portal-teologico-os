-- ============================================================
-- 097_otimizacao_performance_indices_rls.sql
--
-- Migration de OTIMIZAÇÃO DE PERFORMANCE, sem mudança de lógica de
-- negócio nem de regras de acesso. Duas frentes, ambas apontadas pelo
-- advisor de performance do Supabase (get_advisors) em 25/09/2026:
--
-- 1) 45 foreign keys sem índice de cobertura — cada join nessas colunas
--    (ex.: ead_alunos.church_id, professores.sector_id, fin_contas_receber
--    .fin_lancamento_id) faz table scan em vez de index scan. Hoje o banco
--    tem poucas centenas de linhas e isso não se sente; com milhares de
--    igrejas/membros/alunos vira gargalo real.
--
-- 2) 53 políticas de RLS chamando auth.uid() "nu" em vez de
--    (select auth.uid()). Sem o (select ...), o Postgres reavalia a
--    função auth.uid() PARA CADA LINHA candidata da tabela ao aplicar a
--    política, em vez de resolver uma vez por consulta (o otimizador do
--    Postgres consegue tratar "(select auth.uid())" como um InitPlan,
--    calculado uma única vez). Esse é o ponto que mais escala mal: RLS é
--    tocada em praticamente toda query do sistema, então a reavaliação
--    por linha é o que primeiro deixa telas lentas e depois, sob carga
--    concorrente (vários secretários/professores ao mesmo tempo), pode
--    travar.
--
-- Nenhuma condição de acesso muda: é exatamente a mesma regra, só escrita
-- de um jeito que o Postgres executa uma vez em vez de N vezes.
--
-- Aplicada e verificada em staging (cjxdroyyplpknygtcdgr) em 25/09/2026:
-- 0 FKs sem índice e 0 políticas com auth.uid() "nu" restantes depois
-- de rodar este arquivo. Pronta para ir pra produção pelo fluxo normal
-- (staging -> PR -> apply_migration em produção).
-- ============================================================


-- ------------------------------------------------------------
-- PARTE 1 — Índices para as 45 foreign keys sem cobertura
-- ------------------------------------------------------------

create index if not exists idx_admin_roles_invited_by on public.admin_roles(invited_by);
create index if not exists idx_avaliacoes_lesson_id on public.avaliacoes(lesson_id);
create index if not exists idx_certificates_course_edition_id on public.certificates(course_edition_id);
create index if not exists idx_certificates_course_id on public.certificates(course_id);
create index if not exists idx_certificates_enrollment_id on public.certificates(enrollment_id);
create index if not exists idx_course_pricing_updated_by on public.course_pricing(updated_by);
create index if not exists idx_ead_alunos_campo_ministerio_id on public.ead_alunos(campo_ministerio_id);
create index if not exists idx_ead_alunos_church_id on public.ead_alunos(church_id);
create index if not exists idx_ead_alunos_member_id on public.ead_alunos(member_id);
create index if not exists idx_ead_alunos_sector_id on public.ead_alunos(sector_id);
create index if not exists idx_ead_inscricoes_aluno_id on public.ead_inscricoes(aluno_id);
create index if not exists idx_ead_inscricoes_analisado_por on public.ead_inscricoes(analisado_por);
create index if not exists idx_ead_inscricoes_campo_ministerio_id on public.ead_inscricoes(campo_ministerio_id);
create index if not exists idx_ead_matriculas_course_edition_id on public.ead_matriculas(course_edition_id);
create index if not exists idx_ead_matriculas_matriculado_por on public.ead_matriculas(matriculado_por);
create index if not exists idx_ead_matriculas_professor_id on public.ead_matriculas(professor_id);
create index if not exists idx_enrollments_course_edition_id on public.enrollments(course_edition_id);
create index if not exists idx_fin_caixa_diario_aberto_por on public.fin_caixa_diario(aberto_por);
create index if not exists idx_fin_caixa_diario_fechado_por on public.fin_caixa_diario(fechado_por);
create index if not exists idx_fin_contas_pagar_baixado_por on public.fin_contas_pagar(baixado_por);
create index if not exists idx_fin_contas_pagar_fin_lancamento_id on public.fin_contas_pagar(fin_lancamento_id);
create index if not exists idx_fin_contas_receber_aluno_user_id on public.fin_contas_receber(aluno_user_id);
create index if not exists idx_fin_contas_receber_baixado_por on public.fin_contas_receber(baixado_por);
create index if not exists idx_fin_contas_receber_fin_lancamento_id on public.fin_contas_receber(fin_lancamento_id);
create index if not exists idx_fin_lancamentos_criado_por on public.fin_lancamentos(criado_por);
create index if not exists idx_loja_leads_crm_atualizado_por on public.loja_leads_crm(atualizado_por);
create index if not exists idx_member_functions_department_id on public.member_functions(department_id);
create index if not exists idx_member_functions_function_role_id on public.member_functions(function_role_id);
create index if not exists idx_member_timeline_created_by on public.member_timeline(created_by);
create index if not exists idx_member_timeline_member_id on public.member_timeline(member_id);
create index if not exists idx_members_church_id on public.members(church_id);
create index if not exists idx_members_role_id on public.members(role_id);
create index if not exists idx_patrimony_depreciations_lancamento_id on public.patrimony_depreciations(lancamento_id);
create index if not exists idx_patrimony_items_categoria_financeira_id on public.patrimony_items(categoria_financeira_id);
create index if not exists idx_product_stock_movements_criado_por on public.product_stock_movements(criado_por);
create index if not exists idx_products_course_id on public.products(course_id);
create index if not exists idx_professores_church_id on public.professores(church_id);
create index if not exists idx_professores_member_id on public.professores(member_id);
create index if not exists idx_professores_sector_id on public.professores(sector_id);
create index if not exists idx_professores_unit_id on public.professores(unit_id);
create index if not exists idx_profiles_church_id on public.profiles(church_id);
create index if not exists idx_sectors_headquarters_id on public.sectors(headquarters_id);
create index if not exists idx_sectors_mother_church_id on public.sectors(mother_church_id);
create index if not exists idx_sectors_regiao_id on public.sectors(regiao_id);
create index if not exists idx_transactions_church_id on public.transactions(church_id);
create index if not exists idx_transactions_received_by_profile_id on public.transactions(received_by_profile_id);


-- ------------------------------------------------------------
-- PARTE 2 — RLS: trocar auth.uid() "nu" por (select auth.uid())
-- Mesma regra de acesso, avaliada uma vez por consulta em vez de uma
-- vez por linha. Só ALTER POLICY (USING/WITH CHECK inalterados em
-- significado); nenhuma tabela ganha ou perde policy.
-- ------------------------------------------------------------

alter policy admin_roles_select_own_or_super on public.admin_roles
  using ((user_id = (select auth.uid())) or is_super_master());

alter policy avaliacao_questoes_select on public.avaliacao_questoes
  using (
    (exists (
      select 1 from avaliacoes av
      join ead_matriculas m on m.id = av.matricula_id
      join ead_alunos al on al.id = m.aluno_id
      where av.id = avaliacao_questoes.avaliacao_id
        and al.user_id = (select auth.uid())
    ))
    or (exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
    ))
  );

alter policy avaliacoes_select on public.avaliacoes
  using (
    (exists (
      select 1 from ead_matriculas m
      join ead_alunos al on al.id = m.aluno_id
      where m.id = avaliacoes.matricula_id
        and al.user_id = (select auth.uid())
    ))
    or (exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
    ))
  );

alter policy avaliacoes_banco_questoes_staff on public.avaliacoes_banco_questoes
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy avaliacoes_teste_licao_banco_staff on public.avaliacoes_teste_licao_banco
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy certificates_delete_staff on public.certificates
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy certificates_update_staff on public.certificates
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy certificates_write_staff on public.certificates
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy course_editions_write_staff on public.course_editions
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy course_pricing_write_staff on public.course_pricing
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy courses_write_staff on public.courses
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy departments_write_staff on public.departments
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy ead_alunos_select_self_or_scoped on public.ead_alunos
  using (
    (user_id = (select auth.uid()))
    or is_super_master()
    or (current_system_role() = 'GLOBAL_ADMIN'::text)
    or ((unit_id is not null) and (unit_id in (
      select get_accessible_unit_ids.unit_id from get_accessible_unit_ids() get_accessible_unit_ids(unit_id)
    )))
  );

alter policy ead_campos_write_staff on public.ead_campos_ministerios
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy ead_inscricoes_select_staff on public.ead_inscricoes
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy ead_inscricoes_update_staff on public.ead_inscricoes
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy ead_matriculas_select_scoped on public.ead_matriculas
  using (
    is_super_master()
    or (current_system_role() = 'GLOBAL_ADMIN'::text)
    or (exists (
      select 1 from ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.unit_id is not null
        and a.unit_id in (select get_accessible_unit_ids.unit_id from get_accessible_unit_ids() get_accessible_unit_ids(unit_id))
    ))
    or (exists (
      select 1 from ead_alunos a
      where a.id = ead_matriculas.aluno_id
        and a.user_id = (select auth.uid())
    ))
  );

alter policy ebd_lesson_progress_own on public.ebd_lesson_progress
  using (user_id = (select auth.uid()));

alter policy ebd_lessons_write_staff on public.ebd_lessons
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy ebd_quarters_write_staff on public.ebd_quarters
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy eccl_roles_write_staff on public.ecclesiastical_roles
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy enrollments_insert_own on public.enrollments
  with check (user_id = (select auth.uid()));

alter policy enrollments_select_own on public.enrollments
  using (user_id = (select auth.uid()));

alter policy enrollments_update_own on public.enrollments
  using (user_id = (select auth.uid()));

alter policy fin_caixa_diario_staff on public.fin_caixa_diario
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy fin_categorias_staff on public.fin_categorias
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy fin_contas_pagar_staff on public.fin_contas_pagar
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy fin_lancamentos_staff on public.fin_lancamentos
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy lesson_completions_insert_own on public.lesson_completions
  with check (user_id = (select auth.uid()));

alter policy lesson_completions_select_own on public.lesson_completions
  using (user_id = (select auth.uid()));

alter policy lessons_write_staff on public.lessons
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy loja_leads_crm_staff on public.loja_leads_crm
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy member_timeline_insert_staff on public.member_timeline
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy order_items_insert_own on public.order_items
  with check (exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and o.user_id = (select auth.uid())
  ));

alter policy order_items_select on public.order_items
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or exists (
          select 1 from profiles
          where profiles.id = (select auth.uid())
            and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
        )
      )
  ));

alter policy order_items_write_staff on public.order_items
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy orders_insert_own on public.orders
  with check (user_id = (select auth.uid()));

alter policy orders_select_own on public.orders
  using (
    (user_id = (select auth.uid()))
    or (exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
    ))
  );

alter policy orders_update_staff on public.orders
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy patrimony_depreciations_staff on public.patrimony_depreciations
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy patrimony_items_staff on public.patrimony_items
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy patrimony_movements_staff on public.patrimony_movements
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy product_stock_movements_staff on public.product_stock_movements
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy products_write_staff on public.products
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy professor_turmas_write_staff on public.professor_turmas
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy professores_select_scoped on public.professores
  using (
    is_super_master()
    or (current_system_role() = 'GLOBAL_ADMIN'::text)
    or ((unit_id is not null) and (unit_id in (
      select get_accessible_unit_ids.unit_id from get_accessible_unit_ids() get_accessible_unit_ids(unit_id)
    )))
    or (user_id = (select auth.uid()))
  );

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);

alter policy regioes_write_staff on public.regioes
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy settings_civil_status_write_staff on public.settings_civil_status
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy settings_custom_regions_write_staff on public.settings_custom_regions
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy settings_gender_write_staff on public.settings_gender
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy settings_professions_write_staff on public.settings_professions
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

alter policy settings_schooling_write_staff on public.settings_schooling
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
  ));

-- Encontrada só em staging (tabela de uma migration mais recente, ainda
-- não replicada em produção) — mesmo padrão "staff", mesmo fix. Envolvida
-- em DO block condicional pra essa migration poder ser aplicada em
-- produção sem quebrar antes dessa tabela existir lá.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='avaliacoes_banco_questoes_licao') then
    execute $ddl$
      alter policy avaliacoes_banco_questoes_licao_staff on public.avaliacoes_banco_questoes_licao
        using (exists (
          select 1 from profiles
          where profiles.id = (select auth.uid())
            and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
        ))
        with check (exists (
          select 1 from profiles
          where profiles.id = (select auth.uid())
            and profiles.system_role = any (array['GLOBAL_ADMIN'::text,'SECTOR_ADMIN'::text,'LOCAL_ADMIN'::text])
        ))
    $ddl$;
  end if;
end $$;
