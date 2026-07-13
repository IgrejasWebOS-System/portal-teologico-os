-- ============================================================
-- Endurecimento de segurança pós-advisor — aplicada ao projeto
-- toduvwtzklntyptcodkf via MCP (apply_migration), nome remoto
-- "004_endurecimento_seguranca".
--
-- Fecha os WARNs restantes do advisor de segurança do Supabase:
-- funções de trigger não deveriam estar expostas como RPC
-- público, e a inserção em member_timeline deveria ser
-- restrita à secretaria, não a qualquer autenticado.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_member_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_new_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_next_matricula_ead() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_matricula(boolean) FROM anon;

DROP POLICY member_timeline_insert ON public.member_timeline;
CREATE POLICY member_timeline_insert_staff ON public.member_timeline
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));
