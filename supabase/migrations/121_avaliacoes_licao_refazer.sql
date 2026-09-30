-- 121_avaliacoes_licao_refazer.sql
-- Continuação da 120: o sistema PARALELO de teste/prova por matéria
-- (portal/testes/[lessonId], banco avaliacoes_banco_questoes_licao,
-- migration 099) também tinha índices únicos travando "só 1 tentativa"
-- por (matrícula, matéria, tipo[, número do teste]). Mesma decisão do
-- Joaquim (29/09/2026): refazer sem limite até bater 6,1, valendo pra
-- este sistema também.

drop index if exists avaliacoes_prova_unica_por_materia;
drop index if exists avaliacoes_teste_licao_unica;
