-- Tentativa de liberar 'FICHA_RAPIDA' como origem válida em
-- ead_matriculas — parte de uma reconstrução paralela da feature
-- Ficha Rápida que acabou sendo feita no repositório errado
-- (portal-teologico-os, que estava desatualizado em relação ao
-- i18n). Revertida integralmente pela migration 090 no mesmo dia,
-- sem nenhuma linha afetada (confirmado via SELECT count(*) antes
-- de reverter). Mantida aqui, com sua reversão, apenas para o
-- histórico do banco bater exatamente com o que foi aplicado em
-- produção.

ALTER TABLE public.ead_matriculas DROP CONSTRAINT ead_matriculas_origem_check;
ALTER TABLE public.ead_matriculas ADD CONSTRAINT ead_matriculas_origem_check
  CHECK (origem = ANY (ARRAY['INSCRICAO_PUBLICA'::text, 'MATRICULA_DIRETA'::text, 'AUTO_MATRICULA'::text, 'FICHA_RAPIDA'::text]));
