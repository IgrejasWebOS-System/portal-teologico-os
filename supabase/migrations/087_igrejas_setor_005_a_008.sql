-- Import de igrejas — SETOR 005, 006, 007, 008 (setores locais de
-- Piracicaba/SP). churches.sector_id preenchido (aponta pra
-- public.sectors). Conteúdo gerado a partir dos dados já aplicados
-- em produção (conferido via SELECT direto no banco).

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name=v.grupo), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('SETOR 005','VILA RICA - SÃO PEDRO',true),('SETOR 005','ÁGUAS DE SÃO PEDRO',false),
  ('SETOR 005','DOIS CORREGOS/SP',false),('SETOR 005','SANTA MARIA DA SERRA',false),
  ('SETOR 005','SÃO DIMAS - SÃO PEDRO',false),
  ('SETOR 006','PAULICEIA',true),('SETOR 006','ARI COELHO',false),
  ('SETOR 006','JANE CONCEIÇÃO',false),('SETOR 006','JARDIM ASTURIAS',false),
  ('SETOR 006','JARDIM CAXAMBÚ',false),('SETOR 006','JARDIM DAS MARGARIDAS',false),
  ('SETOR 006','JARDIM ESPLANADA',false),('SETOR 006','PAULISTA',false),
  ('SETOR 006','SALTINHO/SP',false),('SETOR 006','SÃO JOSÉ',false),
  ('SETOR 006','SUB - ARRAIAL DE SÃO BENTO',false),('SETOR 006','SUB - CAMPESTRE',false),
  ('SETOR 007','CHARQUEADA/SP',true),('SETOR 007','IPEUNA',false),
  ('SETOR 007','PARAISOLANDIA',false),('SETOR 007','RECREIO/SP',false),
  ('SETOR 007','TABELA (SANTA.LUZIA)',false),('SETOR 007','VILA BELEM',false),
  ('SETOR 008','IRACEMAPOLIS/SP',true),('SETOR 008','BOA VISTA',false),
  ('SETOR 008','CAMPO VERDE',false),('SETOR 008','IRACEMÁPOLIS - CENTRO',false),
  ('SETOR 008','JOÃO OMETTO',false),('SETOR 008','PARQUE SÃO JORGE',false),
  ('SETOR 008','SANTA ROSA',false),('SETOR 008','SÃO SEBASTIÃO',false),
  ('SETOR 008','SUB - AGROFAPI',false),('SETOR 008','SUB - ÁGUA SANTA',false),
  ('SETOR 008','SUB - JD. FLORESCER',false),('SETOR 008','SUB - RECANTO DAS PAINEIRAS',false),
  ('SETOR 008','TANQUINHO',false)
) AS v(grupo, nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, sector_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name=c.grupo)),
  (SELECT id FROM public.sectors WHERE name=c.grupo),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('SETOR 005','VILA RICA - SÃO PEDRO','OSWALDO NICOLAU DOS SANTOS','(19) 99138-7581',249,'Rua Benedito Cadenaci, 172 - Vila Rica','São Pedro','SP','13520-000',true),
  ('SETOR 005','ÁGUAS DE SÃO PEDRO','GERSON SANTOS DE OLIVEIRA','(19) 99973-6799',70,'Av. Antonio Joaquim de Moura Andrade, 580 - 9, 580','Águas de São Pedro','SP','13525-000',false),
  ('SETOR 005','DOIS CORREGOS/SP','JOÃO MARCOS SIMIONATO','(19) 98712-4089',87,'AV.GUARANI, 108 - Vila Coradi','Dois Córregos','SP','17300-000',false),
  ('SETOR 005','SANTA MARIA DA SERRA','WESLEY ROTTA DE MEIRA','(19) 99742-3168',116,'Rua Olavo Bilac, 633 - CENTRO','Santa Maria da Serra','SP','17370-000',false),
  ('SETOR 005','SÃO DIMAS - SÃO PEDRO','ROBERTY AUGUSTO MACHADO','(19) 3481-3770',81,'RUA VALENTIM SALOME BORBA, 172 - Jardim São Dimas','São Pedro','SP','13522-192',false),
  ('SETOR 006','PAULICEIA','MARCELO EDUARDO TREVISAN','(19) 3402-9361',309,'RUA ANTONIO BACHI, 1481 - Pauliceia','Piracicaba','SP','13424-070',true),
  ('SETOR 006','ARI COELHO','DJALMA RENE DOS SANTOS','(19) 99184-8382',78,'Rua Antonio Cardoso, 130 - ARY COELHO','Piracicaba','SP','13424-000',false),
  ('SETOR 006','JANE CONCEIÇÃO','MARCELO MARIANO RODRIGUES',NULL,35,'AVENIDA DONA JANE CONCEIÇÃO, 533 - Jaraguá','Piracicaba','SP','13401-110',false),
  ('SETOR 006','JARDIM ASTURIAS','JOAO CORREA DA SILVA','(19) 98233-5768',52,'Rua Sargento José Carlos Ribeiro, 573 - Térreo','Piracicaba','SP','13426-218',false),
  ('SETOR 006','JARDIM CAXAMBÚ','WILLIANS FRANCISCO GOMES','(19) 99844-8088',85,'Rua Henrique Rochelle, 454 - Jardim Caxambú','Piracicaba','SP','13425-066',false),
  ('SETOR 006','JARDIM DAS MARGARIDAS','GERALD FERNANDO DA SILVA','(19) 99842-2764',35,'Rua Cacilda Becker, 167 - JARDIM DAS MARGARIDAS','Piracicaba','SP','13425-144',false),
  ('SETOR 006','JARDIM ESPLANADA','MARCELO ROCHA DA COSTA','(19) 99635-6956',96,'Rua 23 de Maio, 1409 - JD ESPALANADA','Piracicaba','SP','13401-210',false),
  ('SETOR 006','PAULISTA','EDNILSON CAMOLESI','(19) 98955-2888',65,'Rua do Rosario, 2414 - Paulista','Piracicaba','SP','13401-090',false),
  ('SETOR 006','SALTINHO/SP','DANIEL LUIZ BONATTO','(19) 3432-2085',88,'Rua Ecio Biffe Cavalari, 491 - PORTAL DOS NOBRES','Saltinho','SP','13440-970',false),
  ('SETOR 006','SÃO JOSÉ','FERNANDA BEATRIZ ROMÃO ANTONIO','(19) 99441-1242',80,'Rua Laras, 49 - Jardim São José','Piracicaba','SP','13402-604',false),
  ('SETOR 006','SUB - ARRAIAL DE SÃO BENTO','CLAUDENCIR MESSIAS DE SALES',NULL,2,'RUA UM, 362 - Área Rural de Saltinho','Saltinho','SP','13444-899',false),
  ('SETOR 006','SUB - CAMPESTRE','JORGE WILLIAM GOMES JUNIOR','(19) 99797-3748',3,'Avenida Laranjal Paulista, 2140 - CAMPESTRE','Piracicaba','SP','13401-630',false),
  ('SETOR 007','CHARQUEADA/SP','JOSÉ CARLOS DA SILVA','(19) 99932-1376',246,'Rua Augusto Semmler, 58 - Jardim Paris','Charqueada','SP','13515-520',true),
  ('SETOR 007','IPEUNA','VALDIR LEITE DA SILVA','(19) 99479-3724',85,'RUA: GERALDO ABDALLA, 686 - JARDIM NOVA IPEÚNA','Ipeúna','SP','13537-000',false),
  ('SETOR 007','PARAISOLANDIA','DANIEL BRINO MELLOTO','(19) 98892-9235',163,'Rua Julio Conceição, 76 - PARAISOLAINDIA','Charqueada','SP','13515-000',false),
  ('SETOR 007','RECREIO/SP','NADYR SEGANTINI','(19) 99376-9494',86,'Av. Paulo Meneguel, 371 - RECREIO','Charqueada','SP','13515-000',false),
  ('SETOR 007','TABELA (SANTA.LUZIA)','ANDERSON LEITE','(19) 99535-2172',110,'Rua: JACOB NICOLAU, 19 - Jardim Panorama','Charqueada','SP','13515-000',false),
  ('SETOR 007','VILA BELEM','MARCELA APARECIDA DE CAMPOS','(19) 99205-6060',27,'Rua Valdomiro Perissinato, 10 - Vila Belém','Piracicaba','SP','13411-300',false),
  ('SETOR 008','IRACEMAPOLIS/SP','EDMILSON ALVES MARIA','(19) 3456-2815',716,'Av. Claudia Maria Gandolpho Rodrigues de Souza, 95 - Jd. Lazaro H. de Oliveira','Iracemápolis','SP','13497-154',true),
  ('SETOR 008','BOA VISTA','JOSE ALVES SOTERO IRMÃO','(19) 97136-5560',50,'RUA LÍDIA BORBA, 918 - BOA VISTA','Iracemápolis','SP','13495-000',false),
  ('SETOR 008','CAMPO VERDE','LEANDRO ROBERTO ISRAEL','(19) 98858-6121',54,'Av. Eugênia Fazanaro Pedroso, 231 - CAMPO VERDE','Iracemápolis','SP','13495-000',false),
  ('SETOR 008','IRACEMÁPOLIS - CENTRO','JOAQUIM ANTONIO DE SOUZA','(19) 99616-7187',55,'Rua Dona Auta de Oliveira Simões, 736 - CENTRO','Iracemápolis','SP','13495-000',false),
  ('SETOR 008','JOÃO OMETTO','VALMIR VICENTE','(19) 99879-2302',72,'JOÃO OMETO, - JOAO OMETO','Iracemápolis','SP','13405-286',false),
  ('SETOR 008','PARQUE SÃO JORGE','NELSON GONÇALVES DOS SANTOS','(19) 98843-7169',117,'RUA SERRA AZUL, 250 - PQ SAO JORGE','Piracicaba','SP','13413-000',false),
  ('SETOR 008','SANTA ROSA','JOHNNY WESLLEY FRANCO','(19) 97138-0531',46,'Rua Gilberto Diniz de Oliveira, 366 - JD. SANTA ROSA','Piracicaba','SP','13414-250',false),
  ('SETOR 008','SÃO SEBASTIÃO','PAULO CESAR ALEXANDRINO','(19) 3456-3069',62,'Rua Gabriel Chaves, 15 - J.SAO SEBASTIAO','Iracemápolis','SP','13400-000',false),
  ('SETOR 008','SUB - AGROFAPI','CARLOS VALDIR DE OLIVEIRA','(19) 99826-5682',2,'ESTRADA LURDES CATARINA DE SOUZA, 1808 - ESTRADA AGROFAP','Piracicaba','SP',NULL,false),
  ('SETOR 008','SUB - ÁGUA SANTA','ANTONIO PEREIRA','(19) 3421-5256',19,'Rua 1, 153 - Àgua Santa','Piracicaba','SP','13405-286',false),
  ('SETOR 008','SUB - JD. FLORESCER','EDMILSON ALVES MARIA',NULL,1,'RUA MANOEL DE MENEZES FILHO, 95 - JD. FLORESCER','Iracemápolis','SP','13495-000',false),
  ('SETOR 008','SUB - RECANTO DAS PAINEIRAS','RODRIGO FERREIRA DE BRITO','(19) 99592-0149',2,'Rua Armando Bueno de Moraes,65 - Residencial Recanto das Paineiras','Iracemápolis','SP','13497-234',false),
  ('SETOR 008','TANQUINHO','GIDALTON LOURENÇO DA SILVA','(19) 3524-9364',143,'Rua: Vicente Lopes da Silva, 329 - Tanquinho','Iracemápolis','SP','13400-000',false)
) AS c(grupo, nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);
