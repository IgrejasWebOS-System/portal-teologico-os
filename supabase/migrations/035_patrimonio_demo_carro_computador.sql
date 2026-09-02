-- Dois bens de demonstração no Patrimônio/Inventário, ambos
-- comprados em 2020: 1 veículo e 1 computador.

INSERT INTO public.patrimony_items (
  numero_tombamento, nome, descricao, categoria,
  valor_aquisicao_centavos, data_aquisicao, fornecedor, nota_fiscal,
  vida_util_anos, taxa_depreciacao_anual, valor_residual_centavos,
  localizacao, responsavel_nome, status
)
VALUES
  ('TOMB-' || LPAD(nextval('tombamento_seq')::text, 6, '0'),
   'Fiat Doblò Furgão 1.4 2020', 'Veículo utilitário para transporte de material didático e apoio à secretaria.',
   'VEICULO', 6500000, '2020-03-16', 'Concessionária Fiat Piracicaba', 'NF-000451',
   5, 20.00, 1500000, 'Garagem — Sede CETADP', 'Secretaria', 'ATIVO'),
  ('TOMB-' || LPAD(nextval('tombamento_seq')::text, 6, '0'),
   'Computador Desktop Dell OptiPlex', 'Estação de trabalho da secretaria acadêmica.',
   'INFORMATICA', 450000, '2020-06-10', 'Dell Computadores do Brasil', 'NF-000452',
   5, 20.00, 0, 'Secretaria — Sede CETADP', 'Secretaria', 'ATIVO');
