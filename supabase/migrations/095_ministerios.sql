-- ============================================================
-- Fase 1 do plano de "Ministério, Campo e revisão geral" —
-- PARECER_MINISTERIO_CAMPO_REVISAO_GERAL.md, Opção B (confirmada
-- pelo usuário): Ministério como rótulo de agrupamento acima de
-- Campo, aditivo, sem mexer em `units`/RLS/trigger existentes.
--
-- Esta migração cria só a tabela — o vínculo campo→ministério
-- (Fase 2) vem numa próxima migração, validada em separado.
-- ============================================================

CREATE TABLE public.ministerios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ministerios_pkey PRIMARY KEY (id),
  CONSTRAINT ministerios_name_key UNIQUE (name)
);

ALTER TABLE public.ministerios ENABLE ROW LEVEL SECURITY;

-- Leitura liberada pra qualquer autenticado (mesmo padrão de units);
-- escrita restrita a GLOBAL_ADMIN (mesmo nível de Campo, que fica
-- logo abaixo na hierarquia).
CREATE POLICY "ministerios_select_authenticated" ON public.ministerios
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ministerios_write_global_admin" ON public.ministerios
  FOR ALL TO authenticated
  USING (public.current_system_role() = 'GLOBAL_ADMIN')
  WITH CHECK (public.current_system_role() = 'GLOBAL_ADMIN');
