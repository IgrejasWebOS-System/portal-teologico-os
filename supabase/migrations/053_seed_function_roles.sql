-- 053_seed_function_roles.sql
-- Seed de papéis de Função (function_roles) comuns a qualquer
-- departamento (CIBEPI, EBD, Jovens, Secretaria, Tesouraria etc.)
-- Protegido com NOT EXISTS: pode rodar mais de uma vez sem duplicar.

insert into function_roles (name)
select v.name
from (values
  ('LÍDER'),
  ('VICE-LÍDER'),
  ('SECRETÁRIO'),
  ('TESOUREIRO'),
  ('AUXILIAR'),
  ('COORDENADOR'),
  ('CONSELHEIRO'),
  ('INSTRUTOR')
) as v(name)
where not exists (
  select 1 from function_roles fr where fr.name = v.name
);
