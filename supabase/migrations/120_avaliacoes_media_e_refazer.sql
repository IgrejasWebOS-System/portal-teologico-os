-- 120_avaliacoes_media_e_refazer.sql
-- Média mínima 6,1 + refazer sem limite (29/09/2026, pedido do Joaquim,
-- aplicado a TODOS os tipos — teste, simulado e prova). Reversão
-- deliberada da regra antiga de "prova só pode ser feita 1 vez"
-- (migration 025_avaliacoes_simulados_provas.sql, índice
-- avaliacoes_prova_unica): agora o aluno pode refazer prova quantas
-- vezes precisar até bater a média, mesmo padrão que teste/simulado já
-- tinham. O limite de 2 simulados (LIMITE_SIMULADOS em avaliacoes/
-- actions.ts) também caiu, só em código (não tinha trigger de banco).

drop index if exists avaliacoes_prova_unica;

comment on table avaliacoes is
  'Teste/simulado/prova do aluno. Desde 29/09/2026: nota mínima de aprovação 6,1 para TODOS os tipos, sem limite de tentativas — reversão da regra antiga de prova única (ver 025_avaliacoes_simulados_provas.sql).';
