-- Reverte a migration 089: remove 'FICHA_RAPIDA' da constraint de
-- origem em ead_matriculas, voltando exatamente aos 3 valores
-- originais. A feature Ficha Rápida real (já pronta, em
-- portal-teologico-os-staging, branch feature/ficha-rapida-qr-code)
-- usa outro mecanismo e não depende deste valor de origem.

ALTER TABLE public.ead_matriculas DROP CONSTRAINT ead_matriculas_origem_check;
ALTER TABLE public.ead_matriculas ADD CONSTRAINT ead_matriculas_origem_check
  CHECK (origem = ANY (ARRAY['INSCRICAO_PUBLICA'::text, 'MATRICULA_DIRETA'::text, 'AUTO_MATRICULA'::text]));
