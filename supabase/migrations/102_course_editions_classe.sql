-- Classe (A/B) para course_editions — 15/09/2026.
--
-- Preparação estrutural pedida pelo Joaquim: em raras situações, duas
-- salas diferentes dão a mesma turma (mesmo curso/ano/igreja/turno) com
-- professores distintos — ex.: Turma 1 - Classe A e Turma 1 - Classe B na
-- Sede, mesmo horário, professores diferentes. Não é o padrão (a maioria
-- das turmas continua com classe em branco = uma única sala), então esta
-- migration só adiciona a coluna, sem preencher nenhuma linha existente.

alter table course_editions
  add column if not exists classe text;

comment on column course_editions.classe is
  'Opcional. Distingue duas salas paralelas da mesma turma (ex: "A"/"B"). Em branco = turma única, sem sala paralela — é o caso da grande maioria.';
