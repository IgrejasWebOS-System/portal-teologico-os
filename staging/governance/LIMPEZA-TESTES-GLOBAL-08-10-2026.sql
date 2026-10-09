-- LIMPEZA-TESTES-GLOBAL-08-10-2026.sql
-- 08/10/2026, pedido do Joaquim: remover de PRODUCAO os dados de TESTE
-- (alunos, professores e turmas) e os vinculos deles. Varredura somente
-- leitura feita em 08/10/2026; tudo abaixo e por ID EXATO.
--
-- NAO e migration (limpeza pontual de dados). Rodar SO depois de backup:
--   powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-manager-v2.ps1 -SkipCode -PreMigration -Label pre-limpeza-testes
--
-- O QUE SAI
--   Alunos (7):      Aluno Basico Teste 1 e 2, Aluno Medio Teste 1 e 2,
--                    ANTONIO CARLOS (joaquimmscoelho@gmail.com), GIOVANNA BATISTA,
--                    JOSE CARLOS DA SILVA PINTO (CPF 066.802.518-26)
--   Matriculas (7), contas a receber (39 = 13 x 3), avaliacoes (11),
--   respostas de provas publicas (4), perfis e logins (9)
--   Professores (3): Professor Teste 1 e 2, GABRIEL BATISTA DE ASSIS SOARES COELHO
--                    (+ 4 vinculos professor_turmas, em cascata)
--   Turmas 2026 (3): PQ CONCEICAO II, VILA TESTE 2, ANTAO / PE LEAL (+ 10 aulas de calendario)
-- AJUSTE DE DADO
--   Igreja VILA REZENDE estava com is_sede = true por engano -> false.
-- NAO MEXE: igrejas, unidades, setores, alunos reais (inclusive os 25 da Sede).
--
-- Atomico: confere TODAS as contagens antes de apagar; se algo diferir do
-- mapeado, aborta e nada e apagado.

do $$
declare
  v_alunos  constant uuid[] := array[
    'd1fe283f-db64-41bb-87d7-b23f3f7d6f71','6516b013-c517-4bb0-ab19-14f4ac71d49d',
    'c9711286-f0ea-4b22-8fc5-8b8e36092c84','3acabfbb-5d23-4d49-92d5-955abd8d7c75',
    '919ee1f2-37ff-4bfe-a73b-7d9fd2dd0c66','8752ced1-1db1-4b3b-9d09-3ebeb55596dc',
    '23d9cb4d-1e33-4c90-b3d0-01b3f0d9efc9']::uuid[];
  v_mats    constant uuid[] := array[
    '954cffef-c9b3-4627-865d-e941d39b55d0','ab64607c-75ca-4512-8cb7-ef28065fd8f9',
    'fa46842f-2da0-426b-8edd-3d53a53a9f4a','31d140da-19e0-4470-abc2-9f260de717b7',
    'e65bd007-2f17-457c-8578-d01b0e77f5c8','c59dacfd-6b2c-42f0-9249-9c3917be69da',
    'de5e743f-d070-46b8-a098-75c4bfcbd2ec']::uuid[];
  v_profs   constant uuid[] := array[
    '0e6a8000-c0d0-4fad-ae63-da7316f647c3','11b159d3-1412-42ef-a62f-6035a834f58b',
    '0d5ac711-7a8d-46e5-bd6f-150517fdcec9']::uuid[];
  v_turmas  constant uuid[] := array[
    '7d13ecdf-7071-47b5-a852-d03ddbeada0b','a2661530-77ae-4504-aab2-b98cfb26a39c',
    '5c7cefa5-2cd8-46b9-8ee5-cd5275257de0']::uuid[];
  v_vila_rezende constant uuid := '83356a9d-70fd-4070-b85a-277d3005633b';
  v_users   uuid[];
  n_alunos int; n_mats int; n_contas int; n_aval int; n_provas int; n_profs int;
  n_turmas int; n_pt int; n_users int; n_admin int; n_outros_mats int; n_outros_pt int;
begin
  -- usuarios (logins) dos alunos e professores de teste
  select coalesce(array_agg(distinct u), '{}') into v_users from (
    select user_id u from public.ead_alunos where id = any(v_alunos) and user_id is not null
    union
    select user_id from public.professores where id = any(v_profs) and user_id is not null
  ) x;

  select count(*) into n_alunos from public.ead_alunos where id = any(v_alunos);
  select count(*) into n_mats   from public.ead_matriculas where id = any(v_mats) and aluno_id = any(v_alunos);
  select count(*) into n_contas from public.fin_contas_receber where aluno_id = any(v_alunos) and origem_id = any(v_mats);
  select count(*) into n_aval   from public.avaliacoes where matricula_id = any(v_mats);
  select count(*) into n_provas from public.provas_publicas_respostas where ead_aluno_id = any(v_alunos);
  select count(*) into n_profs  from public.professores where id = any(v_profs);
  select count(*) into n_turmas from public.course_editions where id = any(v_turmas);
  select count(*) into n_pt     from public.professor_turmas where professor_id = any(v_profs);
  select count(*) into n_users  from auth.users where id = any(v_users);
  select count(*) into n_admin  from public.admin_roles where user_id = any(v_users);
  -- matriculas/vinculos de OUTRAS pessoas nas turmas e professores que vao sair
  select count(*) into n_outros_mats from public.ead_matriculas
   where course_edition_id = any(v_turmas) and not (id = any(v_mats));
  select count(*) into n_outros_pt from public.professor_turmas
   where course_edition_id = any(v_turmas) and not (professor_id = any(v_profs));

  if n_alunos = 0 and n_mats = 0 and n_profs = 0 and n_turmas = 0 then
    raise notice 'Nada a apagar: ja foi removido.';
  else
    if n_alunos <> 7 or n_mats <> 7 or n_contas <> 39 or n_aval <> 11 or n_provas <> 4
       or n_profs <> 3 or n_turmas <> 3 or n_pt <> 4 or n_users <> 9 or n_admin <> 0
       or n_outros_mats <> 0 or n_outros_pt <> 0 then
      raise exception 'Contagens diferentes do mapeado (alunos=%, mats=%, contas=%, aval=%, provas=%, profs=%, turmas=%, prof_turmas=%, users=%, admin_roles=%, outras_matriculas_nas_turmas=%, outros_vinculos_nas_turmas=%). Nada foi apagado.',
        n_alunos, n_mats, n_contas, n_aval, n_provas, n_profs, n_turmas, n_pt, n_users, n_admin, n_outros_mats, n_outros_pt;
    end if;

    delete from public.fin_contas_receber where aluno_id = any(v_alunos) and origem_id = any(v_mats);
    delete from public.provas_publicas_respostas where ead_aluno_id = any(v_alunos);
    delete from public.ead_matriculas where id = any(v_mats) and aluno_id = any(v_alunos); -- cascade: avaliacoes
    delete from public.professores where id = any(v_profs);                                 -- cascade: professor_turmas
    delete from public.ead_alunos where id = any(v_alunos);
    delete from public.course_editions where id = any(v_turmas);                            -- cascade: calendario
    delete from public.profiles where id = any(v_users);
    delete from auth.users where id = any(v_users);

    raise notice 'Testes removidos: 7 alunos, 7 matriculas, 39 contas, 11 avaliacoes, 4 respostas de prova, 3 professores, 3 turmas, 9 logins.';
  end if;

  update public.churches set is_sede = false where id = v_vila_rezende and is_sede = true;
end
$$;

-- Verificacao (alunos, matriculas, professores, turmas e logins devem dar 0; vila_rezende_sede deve dar false):
select
  (select count(*) from public.ead_alunos where id in ('d1fe283f-db64-41bb-87d7-b23f3f7d6f71','6516b013-c517-4bb0-ab19-14f4ac71d49d','c9711286-f0ea-4b22-8fc5-8b8e36092c84','3acabfbb-5d23-4d49-92d5-955abd8d7c75','919ee1f2-37ff-4bfe-a73b-7d9fd2dd0c66','8752ced1-1db1-4b3b-9d09-3ebeb55596dc','23d9cb4d-1e33-4c90-b3d0-01b3f0d9efc9')) alunos,
  (select count(*) from public.ead_matriculas where id in ('954cffef-c9b3-4627-865d-e941d39b55d0','ab64607c-75ca-4512-8cb7-ef28065fd8f9','fa46842f-2da0-426b-8edd-3d53a53a9f4a','31d140da-19e0-4470-abc2-9f260de717b7','e65bd007-2f17-457c-8578-d01b0e77f5c8','c59dacfd-6b2c-42f0-9249-9c3917be69da','de5e743f-d070-46b8-a098-75c4bfcbd2ec')) matriculas,
  (select count(*) from public.professores where id in ('0e6a8000-c0d0-4fad-ae63-da7316f647c3','11b159d3-1412-42ef-a62f-6035a834f58b','0d5ac711-7a8d-46e5-bd6f-150517fdcec9')) professores,
  (select count(*) from public.course_editions where id in ('7d13ecdf-7071-47b5-a852-d03ddbeada0b','a2661530-77ae-4504-aab2-b98cfb26a39c','5c7cefa5-2cd8-46b9-8ee5-cd5275257de0')) turmas,
  (select count(*) from auth.users where lower(email) in ('alunobasico1@cetadp.teo.br','alunobasico2@cetadp.teo.br','alunomedio1@cetadp.teo.br','alunomedio2@cetadp.teo.br','professorteste1@cetadp.teo.br','professorteste2@cetadp.teo.br','joaquimmscoelho@gmail.com','giovanna.batistasc@gmail.com','satcyber001@gmail.com')) logins,
  (select is_sede from public.churches where id = '83356a9d-70fd-4070-b85a-277d3005633b') vila_rezende_sede;
