-- ROLLBACK_128_129_130.sql
-- Gerado em 05/10/2026 a partir das policies REAIS de producao
-- (toduvwtzklntyptcodkf) lidas ANTES de aplicar as migrations 128, 129 e 130.
-- NAO e uma migration: fica fora de supabase/migrations/ de proposito, para
-- nunca ser aplicado na sequencia por engano.
--
-- Use SOMENTE se algo der errado depois de aplicar 128/129/130 em producao.
-- O que desfaz: as policies voltam exatamente ao estado de antes e a funcao
-- get_accessible_unit_ids_dominio e removida.
-- O que NAO desfaz (de proposito, e inofensivo): as colunas novas
-- (fin_contas_pagar.church_id/course_edition_id/professor_id/created_by/
-- origem_nucleo_despesa_id e admin_roles.dominio) e os dados copiados de
-- nucleo_despesas. Remover colunas perde dado e nao e necessario para voltar
-- ao comportamento antigo. O dump pre-migracao e o ponto de retorno completo.
--
-- Rodar tudo de uma vez no SQL Editor de producao, em uma unica execucao.

begin;

-- 1. Remove as policies criadas pelas migrations novas
drop policy if exists fin_contas_pagar_scoped on public.fin_contas_pagar;
drop policy if exists fin_contas_pagar_professor on public.fin_contas_pagar;
drop policy if exists professor_turmas_write_scoped on public.professor_turmas;

-- 2. Recria as policies antigas (definicoes literais de producao)
drop policy if exists fin_contas_pagar_staff on public.fin_contas_pagar;
create policy fin_contas_pagar_staff on public.fin_contas_pagar as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN'::text, 'SECTOR_ADMIN'::text, 'LOCAL_ADMIN'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN'::text, 'SECTOR_ADMIN'::text, 'LOCAL_ADMIN'::text]))))));

drop policy if exists professor_turmas_write_staff on public.professor_turmas;
create policy professor_turmas_write_staff on public.professor_turmas as PERMISSIVE for ALL to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN'::text, 'SECTOR_ADMIN'::text, 'LOCAL_ADMIN'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN'::text, 'SECTOR_ADMIN'::text, 'LOCAL_ADMIN'::text]))))));

-- 3. Policies que a 130 trocou: voltam a usar get_accessible_unit_ids()
drop policy if exists ead_alunos_select_self_or_scoped on public.ead_alunos;
create policy ead_alunos_select_self_or_scoped on public.ead_alunos as PERMISSIVE for SELECT to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))));

drop policy if exists ead_alunos_write_scoped on public.ead_alunos;
create policy ead_alunos_write_scoped on public.ead_alunos as PERMISSIVE for ALL to authenticated
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))
  with check ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))));

drop policy if exists ead_matriculas_select_scoped on public.ead_matriculas;
create policy ead_matriculas_select_scoped on public.ead_matriculas as PERMISSIVE for SELECT to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = ead_matriculas.aluno_id) AND (a.unit_id IS NOT NULL) AND (a.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id)))))) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = ead_matriculas.aluno_id) AND (a.user_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists ead_matriculas_write_scoped on public.ead_matriculas;
create policy ead_matriculas_write_scoped on public.ead_matriculas as PERMISSIVE for ALL to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = ead_matriculas.aluno_id) AND (a.unit_id IS NOT NULL) AND (a.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))))
  with check ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = ead_matriculas.aluno_id) AND (a.unit_id IS NOT NULL) AND (a.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

drop policy if exists fin_contas_receber_scoped on public.fin_contas_receber;
create policy fin_contas_receber_scoped on public.fin_contas_receber as PERMISSIVE for ALL to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = fin_contas_receber.aluno_id) AND (a.unit_id IS NOT NULL) AND (a.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))))
  with check ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM ead_alunos a
  WHERE ((a.id = fin_contas_receber.aluno_id) AND (a.unit_id IS NOT NULL) AND (a.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

drop policy if exists members_select_scoped on public.members;
create policy members_select_scoped on public.members as PERMISSIVE for SELECT to authenticated
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM churches c
  WHERE ((c.id = members.church_id) AND (c.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

drop policy if exists members_write_scoped on public.members;
create policy members_write_scoped on public.members as PERMISSIVE for ALL to authenticated
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM churches c
  WHERE ((c.id = members.church_id) AND (c.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))))
  with check ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM churches c
  WHERE ((c.id = members.church_id) AND (c.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

drop policy if exists nucleo_despesas_staff_select on public.nucleo_despesas;
create policy nucleo_despesas_staff_select on public.nucleo_despesas as PERMISSIVE for SELECT to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM churches c
  WHERE ((c.id = nucleo_despesas.church_id) AND (c.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

drop policy if exists professores_select_scoped on public.professores;
create policy professores_select_scoped on public.professores as PERMISSIVE for SELECT to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id)))) OR (user_id = ( SELECT auth.uid() AS uid))));

drop policy if exists professores_write_scoped on public.professores;
create policy professores_write_scoped on public.professores as PERMISSIVE for ALL to public
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))
  with check ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR ((unit_id IS NOT NULL) AND (unit_id IN ( SELECT get_accessible_unit_ids.unit_id
   FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))));

drop policy if exists transactions_select_scoped on public.transactions;
create policy transactions_select_scoped on public.transactions as PERMISSIVE for SELECT to authenticated
  using ((is_super_master() OR (current_system_role() = 'GLOBAL_ADMIN'::text) OR (EXISTS ( SELECT 1
   FROM churches c
  WHERE ((c.id = transactions.church_id) AND (c.unit_id IN ( SELECT get_accessible_unit_ids.unit_id
           FROM get_accessible_unit_ids() get_accessible_unit_ids(unit_id))))))));

-- 4. Por fim, remove a funcao nova (nenhuma policy a referencia mais)
drop function if exists public.get_accessible_unit_ids_dominio(text, uuid);

commit;
