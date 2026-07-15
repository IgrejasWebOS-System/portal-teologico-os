-- Sequência + função para gerar o número público de certificado
-- (formato CETADP-CERT-AAAA-NNNN), mesmo padrão de
-- get_next_matricula_ead(): SECURITY DEFINER, search_path fixo,
-- só staff pode chamar.

CREATE SEQUENCE public.certificado_seq START 1;

REVOKE ALL ON SEQUENCE public.certificado_seq FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_next_certificado()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria pode emitir certificado.';
  END IF;

  proximo := nextval('certificado_seq');
  RETURN 'CETADP-CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(proximo::TEXT, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_next_certificado() FROM anon;
