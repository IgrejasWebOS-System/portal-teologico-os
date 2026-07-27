-- 073_estados_regiao_ibge.sql
-- Camada nacional de geografia (Estado + Região IBGE), separada das 7
-- zonas internas de "regioes" (que continuam servindo só pra organizar
-- Setores dentro de 1 Campo, sem mudança nenhuma). Tabela de referência
-- estática e oficial (27 UF, Ministério/IBGE) — não é editável pela UI,
-- só consultada. O UF de cada Campo já existe hoje via
-- units(SEDE).legacy_church_id -> churches.state (o CampoForm já grava
-- isso com autofill de CEP via ViaCEP); esta tabela só adiciona o
-- agrupamento em Região (Norte/Nordeste/Centro-Oeste/Sudeste/Sul) por
-- cima do UF.

CREATE TABLE IF NOT EXISTS public.estados (
  uf text PRIMARY KEY,
  nome text NOT NULL,
  regiao text NOT NULL CHECK (regiao IN ('NORTE','NORDESTE','CENTRO-OESTE','SUDESTE','SUL'))
);

ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estados_select_all ON public.estados;
CREATE POLICY estados_select_all ON public.estados
  FOR SELECT USING (true);

INSERT INTO public.estados (uf, nome, regiao) VALUES
  ('AC', 'Acre', 'NORTE'),
  ('AP', 'Amapá', 'NORTE'),
  ('AM', 'Amazonas', 'NORTE'),
  ('PA', 'Pará', 'NORTE'),
  ('RO', 'Rondônia', 'NORTE'),
  ('RR', 'Roraima', 'NORTE'),
  ('TO', 'Tocantins', 'NORTE'),
  ('AL', 'Alagoas', 'NORDESTE'),
  ('BA', 'Bahia', 'NORDESTE'),
  ('CE', 'Ceará', 'NORDESTE'),
  ('MA', 'Maranhão', 'NORDESTE'),
  ('PB', 'Paraíba', 'NORDESTE'),
  ('PE', 'Pernambuco', 'NORDESTE'),
  ('PI', 'Piauí', 'NORDESTE'),
  ('RN', 'Rio Grande do Norte', 'NORDESTE'),
  ('SE', 'Sergipe', 'NORDESTE'),
  ('DF', 'Distrito Federal', 'CENTRO-OESTE'),
  ('GO', 'Goiás', 'CENTRO-OESTE'),
  ('MT', 'Mato Grosso', 'CENTRO-OESTE'),
  ('MS', 'Mato Grosso do Sul', 'CENTRO-OESTE'),
  ('ES', 'Espírito Santo', 'SUDESTE'),
  ('MG', 'Minas Gerais', 'SUDESTE'),
  ('RJ', 'Rio de Janeiro', 'SUDESTE'),
  ('SP', 'São Paulo', 'SUDESTE'),
  ('PR', 'Paraná', 'SUL'),
  ('RS', 'Rio Grande do Sul', 'SUL'),
  ('SC', 'Santa Catarina', 'SUL')
ON CONFLICT (uf) DO NOTHING;
