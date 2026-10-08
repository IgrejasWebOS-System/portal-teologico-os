-- LIMPEZA-ALUNO-TESTE-LUCIA-08-10-2026.sql
-- 08/10/2026, pedido do Joaquim: apagar o aluno de TESTE
-- "LUCIA HELENA BATISTA SOARES COELHO" e tudo relacionado, em PRODUCAO.
-- (O pedido veio com a grafia "HELANA"; no banco o nome e "LUCIA HELENA".)
--
-- NAO e migration (e limpeza pontual de dados, por id exato). Rodar SO
-- depois de backup:  backup-manager-v2.ps1 -SkipCode -PreMigration -Label pre-limpeza-lucia
--
-- Mapeado em 08/10/2026 (somente leitura):
--   ead_alunos          f6a6ea50-f826-4088-9f7d-d4c80cd02760  (1)
--   ead_matriculas      3f8e067b-db04-4070-a717-e1f920ac1767  (1, CANCELADO)
--   fin_contas_receber  13 linhas da matricula (11 PENDENTE + 2 PAGO: R$ 65,00 e R$ 25,00,
--                       pago_em 01/10/2026) - nenhuma tabela referencia fin_contas_receber
--   profiles            bc2a1405-313b-4496-99e5-c9b85fcb9798  (MEMBER)
--   auth.users          bc2a1405-313b-4496-99e5-c9b85fcb9798  (luconnection@gmail.com)
--   avaliacoes / provas_publicas_respostas / ead_inscricoes: 0 linhas
--
-- O bloco abaixo e atomico: confere as contagens esperadas ANTES de apagar
-- e aborta (nada e apagado) se algo for diferente do mapeado.

do $$
declare
  v_aluno     constant uuid := 'f6a6ea50-f826-4088-9f7d-d4c80cd02760';
  v_matricula constant uuid := '3f8e067b-db04-4070-a717-e1f920ac1767';
  v_user      constant uuid := 'bc2a1405-313b-4496-99e5-c9b85fcb9798';
  n_aluno int; n_mat int; n_contas int; n_user int;
begin
  select count(*) into n_aluno from public.ead_alunos
   where id = v_aluno and lower(email) = 'luconnection@gmail.com';
  select count(*) into n_mat from public.ead_matriculas
   where id = v_matricula and aluno_id = v_aluno;
  select count(*) into n_contas from public.fin_contas_receber
   where origem_id = v_matricula and aluno_id = v_aluno;
  select count(*) into n_user from auth.users
   where id = v_user and lower(email) = 'luconnection@gmail.com';

  if n_aluno = 0 and n_mat = 0 and n_contas = 0 and n_user = 0 then
    raise notice 'Nada a apagar: ja foi removido.';
    return;
  end if;

  if n_aluno <> 1 or n_mat <> 1 or n_contas <> 13 or n_user <> 1 then
    raise exception 'Contagens diferentes do mapeado (aluno=%, matricula=%, contas=%, user=%). Nada foi apagado.',
      n_aluno, n_mat, n_contas, n_user;
  end if;

  delete from public.fin_contas_receber where origem_id = v_matricula and aluno_id = v_aluno;
  delete from public.ead_matriculas      where id = v_matricula and aluno_id = v_aluno;  -- cascade: avaliacoes (0)
  delete from public.ead_alunos          where id = v_aluno;
  delete from public.profiles            where id = v_user;
  delete from auth.users                 where id = v_user;

  raise notice 'Aluno de teste removido: 1 aluno, 1 matricula, 13 contas a receber, 1 profile, 1 usuario de login.';
end
$$;

-- Verificacao (tudo deve dar 0):
select
  (select count(*) from public.ead_alunos where id = 'f6a6ea50-f826-4088-9f7d-d4c80cd02760') alunos,
  (select count(*) from public.ead_matriculas where id = '3f8e067b-db04-4070-a717-e1f920ac1767') matriculas,
  (select count(*) from public.fin_contas_receber where origem_id = '3f8e067b-db04-4070-a717-e1f920ac1767') contas,
  (select count(*) from public.profiles where id = 'bc2a1405-313b-4496-99e5-c9b85fcb9798') profiles,
  (select count(*) from auth.users where id = 'bc2a1405-313b-4496-99e5-c9b85fcb9798') usuarios;
