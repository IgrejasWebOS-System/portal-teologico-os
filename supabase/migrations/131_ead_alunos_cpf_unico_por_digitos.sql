-- 131_ead_alunos_cpf_unico_por_digitos.sql
-- 05/10/2026 — achado em produção: o índice único ead_alunos_cpf_unique
-- compara o texto cru do CPF, e a base tinha CPFs nos dois formatos (só
-- dígitos e 000.000.000-00). O mesmo CPF entrou duas vezes (ANA PAULA DE
-- OLIVEIRA HONÓRIO e PEDRO HENRIQUE FERREIRA DO NASCIMENTO, cada um com 2
-- fichas e 2 matrículas). O código passou a casar os dois formatos
-- (src/utils/cpf.ts → cpfVariantes) e esta migration fecha a porta no banco.
--
-- STATUS: aplicada em PRODUÇÃO em 05/10/2026 (toduvwtzklntyptcodkf), colada no
-- SQL Editor pelo Joaquim, ANTES de existir este arquivo — regularizada aqui
-- (ver ERROS-COMUNS-IA.md, 06/10/2026). Backup prévio validado:
-- portal-teologico_PROD_2026-10-05_2230_PRE-pre-limpeza-cpf.dump.
-- Idempotente: pode rodar de novo em qualquer ambiente sem efeito extra.

-- 1) Remove as 2 fichas/matrículas duplicadas de 05/10/2026 (sem parcelas,
--    sem avaliações; o login compartilhado NÃO é apagado). Por id exato:
--    em qualquer outro banco não existe nenhuma dessas linhas (no-op).
--    ead_matriculas e avaliacoes caem em cascata; as demais referências
--    (fin_contas_receber, ead_inscricoes, provas_publicas_respostas) ficam
--    com aluno_id nulo.
delete from public.ead_matriculas
 where id in ('39eb27db-4529-40fa-9d81-8a92510d0b92', '9363b4a1-1095-4d27-92bd-2647cfa3560c');

delete from public.ead_alunos
 where id in ('b9e32ed7-8928-4f96-92fb-690786bf8b26', 'fca87fb0-e003-4df2-b208-4a6c8903115d');

-- 2) Padroniza todos os CPFs de 11 dígitos para o formato com máscara.
update public.ead_alunos
   set cpf = substr(cpf, 1, 3) || '.' || substr(cpf, 4, 3) || '.' || substr(cpf, 7, 3) || '-' || substr(cpf, 10, 2)
 where cpf ~ '^\d{11}$';

-- 3) Trava duplicidade independente do formato (índice por dígitos).
--    Falha de propósito se ainda houver CPF duplicado por dígitos no banco
--    onde for aplicada: resolver os duplicados antes (ver
--    staging/governance/LIMPEZA-CPF-DUPLICADO-05-10-2026.sql).
create unique index if not exists ead_alunos_cpf_digitos_unique
  on public.ead_alunos ((regexp_replace(cpf, '\D', '', 'g')))
  where cpf is not null and cpf <> '';
