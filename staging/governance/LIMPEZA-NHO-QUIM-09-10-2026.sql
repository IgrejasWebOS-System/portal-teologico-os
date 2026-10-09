-- LIMPEZA-NHO-QUIM-09-10-2026.sql
-- 09/10/2026, pedido do Joaquim: a igreja/unidade "NHO QUIM" e de TESTE.
-- Remove de PRODUCAO a unidade, a igreja e a turma 2026 "NHOQUIM".
--
-- NAO e migration (limpeza pontual de dados, por id exato). Rodar SO depois de backup:
--   powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-manager-v2.ps1 -SkipCode -PreMigration -Label pre-limpeza-nhoquim
--
-- Mapeado em 09/10/2026 (somente leitura):
--   units          dc0a0e9a-9347-4641-ab7a-d6d2a06bb693  (IGREJA, filha do setor c5f52522-...)
--   churches       b2133a4d-2572-4e12-a8da-ad636e6ecacc  (NHO QUIM, nao e Sede)
--   course_editions 3f90cd8b-33e5-4592-8021-287555fbedce (NHOQUIM, 2026) - sem matriculas,
--                   professor_turmas, pedidos, certificados, contas a pagar nem calendario
--   Nenhum aluno, professor ou acesso (admin_roles) aponta para esta unidade/igreja.
-- NAO MEXE: setor pai, demais igrejas, turmas e usuarios.
--
-- Atomico: confere as contagens antes de apagar; se algo diferir, aborta.

do $$
declare
  v_unit   constant uuid := 'dc0a0e9a-9347-4641-ab7a-d6d2a06bb693';
  v_church constant uuid := 'b2133a4d-2572-4e12-a8da-ad636e6ecacc';
  v_turma  constant uuid := '3f90cd8b-33e5-4592-8021-287555fbedce';
  n_unit int; n_church int; n_turma int;
  n_matr int; n_pt int; n_alunos int; n_profs int; n_roles int; n_outras_turmas int;
begin
  select count(*) into n_unit   from public.units where id = v_unit and name = 'NHO QUIM';
  select count(*) into n_church from public.churches where id = v_church and unit_id = v_unit;
  select count(*) into n_turma  from public.course_editions where id = v_turma and unit_id = v_unit;
  select count(*) into n_matr   from public.ead_matriculas where course_edition_id = v_turma;
  select count(*) into n_pt     from public.professor_turmas where course_edition_id = v_turma;
  select count(*) into n_alunos from public.ead_alunos where church_id = v_church;
  select count(*) into n_profs  from public.professores where church_id = v_church or unit_id = v_unit;
  select count(*) into n_roles  from public.admin_roles where unit_id = v_unit;
  select count(*) into n_outras_turmas from public.course_editions where unit_id = v_unit and id <> v_turma;

  if n_unit = 0 and n_church = 0 and n_turma = 0 then
    raise notice 'Nada a apagar: ja foi removido.';
    return;
  end if;

  if n_unit <> 1 or n_church <> 1 or n_turma <> 1 or n_matr <> 0 or n_pt <> 0
     or n_alunos <> 0 or n_profs <> 0 or n_roles <> 0 or n_outras_turmas <> 0 then
    raise exception 'Contagens diferentes do mapeado (unit=%, church=%, turma=%, matriculas=%, prof_turmas=%, alunos=%, professores=%, acessos=%, outras_turmas=%). Nada foi apagado.',
      n_unit, n_church, n_turma, n_matr, n_pt, n_alunos, n_profs, n_roles, n_outras_turmas;
  end if;

  delete from public.course_editions where id = v_turma;
  delete from public.churches where id = v_church;
  delete from public.units where id = v_unit;

  raise notice 'NHO QUIM removida: 1 turma, 1 igreja, 1 unidade.';
end
$$;

-- Verificacao (tudo deve dar 0):
select
  (select count(*) from public.units where id = 'dc0a0e9a-9347-4641-ab7a-d6d2a06bb693') unidades,
  (select count(*) from public.churches where id = 'b2133a4d-2572-4e12-a8da-ad636e6ecacc') igrejas,
  (select count(*) from public.course_editions where id = '3f90cd8b-33e5-4592-8021-287555fbedce') turmas;
