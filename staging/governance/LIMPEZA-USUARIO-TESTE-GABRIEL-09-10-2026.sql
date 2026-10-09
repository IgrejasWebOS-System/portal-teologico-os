-- LIMPEZA-USUARIO-TESTE-GABRIEL-09-10-2026.sql
-- 09/10/2026, pedido do Joaquim: apagar de PRODUCAO o usuario de TESTE
-- "GABRIEL BATISTA DE ASSIS SOARES COELHO" (joaquimmscoelho@outlook.com,
-- exibido em Acessos como LOCAL_ADMIN N4 - CETADP, igreja NHO QUIM).
--
-- NAO e migration (limpeza pontual de dados, por id exato). Rodar SO depois de backup:
--   powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-manager-v2.ps1 -SkipCode -PreMigration -Label pre-limpeza-gabriel
--
-- Mapeado em 09/10/2026 (somente leitura):
--   auth.users   0459c090-2920-4bf5-b2bf-14181b4d9576  (ultimo login 07/10/2026)
--   profiles     0459c090-... (LOCAL_ADMIN)
--   admin_roles  9c658992-8317-4f98-9fda-c6eb0a0ff838  (nivel 3 / CETADP, unidade c5f52522-...)
--                042ebd12-4e54-4d4a-989a-6381132688ed  (nivel 4 / CETADP, unidade dc0a0e9a-... = NHO QUIM)
--   auth.identities: 1 (cascade)
--   Professor/aluno vinculado: nenhum (ja removidos na limpeza global de 08/10)
--   Convites feitos por ele a OUTROS usuarios: nenhum
-- NAO MEXE: a igreja/unidade NHO QUIM (sobra; decidir depois), setores, demais usuarios.
--
-- Atomico: confere as contagens antes de apagar; se algo diferir, aborta.

do $$
declare
  v_user constant uuid := '0459c090-2920-4bf5-b2bf-14181b4d9576';
  v_roles constant uuid[] := array['9c658992-8317-4f98-9fda-c6eb0a0ff838','042ebd12-4e54-4d4a-989a-6381132688ed']::uuid[];
  n_user int; n_prof int; n_roles int; n_outros int; n_profissionais int; n_alunos int;
begin
  select count(*) into n_user  from auth.users where id = v_user and lower(email) = 'joaquimmscoelho@outlook.com';
  select count(*) into n_prof  from public.profiles where id = v_user;
  select count(*) into n_roles from public.admin_roles where user_id = v_user and id = any(v_roles);
  select count(*) into n_outros from public.admin_roles where invited_by = v_user and user_id <> v_user;
  select count(*) into n_profissionais from public.professores where user_id = v_user;
  select count(*) into n_alunos from public.ead_alunos where user_id = v_user;

  if n_user = 0 and n_prof = 0 and n_roles = 0 then
    raise notice 'Nada a apagar: ja foi removido.';
    return;
  end if;

  if n_user <> 1 or n_prof <> 1 or n_roles <> 2 or n_outros <> 0 or n_profissionais <> 0 or n_alunos <> 0 then
    raise exception 'Contagens diferentes do mapeado (user=%, profile=%, admin_roles=%, convites_a_outros=%, professor=%, aluno=%). Nada foi apagado.',
      n_user, n_prof, n_roles, n_outros, n_profissionais, n_alunos;
  end if;

  delete from public.admin_roles where user_id = v_user;   -- inclui o proprio invited_by (NO ACTION)
  delete from public.profiles where id = v_user;
  delete from auth.users where id = v_user;                -- cascade: auth.identities

  raise notice 'Usuario de teste removido: 1 login, 1 perfil, 2 acessos (admin_roles).';
end
$$;

-- Verificacao (tudo deve dar 0):
select
  (select count(*) from auth.users where id = '0459c090-2920-4bf5-b2bf-14181b4d9576') usuarios,
  (select count(*) from public.profiles where id = '0459c090-2920-4bf5-b2bf-14181b4d9576') perfis,
  (select count(*) from public.admin_roles where user_id = '0459c090-2920-4bf5-b2bf-14181b4d9576') acessos;
