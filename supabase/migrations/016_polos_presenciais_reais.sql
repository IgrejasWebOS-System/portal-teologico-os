-- Polos presenciais reais do CETADP (fonte: apresentação institucional
-- em PDF, slide "Aulas Presenciais"). Complementa os 3 registros de seed
-- já existentes (Campo Piracicaba Sede, Ministério de Jovens, Ministério
-- de Missões), que ficam mantidos.

INSERT INTO public.ead_campos_ministerios (nome, tipo, ativo) VALUES
  ('Campo Centenário do Sul - PR', 'CAMPO', true),
  ('Campo Caruaru - PE', 'CAMPO', true),
  ('Campo Nova Andradina - MS', 'CAMPO', true),
  ('Campo São Pedro - SP', 'CAMPO', true),
  ('Campo Pau da Lima (Salvador) - BA', 'CAMPO', true),
  ('Campo Piracicamirim - SP', 'CAMPO', true),
  ('Campo São Francisco - SP', 'CAMPO', true),
  ('Campo Kobaiat Líbano - SP', 'CAMPO', true);
