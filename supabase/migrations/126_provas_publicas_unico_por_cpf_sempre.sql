-- ============================================================
-- Prova pública por link + CPF: a trava de duplicata (migration 125)
-- só valia para tentativas PENDENTES (ead_aluno_id is null). Assim que
-- uma tentativa era vinculada a um aluno, ela escapava da trava -- cada
-- reenvio do mesmo CPF (já matriculado) criava uma linha NOVA, também
-- vinculada na hora, acumulando resultados "VINCULADO" sem limite
-- (visto ao vivo: 4x no Teste 1, 2x nos Testes 2/3/4 pro mesmo CPF).
--
-- Fix (02/10/2026, pedido do Joaquim): só pode existir 1 resultado por
-- prova+CPF, esteja vinculado ou não -- refazer sempre substitui a
-- tentativa anterior. A camada de aplicação (actions.ts) passa a apagar
-- a linha anterior antes de inserir, sem a condição "ead_aluno_id is
-- null"; aqui trocamos o índice parcial por um índice único de verdade.
-- ============================================================

-- 1) limpar duplicatas que já existem hoje, mantendo só a mais recente
--    por (prova_id, cpf) -- entre empates por data, prioriza a que já
--    está vinculada, pra não perder o vínculo de quem foi aprovado.
delete from public.provas_publicas_respostas r
where r.id not in (
  select distinct on (prova_id, cpf) id
  from public.provas_publicas_respostas
  order by prova_id, cpf, (ead_aluno_id is not null) desc, enviado_em desc
);

-- 2) trocar o índice parcial (só pendentes) por um índice único de
--    verdade: nunca mais do que 1 linha por prova+CPF, independente do
--    status de vínculo.
drop index if exists public.provas_publicas_respostas_prova_cpf_pendente_key;

create unique index provas_publicas_respostas_prova_cpf_key
  on public.provas_publicas_respostas (prova_id, cpf);
