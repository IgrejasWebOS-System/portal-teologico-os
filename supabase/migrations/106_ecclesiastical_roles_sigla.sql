-- 106_ecclesiastical_roles_sigla.sql
-- Cargos (Configurações > Cargos) passam a ter, além do nome, uma sigla
-- (ex.: PASTOR = PR, DIÁCONO = DC) — pedido do Joaquim em 15/09/2026 pra
-- exibir/imprimir o cargo de forma abreviada em outras telas do sistema.
-- Coluna opcional (nullable) pra não quebrar os 13 cargos já cadastrados,
-- que ficam sem sigla até alguém preencher pela tela de edição.

alter table ecclesiastical_roles
  add column if not exists sigla text;
