-- ============================================================
-- 098_courses_visivel_busca.sql
-- Pedido do Joaquim (25/09/2026): dropdowns de seleção de curso (nova
-- turma, vincular turma, nova matrícula) estão mostrando TODOS os cursos
-- cadastrados (14 hoje), incluindo os que ainda não estão liberados pro
-- público (Diaconato, Presbitério, Tesouraria, etc.) -- só o Curso
-- Teológico Básico e o Médio devem aparecer nessas listas de seleção por
-- enquanto. Os demais continuam existindo normalmente em /admin/conteudo
-- (edição de conteúdo/aulas não é afetada), só somem das listas de
-- escolha de curso pra nova turma/matrícula.
--
-- Aplicada e verificada em staging (cjxdroyyplpknygtcdgr) em 25/09/2026.
-- ============================================================

alter table courses add column if not exists visivel_busca boolean not null default true;

update courses set visivel_busca = false
where title not in ('Curso Teológico Básico', 'Curso Teológico Médio');

comment on column courses.visivel_busca is 'Controla se o curso aparece nos dropdowns de seleção (nova turma, vincular turma, nova matrícula). false = curso existe mas está temporariamente fora dessas listas.';
