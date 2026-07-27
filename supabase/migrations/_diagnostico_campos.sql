-- Diagnóstico (SOMENTE LEITURA, não é migração) — roda no SQL Editor
-- e cola o resultado de volta. Mostra, para cada Campo, quantos
-- Setores/Igrejas/Sub-unidades/Membros/Professores existem hoje.
WITH RECURSIVE arvore AS (
  SELECT id, type, name, parent_id, id AS campo_id
  FROM units WHERE type = 'CAMPO'
  UNION ALL
  SELECT u.id, u.type, u.name, u.parent_id, a.campo_id
  FROM units u
  JOIN arvore a ON u.parent_id = a.id
)
SELECT
  campo.name AS campo,
  count(DISTINCT a.id) FILTER (WHERE a.type = 'SETOR')            AS setores,
  count(DISTINCT a.id) FILTER (WHERE a.type = 'IGREJA')           AS igrejas,
  count(DISTINCT a.id) FILTER (WHERE a.type = 'SUB_CONGREGACAO')  AS sub_congregacoes,
  count(DISTINCT a.id) FILTER (WHERE a.type = 'PONTO_PREGACAO')   AS pontos_pregacao,
  count(DISTINCT a.id) FILTER (WHERE a.type = 'CELULA')           AS celulas,
  count(DISTINCT s.regiao_id)                                     AS regioes_distintas,
  count(DISTINCT m.id)                                            AS membros,
  count(DISTINCT p.id)                                            AS professores
FROM units campo
LEFT JOIN arvore a       ON a.campo_id = campo.id AND a.id <> campo.id
LEFT JOIN sectors s      ON s.unit_id = a.id AND a.type = 'SETOR'
LEFT JOIN churches c     ON c.unit_id = a.id AND a.type IN ('IGREJA','SUB_CONGREGACAO','PONTO_PREGACAO','CELULA')
LEFT JOIN members m      ON m.church_id = c.id
LEFT JOIN professores p  ON p.unit_id = a.id
WHERE campo.type = 'CAMPO'
GROUP BY campo.name
ORDER BY campo.name;
