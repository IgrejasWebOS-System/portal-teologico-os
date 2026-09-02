-- Funil de contato simples pros Leads da Loja (compradores avulsos
-- ainda não matriculados): a secretaria marca o status de cada lead
-- e pode deixar uma observação. Sem histórico de interações — só o
-- estado atual, editável na própria lista.

CREATE TABLE public.loja_leads_crm (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NAO_CONTATADO'
    CHECK (status IN ('NAO_CONTATADO', 'CONTATADO', 'CONVERTIDO', 'SEM_INTERESSE')),
  observacao text,
  atualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loja_leads_crm ENABLE ROW LEVEL SECURITY;

CREATE POLICY loja_leads_crm_staff ON public.loja_leads_crm
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')));
