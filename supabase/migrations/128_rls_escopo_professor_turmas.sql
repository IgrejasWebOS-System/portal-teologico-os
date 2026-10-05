-- 128_rls_escopo_professor_turmas.sql
--
-- 04/10/2026, achado durante a construção da Área da Secretaria
-- (Secretário de Setor): a policy de escrita em `professor_turmas`
-- (professor_turmas_write_staff, de antes da migration 111) só checava
-- "é algum tipo de staff?" (GLOBAL_ADMIN/SECTOR_ADMIN/LOCAL_ADMIN), sem
-- olhar unidade nenhuma -- mesma classe de bug que a 111 já corrigiu em
-- professores/ead_matriculas/fin_contas_receber. Um secretário de Setor
-- (ou um LOCAL_ADMIN de núcleo) conseguiria, em tese, vincular/excluir
-- turma de um professor de QUALQUER unidade do sistema, não só da
-- própria -- a tela em si (ProfessorTurmasVinculos, acessada via
-- /dashboard/configuracoes/professores/editar/[id]) só mostra dados já
-- carregados pro professor daquela ficha, mas a RLS é a barreira real.
--
-- Esta migration alinha `professor_turmas` ao mesmo padrão de
-- get_accessible_unit_ids() via professores.unit_id -- select continua
-- aberto (professor_turmas_select_authenticated, qual=true), igual
-- churches: quem precisa listar turmas em formulários (ex.: Nova
-- Matrícula) continua lendo livre; só a escrita passa a ser escopada.

drop policy if exists professor_turmas_write_staff on public.professor_turmas;

create policy professor_turmas_write_scoped on public.professor_turmas
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.professores p
      where p.id = professor_turmas.professor_id
        and p.unit_id is not null
        and p.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.professores p
      where p.id = professor_turmas.professor_id
        and p.unit_id is not null
        and p.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );
