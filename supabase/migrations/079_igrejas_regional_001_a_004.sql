-- ============================================================
-- Import de igrejas a partir de "lista de igrejas - regionais.pdf"
-- — REGIONAL 001 a 004 (48 igrejas). Padrão usado em todas as
-- migrations 079-085 (grupos REGIONAL): insere a unit tipo IGREJA
-- primeiro, depois a church referenciando essa unit por nome +
-- parent_id. Quando o campo "Dirigente" do PDF vinha em branco,
-- foi usado o nome do Líder Regional do grupo (instrução explícita
-- do Joaquim) — nunca ficou nulo. Celular só é preenchido quando
-- o PDF traz um número específico para aquela igreja (não herda do
-- líder). Endereço mantém o texto do PDF; cidade/UF/CEP extraídos
-- do padrão final "- Cidade - UF - CEP". Grupos REGIONAL não
-- recebem sector_id (só as 15 unidades SETOR locais recebem, ver
-- migrations 086-088).
-- ============================================================

INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 001'), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('PRESIDENTE EPITACIO/SP', true),('EMILIANÓPOLIS', false),('MARABA PAULISTA/SP', false),
  ('PIQUEROBI/SP', false),('PONTA LINDA/SP', false),('PRESIDENTE BERNARDES I', false),
  ('PRESIDENTE VENCESLAU/SP', false),('SANTO ANASTACIO/SP', false),('SUB - AGROVILA III/SP', false),
  ('SUB - ASSENT. MATURI/SP', false),('SUB - BATURITÉ/SP', false),('SUB - CAIUÁ/SP', false),
  ('SUB - CAMPINAL/SP', false),('SUB - ERNANI MURAD/SP', false),('SUB - JARDIM REAL/SP', false),
  ('SUB - MORADA DO SOL/SP', false),('SUB - RIBEIRÃO DOS INDIOS/SP', false),('SUB - VILA BORDON/SP', false)
) AS v(nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 001')),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('PRESIDENTE EPITACIO/SP','RONALDO BORGES LEME','(28) 3281-8678',278,'Rua Sebastião Novaes, 1046 - Vila Monte Castelo','Presidente Epitácio','SP','19470-000',true),
  ('EMILIANÓPOLIS','RONALDO BORGES LEME',NULL,13,'RUA JUCA DIAS, 611 - CENTRO','Emilianópolis','SP','19350-000',false),
  ('MARABA PAULISTA/SP','RONALDO BORGES LEME',NULL,42,'OSNY DA SILVEIRA, 415 - CENTRO','Marabá Paulista','SP','19473-000',false),
  ('PIQUEROBI/SP','RONALDO BORGES LEME',NULL,23,'RUA BARÃO DO RIO BRANCO, 290 - CENTRO','Piquerobi','SP','19410-000',false),
  ('PONTA LINDA/SP','RONALDO BORGES LEME',NULL,16,'Rua BAHIA, 1570 - PQ. NOSSA SENHORA DAS GRAÇAS','Piracicaba','SP','15718-000',false),
  ('PRESIDENTE BERNARDES I','RONALDO BORGES LEME',NULL,11,'RUA ALARICO BALIZARDO, 672 - CENTRO','Presidente Bernardes','SP','19400-000',false),
  ('PRESIDENTE VENCESLAU/SP','RONALDO BORGES LEME',NULL,45,'DARIO NOVO DIA, 150 - Parque São Jorge','Presidente Venceslau','SP','19400-000',false),
  ('SANTO ANASTACIO/SP','RONALDO BORGES LEME',NULL,116,'Rua João José Tetila, 95 - PARQUE SEVILHA','Santo Anastácio','SP','19360-000',false),
  ('SUB - AGROVILA III/SP','RONALDO BORGES LEME',NULL,13,'RUA BOIADEIRA ESQUINA, COM A VICINAL S/N, - AGROVILA 3','Caiuá','SP','19400-000',false),
  ('SUB - ASSENT. MATURI/SP','RONALDO BORGES LEME',NULL,10,'SITIO PARAISO ----LOTE, 18 - SITIO','Caiuá','SP','19400-000',false),
  ('SUB - BATURITÉ/SP','RONALDO BORGES LEME',NULL,5,'RUA BATURITÉ, 264 - VILA SENHOR DO BONFIM','Presidente Venceslau','SP','19400-000',false),
  ('SUB - CAIUÁ/SP','ISAEL RODRIGUES DA SILVA','(18) 98108-0844',18,'RUA JOSE DE ALENCAR, 735 - CENTRO','Caiuá','SP','19400-000',false),
  ('SUB - CAMPINAL/SP','RONALDO BORGES LEME',NULL,16,'AV.NISHIRO SHIGUEMATSU, 472 - CAMPINAL','Presidente Epitácio','SP','19400-000',false),
  ('SUB - ERNANI MURAD/SP','RONALDO BORGES LEME',NULL,2,'Avenida Getúlio Vargas, 398 - Vila Ernane Murad','Presidente Venceslau','SP','19405-064',false),
  ('SUB - JARDIM REAL/SP','GENIVALDO SANTOS LIMA','(18) 98129-8233',29,'RUA GUANABARA, 2984 - JARDIM REAL','Presidente Epitácio','SP','19470-000',false),
  ('SUB - MORADA DO SOL/SP','RONALDO BORGES LEME',NULL,0,'Rua Wadhi Chain Cury, 590 - JARDIM MORADA DO SOL','Presidente Venceslau','SP','19407-638',false),
  ('SUB - RIBEIRÃO DOS INDIOS/SP','RONALDO BORGES LEME',NULL,0,'AVENIDA BRASIL, 185 - CENTRO','Ribeirão dos Índios','SP','19380-000',false),
  ('SUB - VILA BORDON/SP','RONALDO BORGES LEME',NULL,25,'AVENIDA TIBIRIÇA, 131 - VILA BORDON','Presidente Epitácio','SP','19400-000',false)
) AS c(nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);

-- REGIONAL 002
INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 002'), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('CENTENARIO DO SUL/PR', true),('BANDEIRANTES/PR', false),('BELA VISTA/PR', false),('CAFEARA/PR', false),
  ('COLORADO/PR', false),('FLORESTOPOLIS./PR', false),('LUPIONOPOLIS/PR', false),('MARILIA/SP', false),
  ('MIRASELVA/PR', false),('PORECATU/PR', false),('SUB - SANTA CLARA/PR', false),('SUB - SANTA FÉ/PR', false)
) AS v(nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 002')),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('CENTENARIO DO SUL/PR','TIAGO GODOY SOBRAL','(43) 9609-1010',271,'Rua Vereador Maziade Felicio, 341 - CENTRO','Centenário do Sul','PR','86630-000',true),
  ('BANDEIRANTES/PR','TIAGO GODOY SOBRAL',NULL,129,'RUA ARQUIMEDES FERREIRA, 594 - VILA LORDANE','Bandeirantes','PR','86360-000',false),
  ('BELA VISTA/PR','TIAGO GODOY SOBRAL',NULL,32,'RUA MARIA PALMIERI GALDIOLI, 281 - SANTA MARGARIDA','Bela Vista do Paraíso','PR','86130-000',false),
  ('CAFEARA/PR','TIAGO GODOY SOBRAL',NULL,67,'RUA DOMINGUES BARBOSA, 111 - CENTRO','Cafeara','PR','86640-000',false),
  ('COLORADO/PR','TIAGO GODOY SOBRAL',NULL,124,'RUA BENEDITO FRANCELINO DA SILVA, 200 - JERONIMO RIBEIRO','Colorado','PR','86690-000',false),
  ('FLORESTOPOLIS./PR','TIAGO GODOY SOBRAL',NULL,107,'RUA MANUEL TUTELA, 630 - CENTRO','Florestópolis','PR','86165-000',false),
  ('LUPIONOPOLIS/PR','TIAGO GODOY SOBRAL',NULL,70,'Av. Barra Dourada, 905 - CENTRO','Lupionópolis','PR','86635-000',false),
  ('MARILIA/SP','TIAGO GODOY SOBRAL',NULL,54,'RUA JOSÉ LUPINO DE AGUIAR, 11 - JARDIM GUARUJÁ','Marília','SP','17524-200',false),
  ('MIRASELVA/PR','TIAGO GODOY SOBRAL',NULL,37,'Rua 21 de Abril, 350 - CENTRO','Miraselva','PR','86615-000',false),
  ('PORECATU/PR','TIAGO GODOY SOBRAL',NULL,116,'Rua Brasil, 1600 - JD. ALTO DA BOA VISTA','Porecatu','PR','86160-000',false),
  ('SUB - SANTA CLARA/PR','TIAGO GODOY SOBRAL',NULL,4,'RUA GUAPORÉ, 116 - JD SANTA CLARA','Colorado','PR','86690-000',false),
  ('SUB - SANTA FÉ/PR','TIAGO GODOY SOBRAL',NULL,32,'RUA CURITIBA, 73 - CENTRO','Santa Fé','PR','86770-000',false)
) AS c(nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);

-- REGIONAL 003
INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 003'), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('CAMPO BELO/MG', true),('ALTEROSA/MG', false),('AREADO/MG', false),('CAMACHO/MG', false),
  ('CANDEIAS/MG', false),('CRISTAIS/MG', false),('ITAPECERICA/MG', false),('LAMBARÍ/MG', false),
  ('SUB - COMUNIDADE DE PIMENTAS/MG', false),('SUB - COSTAS/MG', false),('SUB - DAVIS/MG', false),('SUB - MONTESA/MG', false)
) AS v(nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 003')),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('CAMPO BELO/MG','EDUARDO JOSÉ SILVA','(35) 3831-5258',198,'Rua Ovídea Maia Dias, 625 - VILA ÉTNA','Campo Belo','MG','37270-000',true),
  ('ALTEROSA/MG','EDUARDO JOSÉ SILVA',NULL,30,'RUA ARAXÁ, 44 - CRUZEIRO','Alterosa','MG','13400-000',false),
  ('AREADO/MG','EDUARDO JOSÉ SILVA',NULL,41,'RUA DELFIN MOREIRA, 180 - SAO VICENTE','Areado','MG','37140-000',false),
  ('CAMACHO/MG','EDUARDO JOSÉ SILVA',NULL,68,'Rua José Furtado, 80 - Caneleira','Camacho','MG','35555-000',false),
  ('CANDEIAS/MG','EDUARDO JOSÉ SILVA',NULL,46,'Praça Marechal Deodoro, 9 - Alto do Cruzeiro','Candeias','MG','37280-000',false),
  ('CRISTAIS/MG','EDUARDO JOSÉ SILVA',NULL,59,'Rua Francisco de Assis Carvalho, 605 - PQ. NOSSA SENHORA DAS GRAÇAS','Cristais','MG','37275-000',false),
  ('ITAPECERICA/MG','EDUARDO JOSÉ SILVA',NULL,53,'Rua Maria Luzia Santos, 173 - PQ. NOSSA SENHORA DAS GRAÇAS','Itapecerica','MG','35550-000',false),
  ('LAMBARÍ/MG','EDUARDO JOSÉ SILVA',NULL,12,'Rua Licerio Pinheiro de Paula, 39 - Povoado','Lambari','MG','37275-000',false),
  ('SUB - COMUNIDADE DE PIMENTAS/MG','EDUARDO JOSÉ SILVA',NULL,0,'Zona Rural, - AREA RURAL','Candeias','MG','37280-000',false),
  ('SUB - COSTAS/MG','EDUARDO JOSÉ SILVA',NULL,2,'POVOADO COSTAS, - ZONA RURAL','Camacho','MG','35555-000',false),
  ('SUB - DAVIS/MG','EDUARDO JOSÉ SILVA',NULL,2,'RUA HORACIO FIGUEIREDO, 810 - DAVIS','Campo Belo','MG','37270-000',false),
  ('SUB - MONTESA/MG','EDUARDO JOSÉ SILVA',NULL,2,'RUA DALLAS, 45 - CIDADE MONTESA','Campo Belo','MG','37270-000',false)
) AS c(nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);

-- REGIONAL 004
INSERT INTO public.units (type, name, parent_id, is_headquarters, is_sector_mother, status)
SELECT 'IGREJA', v.nome, (SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 004'), false, v.lider, 'ACTIVE'
FROM (VALUES
  ('PRADO/BA', true),('ALDEIA XANDÓ/BA', false),('BARRA VELHA/BA', false),('CORUMBAU - BA', false),
  ('CUMURUXATIBA/BA', false),('SUB - VELEIROS/BA', false)
) AS v(nome, lider);

INSERT INTO public.churches (name, pastor_name, pastor_phone, member_count, address, city, state, zip_code, unit_id, is_sector_head, status)
SELECT c.nome, c.dirigente, c.celular, c.membros, c.endereco, c.cidade, c.uf, c.cep,
  (SELECT id FROM public.units WHERE type='IGREJA' AND name=c.nome AND parent_id=(SELECT id FROM public.units WHERE type='SETOR' AND name='REGIONAL 004')),
  c.lider, 'ACTIVE'
FROM (VALUES
  ('PRADO/BA','DAVID DA SILVA ARAUJO','(82) 99600-7423',42,'Rua Rosalvo Garcia Guerra, 49 - SAO SEBASTIAO','Prado','BA','45980-000',true),
  ('ALDEIA XANDÓ/BA','DAVID DA SILVA ARAUJO',NULL,44,'RUA PORTO DO BOI, - S/N','Porto Seguro','BA','45810-000',false),
  ('BARRA VELHA/BA','DAVID DA SILVA ARAUJO',NULL,30,'RUA PAU BRASIL, - S/N','Porto Seguro','BA','45810-000',false),
  ('CORUMBAU - BA','DAVID DA SILVA ARAUJO',NULL,60,'LOTEAMENTO FLOR DO CAMPO, - CORUMBAU','Prado','BA','45980-000',false),
  ('CUMURUXATIBA/BA','DAVID DA SILVA ARAUJO',NULL,31,'RUA AURELINO JORGE DE OLIVEIRA, 3 - Areia Preta','Prado','BA','45980-000',false),
  ('SUB - VELEIROS/BA','DAVID DA SILVA ARAUJO',NULL,2,'RUA PRINCIPAL S/N, - VELEIROS /BA','Prado','BA','45980-000',false)
) AS c(nome, dirigente, celular, membros, endereco, cidade, uf, cep, lider);
