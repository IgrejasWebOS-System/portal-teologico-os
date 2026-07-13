-- ============================================================
-- Correção do nome da instituição: "CETADEP" estava errado, o
-- certo é "CETADP". Aplicada ao projeto toduvwtzklntyptcodkf via
-- MCP, nome remoto "007_correcao_nome_cetadp".
--
-- Ajusta o prefixo de matrícula gerado por get_next_matricula_ead().
-- Nenhum aluno real foi matriculado ainda (ead_alunos = 0 linhas),
-- então não há dado histórico para corrigir retroativamente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_matricula_ead()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  proximo INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria pode gerar matrícula.';
  END IF;

  proximo := nextval('ead_matricula_seq');
  RETURN 'CETADP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(proximo::TEXT, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_next_matricula_ead() FROM anon;
