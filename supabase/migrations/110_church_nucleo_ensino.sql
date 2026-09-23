-- 110_church_nucleo_ensino.sql
-- Pedido do Joaquim (21/09/2026), teste de ponta a ponta da Matrícula
-- Direta: precisa filtrar "matrículas por igreja núcleo" dentro de um
-- Setor/Regional na tela /admin/matriculas. Não existia hoje nenhum
-- conceito de "núcleo de ensino" no schema (confirmado: nem em churches,
-- nem em units) -- só existia implicitamente via professores.unit_id +
-- admin_roles nível 4 (ver PARECER_TECNICO_REGIONAIS_NUCLEOS_ENSINO.md).
-- Decisão do Joaquim: em vez de derivar isso dinamicamente (frágil, só
-- funciona se já tiver professor cadastrado ali), criar um flag manual
-- que a própria secretaria liga/desliga por igreja.
alter table churches
  add column if not exists is_nucleo_ensino boolean not null default false;

comment on column churches.is_nucleo_ensino is
  'Marca a igreja como núcleo de ensino (onde cursos são ministrados de fato) — controlado manualmente pela secretaria em Configurações. Usado pra filtrar a tela de Matrículas por "igreja núcleo" dentro de um Setor/Regional.';
