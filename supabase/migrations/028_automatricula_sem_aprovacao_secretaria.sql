-- Matrícula deixa de depender de aprovação manual da secretaria:
-- toda matrícula (gratuita, paga online, ou feita por um aluno já
-- logado escolhendo o curso sozinho) passa a ser habilitada na hora.
-- Isso exige que rotinas de servidor confiáveis (server actions e o
-- webhook do Mercado Pago, rodando com a service_role key) consigam
-- gerar número de matrícula sem precisar de uma sessão de staff.

CREATE OR REPLACE FUNCTION public.get_next_matricula_ead()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  proximo bigint;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria ou uma rotina confiável do servidor pode gerar matrícula.';
  END IF;
  proximo := nextval('ead_matricula_seq');
  RETURN 'CETADP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(proximo::TEXT, 4, '0');
END;
$$;

ALTER TABLE public.ead_matriculas DROP CONSTRAINT ead_matriculas_origem_check;
ALTER TABLE public.ead_matriculas ADD CONSTRAINT ead_matriculas_origem_check
  CHECK (origem = ANY (ARRAY['INSCRICAO_PUBLICA', 'MATRICULA_DIRETA', 'AUTO_MATRICULA']));
