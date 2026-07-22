-- 044_matricula_setor_igreja_turma_professor.sql
-- Nova Matrícula Direta: vincula o aluno ao Setor/Igreja onde estuda
-- (mesma informação do formulário físico "Núcleo/Setor" + "Igreja") e a
-- matrícula à Turma (course_editions) e ao Professor(a) responsável.

alter table ead_alunos
  add column if not exists sector_id uuid references sectors(id) on delete set null,
  add column if not exists church_id uuid references churches(id) on delete set null;

alter table ead_matriculas
  add column if not exists course_edition_id uuid references course_editions(id) on delete set null,
  add column if not exists professor_id uuid references professores(id) on delete set null;
