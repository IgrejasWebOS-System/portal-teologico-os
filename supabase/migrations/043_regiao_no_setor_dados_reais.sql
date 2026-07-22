-- 043_regiao_no_setor_dados_reais.sql
-- Correção de modelo: Região é propriedade do Setor (1 setor = 1 região
-- fixa), não da Igreja individualmente. Também carrega os 15 setores
-- reais e as 7 regiões do Campo de Piracicaba, substituindo os
-- placeholders SETOR-01..SETOR-15.

alter table sectors
  add column if not exists regiao_id uuid references regioes(id) on delete set null;

alter table churches
  drop column if exists regiao_id;

insert into regioes (name) values
  ('CENTRO/NORTE'),
  ('SUL'),
  ('LESTE'),
  ('OESTE'),
  ('NOROESTE'),
  ('NORDESTE'),
  ('SUDOESTE')
on conflict (name) do nothing;

update sectors set name = 'SETOR 01 - VILA REZENDE',    regiao_id = (select id from regioes where name = 'CENTRO/NORTE') where name = 'SETOR-01';
update sectors set name = 'SETOR 02 - ARTÊMIS',         regiao_id = (select id from regioes where name = 'CENTRO/NORTE') where name = 'SETOR-02';
update sectors set name = 'SETOR 03 - BOM SAMARITANO',  regiao_id = (select id from regioes where name = 'SUL')          where name = 'SETOR-03';
update sectors set name = 'SETOR 04 - PIRACICAMIRIM',   regiao_id = (select id from regioes where name = 'LESTE')        where name = 'SETOR-04';
update sectors set name = 'SETOR 05 - SÃO PEDRO',       regiao_id = (select id from regioes where name = 'NOROESTE')     where name = 'SETOR-05';
update sectors set name = 'SETOR 06 - PAULICÉIA',       regiao_id = (select id from regioes where name = 'SUL')          where name = 'SETOR-06';
update sectors set name = 'SETOR 07 - CHARQUEADA',      regiao_id = (select id from regioes where name = 'NOROESTE')     where name = 'SETOR-07';
update sectors set name = 'SETOR 08 - IRACEMÁPOLIS',    regiao_id = (select id from regioes where name = 'NORDESTE')     where name = 'SETOR-08';
update sectors set name = 'SETOR 09 - SANTO ANTÔNIO',   regiao_id = (select id from regioes where name = 'OESTE')        where name = 'SETOR-09';
update sectors set name = 'SETOR 10 - SÃO FRANCISCO',   regiao_id = (select id from regioes where name = 'LESTE')        where name = 'SETOR-10';
update sectors set name = 'SETOR 11 - SANTA TEREZINHA', regiao_id = (select id from regioes where name = 'CENTRO/NORTE') where name = 'SETOR-11';
update sectors set name = 'SETOR 12 - CONCHAS',         regiao_id = (select id from regioes where name = 'SUDOESTE')     where name = 'SETOR-12';
update sectors set name = 'SETOR 13 - MARIO DEDINI',    regiao_id = (select id from regioes where name = 'CENTRO/NORTE') where name = 'SETOR-13';
update sectors set name = 'SETOR 14 - KOBAYAT LÍBANO',  regiao_id = (select id from regioes where name = 'OESTE')        where name = 'SETOR-14';
update sectors set name = 'SETOR 15 - INDEPENDÊNCIA',   regiao_id = (select id from regioes where name = 'LESTE')        where name = 'SETOR-15';
