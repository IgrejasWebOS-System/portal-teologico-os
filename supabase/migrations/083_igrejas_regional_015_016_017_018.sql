-- Import de igrejas — REGIONAL 015, 016, 017, 018.
-- Conteúdo gerado a partir dos dados já aplicados em produção
-- (conferido via SELECT direto no banco), mesmo padrão units→churches.

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name=v.grupo), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('REGIONAL 015','PORTO ALEGRE/RS',true),('REGIONAL 015','CAXIAS DO SUL/RS',false),
  ('REGIONAL 015','CECÍLIO MONZA - PORTO ALEGRE/RS',false),('REGIONAL 015','CRISTAL / RS',false),
  ('REGIONAL 015','PITINGA - PORTO ALEGRE/RS',false),('REGIONAL 015','RESTINGA - PORTO ALEGRE/RS',false),
  ('REGIONAL 015','VIAMÃO/RS',false),
  ('REGIONAL 016','CABEDELO/PB',true),('REGIONAL 016','SUB - MIRAMAR/PB',false),
  ('REGIONAL 017','TABULEIRO / AL',true),('REGIONAL 017','CARMINHA / AL',false),
  ('REGIONAL 018','UBAITABA/BA',true),('REGIONAL 018','ARMANDÃO - UBAITABA/BA',false),
  ('REGIONAL 018','BARRA DO ROCHA - UBAITABA/BA',false),('REGIONAL 018','IBIRAPITANGA/BA',false),
  ('REGIONAL 018','MARAÚ - UBAITABA/BA',false),('REGIONAL 018','MARIA OLÍMPIA - UBAITABA/BA',false),
  ('REGIONAL 018','PAU BRASIL-UBAITABA/BA',false),('REGIONAL 018','SAQUAIRA - UBAITABA/BA',false)
) AS v(grupo, nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name=c.grupo)),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('REGIONAL 015','PORTO ALEGRE/RS','ADRIANO APARECIDO GOMES DE SOUZA','(51) 98153-5477',53,'Avenida Manoel Elias, 496 - Caixa Postal no. 18452','Porto Alegre','RS','91240-260',true),
  ('REGIONAL 015','CAXIAS DO SUL/RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,14,'RUA ANA GONZALES, 54 - MONTE CARMELO','Caxias do Sul','RS','95100-000',false),
  ('REGIONAL 015','CECÍLIO MONZA - PORTO ALEGRE/RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,34,'RUA SANTA RITA, 405 - Restinga','Porto Alegre','RS',NULL,false),
  ('REGIONAL 015','CRISTAL / RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,11,'ESTRADA DA ARMADA, - AREA RURAL','Cristal','RS','96195-000',false),
  ('REGIONAL 015','PITINGA - PORTO ALEGRE/RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,24,'Rua José Carlos do Nascimento, 105 - Restinga','Porto Alegre','RS','91790-427',false),
  ('REGIONAL 015','RESTINGA - PORTO ALEGRE/RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,25,'Avenida Ignês E. Fagundes, 3243 - Restinga','Porto Alegre','RS','91790-010',false),
  ('REGIONAL 015','VIAMÃO/RS','ADRIANO APARECIDO GOMES DE SOUZA',NULL,21,'Rua Guiné, 22 - MARTINICA','Viamão','RS','94460-450',false),
  ('REGIONAL 016','CABEDELO/PB','ALEXANDRO FRUTUOSO DA COSTA','(83) 99920-9334',44,'Avenida Monsenhor José da Silva Coutinho, 54 - Camalaú','Cabedelo','PB','58103-202',true),
  ('REGIONAL 016','SUB - MIRAMAR/PB','ALEXANDRO FRUTUOSO DA COSTA',NULL,0,'Rua Cassiano da Cunha Nóbrega, - Ponta de Matos','Cabedelo','PB','58100-695',false),
  ('REGIONAL 017','TABULEIRO / AL','NILSON JOSE APARECIDO BARBOSA','(82) 98120-1873',24,'Rua José Lôbo de Medeiros, 187 - Tabuleiro do Martins','Maceió','AL','57061-100',true),
  ('REGIONAL 017','CARMINHA / AL','NILSON JOSE APARECIDO BARBOSA',NULL,4,'Quadra C, 46 - QD-C','Maceió','AL','57085-609',false),
  ('REGIONAL 018','UBAITABA/BA','ANTENOR BENEDITO BATISTA','(19) 3707-2426',49,'RUA EDNO MAGALHÃES, 340 - CONCEICAO','Ubaitaba','BA','45545-000',true),
  ('REGIONAL 018','ARMANDÃO - UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,11,'RUA DR.CLEDENOR SOARES, 235 - FAISQUEIRA','Ubaitaba','BA','45545-000',false),
  ('REGIONAL 018','BARRA DO ROCHA - UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,32,'RUA DA CANTUÁRIA, 109 - CENTRO','Barra','BA','45560-000',false),
  ('REGIONAL 018','IBIRAPITANGA/BA','ANTENOR BENEDITO BATISTA',NULL,14,'Rua Camumu, 27 - Nova Brasilia','Ibirapitanga','BA','45500-000',false),
  ('REGIONAL 018','MARAÚ - UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,11,'RUA DA INDEPENDENCIA, - CENTRO','Maraú','BA','45520-000',false),
  ('REGIONAL 018','MARIA OLÍMPIA - UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,12,'RUA ITAMAR BASILIO, - MARIA OLIMPIA','Ubaitaba','BA','45545-000',false),
  ('REGIONAL 018','PAU BRASIL-UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,9,'RUA BAHIA, - TAIPU DE DENTRO','Maraú','BA','45520-000',false),
  ('REGIONAL 018','SAQUAIRA - UBAITABA/BA','ANTENOR BENEDITO BATISTA',NULL,12,'RUA FUNDO, - SAQUAIRA','Maraú','BA','45520-000',false)
) AS c(grupo, nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);
