-- 107_seed_siglas_cargos.sql
-- Preenche a sigla dos cargos já existentes (ex.: PASTOR = PR) e cria os
-- cargos que faltavam, a partir da lista trazida pelo Joaquim em
-- 15/09/2026. Decisões confirmadas com ele antes de rodar:
--   1) "DIACONIZA DE HONRA" estava duplicado com duas siglas (DSAHR e
--      DCHR) na lista original — a 2ª linha era "DIÁCONO DE HONRA"
--      (masculino, sigla DCHR), não Diaconisa de novo.
--   2) Os 5 cargos já cadastrados que não apareciam na lista (Auxiliar de
--      Obreiro, Pastor Auxiliar, Pastor Presidente, Líder de Departamento,
--      Obreiro(a)) ficam como estão, sem sigla.
--   3) "Missionário(a)" (combinado) foi confirmado sem nenhum membro
--      vinculado (role_id) — substituído por dois cargos separados,
--      Missionária/Missionário, conforme a lista.

-- 1) Sigla nos cargos que já existem e batem com a lista (match por nome).
update ecclesiastical_roles set sigla = 'COOP.' where name = 'Cooperador(a)';
update ecclesiastical_roles set sigla = 'DCZ'   where name = 'Diaconisa';
update ecclesiastical_roles set sigla = 'DC'    where name = 'Diácono';
update ecclesiastical_roles set sigla = 'EV'    where name = 'Evangelista';
update ecclesiastical_roles set sigla = 'MB'    where name = 'MEMBRO';
update ecclesiastical_roles set sigla = 'PR'    where name = 'Pastor';
update ecclesiastical_roles set sigla = 'PB'    where name = 'Presbítero';

-- 2) "Missionário(a)" combinado sai, entram os dois separados (item 12 e 13
--    da lista) — sem membro vinculado, confirmado antes de remover.
delete from ecclesiastical_roles where name = 'Missionário(a)';

-- 3) Cargos novos que não existiam ainda.
insert into ecclesiastical_roles (name, sigla) values
  ('CONGREGADO',              'CONG'),
  ('AUXILIAR',                'AUX'),
  ('AUXILIAR DE HONRA',       'AUXHR'),
  ('COOPERADOR(A) DE HONRA',  'COOPHR.'),
  ('DIACONISA DE HONRA',      'DSAHR'),
  ('DIÁCONO DE HONRA',        'DCHR'),
  ('PRESBÍTERO DE HONRA',     'PBHR'),
  ('EVANGELISTA DE HONRA',    'EVHR'),
  ('MISSIONÁRIA',             'MISSA'),
  ('MISSIONÁRIO',             'MISSO'),
  ('MISSIONÁRIO(A) DE HONRA', 'MISSHR'),
  ('PASTOR DE HONRA',         'PRHR');
