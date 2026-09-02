-- Import de igrejas — SETOR 001, 002, 003, 004 (setores locais de
-- Piracicaba/SP). Diferente das REGIONAL, aqui `churches.sector_id`
-- é preenchido (aponta pra public.sectors, usado nos dropdowns de
-- Setor/Igreja dos formulários de matrícula). Conteúdo gerado a
-- partir dos dados já aplicados em produção (conferido via SELECT
-- direto no banco), mesmo padrão units→churches.

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name=v.grupo), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('SETOR 001','VILA REZENDE',true),('SETOR 001','CENTRAL MADUREIRA',false),
  ('SETOR 001','JARDIM EUROPA',false),('SETOR 001','JUPIA',false),
  ('SETOR 001','NHO QUIM',false),('SETOR 001','PQ. CONCEIÇÃO II',false),
  ('SETOR 001','TRAVESSA',false),
  ('SETOR 002','ARTEMIS',true),('SETOR 002','CAMPOS ELISEOS',false),
  ('SETOR 002','I.A.A',false),('SETOR 002','LAGO AZUL',false),
  ('SETOR 002','PARQUE PIRACICABA',false),('SETOR 002','VEM VIVER',false),
  ('SETOR 002','VILA BESSY',false),
  ('SETOR 003','BOM SAMARITANO',true),('SETOR 003','COSTA RICA',false),
  ('SETOR 003','JARDIM DAS FLORES',false),('SETOR 003','JARDIM GLORIA',false),
  ('SETOR 003','JARDIM TOKIO',false),('SETOR 003','MONTE CRISTO',false),
  ('SETOR 003','PARAÍSO',false),('SETOR 003','RAPOSO TAVARES',false),
  ('SETOR 004','PIRACICAMIRIM',true),('SETOR 004','AGUA BRANCA',false),
  ('SETOR 004','JARDIM IPANEMA',false),('SETOR 004','JARDIM ORIENTE',false),
  ('SETOR 004','MONTE FELIZ',false),('SETOR 004','NOVA AMERICA',false),
  ('SETOR 004','SERRA VERDE',false)
) AS v(grupo, nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, sector_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name=c.grupo)),
  (SELECT id FROM public.sectors WHERE name=c.grupo),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('SETOR 001','VILA REZENDE','MARCELO DE MORAES FESSEL','(19) 3035-3520',180,'Avenida Lourenço Ducatti, 295 - Vila Rezende','Piracicaba','SP','13405-208',true),
  ('SETOR 001','CENTRAL MADUREIRA','CRISTIANO DA SILVEIRA','(19) 99801-1979',43,'Rua do Rosário, 293 - CENTRO','Piracicaba','SP','13400-183',false),
  ('SETOR 001','JARDIM EUROPA','NATANAEL BENEDITO FELIX','(19) 99684-7296',32,'Rua Ajudante Albano, 633 - São Dimas','Piracicaba','SP','13416-030',false),
  ('SETOR 001','JUPIA','ERCILIA MARQUES DA SILVA','(19) 99688-5065',146,'Rua Piracanjuba, 305 - JD. JUPIA','Piracicaba','SP','13403-326',false),
  ('SETOR 001','NHO QUIM','EMERSON LEANDRO FERREIRA DA SILVA','(19) 99726-4300',49,'AV. MANOEL CONCEIÇÃO, 1983 - SALÃO','Piracicaba','SP','13405-230',false),
  ('SETOR 001','PQ. CONCEIÇÃO II','HENRIQUE DOS SANTOS GOMES','(19) 99560-2379',82,'RUA JOSE PALMIERI FILHO, 120 - Parque Conceição II','Piracicaba','SP','13412-414',false),
  ('SETOR 001','TRAVESSA','FRANCISCO ALMEIDA DE OLIVEIRA','(19) 98930-4313',17,'Travessa Vitório Voltane, 79 - Vila Rezende','Piracicaba','SP','13405-286',false),
  ('SETOR 002','ARTEMIS','JOAB SILVA DE SANTANA','(19) 99708-2237',187,'RUA 13 DE MAIO, 201 - ARTEMIS','Piracicaba','SP','13432-036',true),
  ('SETOR 002','CAMPOS ELISEOS','JOAO DA SILVA AMORIM','(42) 3425-5691',176,'Rua Cosmópolis, 297 - CAMPOS ELISEOS','Piracicaba','SP','13408-023',false),
  ('SETOR 002','I.A.A','ORESTES VIEIRA MARTINS','(19) 3438-1186',117,'Rua Paraibuna, 210 - I.A.A.','Piracicaba','SP','13411-181',false),
  ('SETOR 002','LAGO AZUL','MARCIO ROBERTO DA SILVA TORRES','(19) 98866-5747',103,'Av. José Ramiro , 557, 557 - EST LAGO AZUL','Piracicaba','SP','13432-000',false),
  ('SETOR 002','PARQUE PIRACICABA','REINALDO MULHSTEDT','(19) 98444-9683',160,'RUA PERUÍBE, 331 - PQ PIRACICABA','Piracicaba','SP','13409-024',false),
  ('SETOR 002','VEM VIVER','FRANCISCO JUSTINO DE SOUSA SOBRINHO','(19) 3425-4188',39,'Rua Aparecida Augusto, 812 - Loteamento Vem Viver Piracicab','Piracicaba','SP','13408-360',false),
  ('SETOR 002','VILA BESSY','CARLOS ROBERTO DIAS DE SOUZA','(75) 9755-7144',50,'Rua Augusto César de Oliveira, 39 - Jardim Castor','Piracicaba','SP','13411-105',false),
  ('SETOR 003','BOM SAMARITANO','MARCIO ELIAS SOARES GONÇALVES SIQUEIRA','(19) 98173-7558',194,'Rua Caroline Molon Neme, 911 - J.MORADA DO SOL','Piracicaba','SP','13401-640',true),
  ('SETOR 003','COSTA RICA','JOSÉ ALEX CARDOSO','(19) 3432-3325',165,'Rua Viena, 270 - JD. COSTA RICA','Piracicaba','SP','13401-650',false),
  ('SETOR 003','JARDIM DAS FLORES','FABIO SILVA DE LIMA','(19) 99914-2937',37,'RUA SENADOR SARAIVA, 735 - Jardim São Paulo','Piracicaba','SP','13400-000',false),
  ('SETOR 003','JARDIM GLORIA','EDMAR FERREIRA DA SILVA','(19) 3422-7773',137,'Rua Professor Mello Ayres, 235 - Vila Cristina','Piracicaba','SP','13401-391',false),
  ('SETOR 003','JARDIM TOKIO','DANIEL ESTEVÃO MIRANDA','(19) 98448-8764',54,'Rua Cafelandia, 401 - ITAPUA','Piracicaba','SP','13402-034',false),
  ('SETOR 003','MONTE CRISTO','VANDERLEI AP. GOMES DA SILVA','(19) 99966-9215',57,'Avenida Raposo Tavares, 2076 - Jardim Glória','Piracicaba','SP','13401-457',false),
  ('SETOR 003','PARAÍSO','EDSON APARECIDO SAMPAIO','(19) 99639-9936',21,'RUA ABDO MALUF, 266 - MONTE LIBANO','Piracicaba','SP','13401-566',false),
  ('SETOR 003','RAPOSO TAVARES','JOSÉ LUIZ FERNANDES','(19) 99707-9336',90,'AVENIDA RAPOSO TAVARES, 560 - IBIRAPUERA','Piracicaba','SP','13401-542',false),
  ('SETOR 004','PIRACICAMIRIM','CARLOS ROBERTO ARTHUSO','(19) 99113-5528',193,'RUA Bento Ferraz de Arruda, 33 - PIRACICAMIRIM','Piracicaba','SP','13420-560',true),
  ('SETOR 004','AGUA BRANCA','LUIZ ORLANDO BATISTELI','(19) 3426-9448',103,'Av. Miguel Caparros, 100 - Prédio Próprio','Piracicaba','SP','13426-145',false),
  ('SETOR 004','JARDIM IPANEMA','JONATHAN JARDIM RAMOS DA SILVA','(19) 98203-2679',62,'AVENIDA RIO DAS PEDRAS, 1251 - Jardim Ipanema','Piracicaba','SP','13420-590',false),
  ('SETOR 004','JARDIM ORIENTE','JABIS ROCHA RODRIGUES','(19) 3426-5898',47,'Rua Monsenhor Bastos, 1321 - Jardim Oriente','Piracicaba','SP','13426-126',false),
  ('SETOR 004','MONTE FELIZ','VALDEMIR NEVES',NULL,42,'Rua Francisco Peressim, 787 - MONTE FELIZ','Piracicaba','SP','13402-000',false),
  ('SETOR 004','NOVA AMERICA','PAULO MINHARO JUNIOR','(19) 98283-0720',52,'Rua Caetano de Campos, 241 - NOVA AMERICA','Piracicaba','SP','13417-570',false),
  ('SETOR 004','SERRA VERDE','REGINALDO LOPES','(19) 99348-8825',33,'Rua Diógenes Anselmo Banzatto, 991 - Residencial Serra Verde','Piracicaba','SP','13426-064',false)
) AS c(grupo, nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);
