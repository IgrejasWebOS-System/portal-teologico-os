-- 039_limite_simulados_por_matricula.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 037/038 — ver nota no início
-- da 030). Função e trigger reconstruídas EXATAS via pg_get_functiondef /
-- pg_get_triggerdef direto do banco de produção.
-- Trigger `check_limite_simulados` — limita a 2 o número de SIMULADOs por
-- matrícula (antes era ilimitado), rede de segurança no banco além da
-- checagem já feita na Server Action.

CREATE OR REPLACE FUNCTION public.check_limite_simulados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_simulados integer;
BEGIN
  IF NEW.tipo = 'SIMULADO' THEN
    SELECT count(*) INTO total_simulados
    FROM public.avaliacoes
    WHERE matricula_id = NEW.matricula_id AND tipo = 'SIMULADO';

    IF total_simulados >= 2 THEN
      RAISE EXCEPTION 'Limite de 2 simulados por matricula ja atingido.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_limite_simulados ON public.avaliacoes;
CREATE TRIGGER trg_limite_simulados
  BEFORE INSERT ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.check_limite_simulados();
