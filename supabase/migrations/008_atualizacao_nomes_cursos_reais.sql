-- Alinha 3 dos 5 cursos de demonstração com nomes reais do catálogo
-- do CETADP (fonte: apresentação institucional em PDF, 03/04/25).
-- Hermenêutica Bíblica e Homilética — A Arte de Pregar já batiam
-- com disciplinas reais e foram mantidos sem alteração.

UPDATE courses
SET title = 'Curso Teológico Básico'
WHERE title = 'Fundamentos da Fé Cristã';

UPDATE courses
SET title = 'Curso Teológico Médio'
WHERE title = 'Teologia Sistemática';

UPDATE courses
SET title = 'EBOM — Escola Bíblica de Obreiros e Membros'
WHERE title = 'Liderança e Ministério Pastoral';
