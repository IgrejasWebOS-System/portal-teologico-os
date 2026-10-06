-- LIMPEZA DE ALUNOS DUPLICADOS POR CPF (producao, toduvwtzklntyptcodkf)
-- Achado em 05/10/2026: o indice unico ead_alunos_cpf_unique compara o texto
-- do CPF cru, e a base tem CPFs com e sem mascara -- o mesmo CPF entrou duas
-- vezes. Dois casos (conferidos em somente-leitura em 05/10/2026):
--
--  1) ANA PAULA DE OLIVEIRA HONORIO  (cpf 163.210.718-03)
--     MANTER : aluno d06561a5-0ced-427b-88b3-f74a80d58304 / matricula
--              2ac549a8-8721-4921-9f82-fefebdfe38ec (CETADP-2026-0068,
--              13 parcelas, 10 pagas, ficha completa)
--     REMOVER: aluno b9e32ed7-8928-4f96-92fb-690786bf8b26 / matricula
--              39eb27db-4529-40fa-9d81-8a92510d0b92 (CETADP-2026-0124,
--              criada 05/10 22:24, 0 parcelas, ficha vazia)
--
--  2) PEDRO HENRIQUE FERREIRA DO NASCIMENTO (cpf 423.310.318-35)
--     MANTER : aluno 4417eae1-ce50-4b6c-93b1-bc8bd125868c / matricula
--              c6043fe7-a435-4755-803f-9569220d08e2 (CETADP-2026-0113,
--              13 parcelas, 2 pagas)
--     REMOVER: aluno fca87fb0-e003-4df2-b208-4a6c8903115d / matricula
--              9363b4a1-1095-4d27-92bd-2647cfa3560c (CETADP-2026-0114,
--              0 parcelas)
--
-- ATENCAO: os dois alunos de cada par compartilham o MESMO user_id (login).
-- NAO apague o login (auth.users) -- so as linhas duplicadas abaixo.
-- Faca ANTES um backup (backup-manager-v2.ps1 -PreMigration -Label pre-limpeza-cpf).
--
-- PASSO 1 -- conferir dependencias das linhas a remover (esperado: tudo 0).
select 'parcelas' as tipo, count(*) from fin_contas_receber
 where origem_id in ('39eb27db-4529-40fa-9d81-8a92510d0b92','9363b4a1-1095-4d27-92bd-2647cfa3560c')
union all
select 'avaliacoes', count(*) from avaliacoes
 where matricula_id in ('39eb27db-4529-40fa-9d81-8a92510d0b92','9363b4a1-1095-4d27-92bd-2647cfa3560c')
union all
select 'parcelas_por_aluno', count(*) from fin_contas_receber
 where aluno_id in ('b9e32ed7-8928-4f96-92fb-690786bf8b26','fca87fb0-e003-4df2-b208-4a6c8903115d')
union all
select 'inscricoes', count(*) from ead_inscricoes
 where aluno_id in ('b9e32ed7-8928-4f96-92fb-690786bf8b26','fca87fb0-e003-4df2-b208-4a6c8903115d')
union all
select 'provas_publicas', count(*) from provas_publicas_respostas
 where ead_aluno_id in ('b9e32ed7-8928-4f96-92fb-690786bf8b26','fca87fb0-e003-4df2-b208-4a6c8903115d');
-- (ead_matriculas e avaliacoes caem em cascata ao apagar; as demais ficam com aluno_id nulo.)

-- PASSO 2 -- so se o passo 1 deu tudo 0, rode o bloco abaixo (transacao unica).
-- Se alguma tabela acusar FK, o proprio banco recusa e nada e apagado.
begin;
delete from ead_matriculas where id in ('39eb27db-4529-40fa-9d81-8a92510d0b92','9363b4a1-1095-4d27-92bd-2647cfa3560c');
delete from ead_alunos     where id in ('b9e32ed7-8928-4f96-92fb-690786bf8b26','fca87fb0-e003-4df2-b208-4a6c8903115d');
commit;

-- PASSO 3 -- padronizar os CPFs restantes para o formato com mascara e travar
-- duplicidade independente do formato (indice por digitos).
-- (Rodar so depois do passo 2: com duplicatas o indice nao pode ser criado.)
update ead_alunos
   set cpf = substr(cpf,1,3)||'.'||substr(cpf,4,3)||'.'||substr(cpf,7,3)||'-'||substr(cpf,10,2)
 where cpf ~ '^\d{11}$';

create unique index if not exists ead_alunos_cpf_digitos_unique
  on ead_alunos ((regexp_replace(cpf, '\D', '', 'g')))
  where cpf is not null and cpf <> '';
