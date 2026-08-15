-- 038_leads_loja_funil_status.sql
-- RECONSTRUÍDA em 15/08/2026 (mesmo caso da 037 — ver nota no início da
-- 030). Schema reconstruído por introspecção exata do banco de produção.
-- Tabela `loja_leads_crm` — funil de contato simples (Não contatado/
-- Contatado/Convertido/Sem interesse) + observação para os Leads da Loja.

CREATE TABLE IF NOT EXISTS public.loja_leads_crm (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NAO_CONTATADO'
    CHECK (status IN ('NAO_CONTATADO','CONTATADO','CONVERTIDO','SEM_INTERESSE')),
  observacao text,
  atualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loja_leads_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loja_leads_crm_staff ON public.loja_leads_crm;
CREATE POLICY loja_leads_crm_staff ON public.loja_leads_crm
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
            AND profiles.system_role = ANY (ARRAY['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  );
