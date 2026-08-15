-- 035_patrimonio_demo_carro_computador.sql
-- RECONSTRUÍDA em 15/08/2026 — diferente da 032/033/034, esta é uma
-- reconstrução EXATA: `patrimony_items` em produção hoje tem exatamente
-- 2 linhas (as mesmas descritas por esta migration), então os valores
-- abaixo foram lidos direto de produção, não aproximados.
-- 2 bens de demonstração no Patrimônio: 1 veículo e 1 computador, ambos
-- adquiridos em 2020. Idempotente via numero_tombamento.

INSERT INTO public.patrimony_items (
  numero_tombamento, nome, descricao, categoria, valor_aquisicao_centavos,
  data_aquisicao, fornecedor, nota_fiscal, vida_util_anos, taxa_depreciacao_anual,
  valor_residual_centavos, localizacao, responsavel_nome, status
) VALUES
  ('TOMB-000001', 'Fiat Doblò Furgão 1.4 2020',
   'Veículo utilitário para transporte de material didático e apoio à secretaria.',
   'VEICULO', 6500000, '2020-03-16', 'Concessionária Fiat Piracicaba', 'NF-000451',
   5, 20.00, 1500000, 'Garagem — Setor 01 Vila Rezende', 'Secretaria', 'ATIVO'),
  ('TOMB-000002', 'Computador Desktop Dell OptiPlex',
   'Estação de trabalho da secretaria acadêmica.',
   'INFORMATICA', 450000, '2020-06-10', 'Dell Computadores do Brasil', 'NF-000452',
   5, 20.00, 0, 'Secretaria — Sede CETADP', 'Secretaria', 'ATIVO')
ON CONFLICT (numero_tombamento) DO NOTHING;
