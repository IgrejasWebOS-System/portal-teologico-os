-- ============================================================
-- DOCUMENTAÇÃO COMPLETA DO SCHEMA — IgrejasWebOS Supabase
-- Cole este SQL no SQL Editor do Supabase e execute.
-- Projeto: swczhmhyqygpdzxwpvfo
-- ============================================================

SELECT
  t.table_name                                    AS "Tabela",
  c.column_name                                   AS "Coluna",
  c.data_type                                     AS "Tipo",
  c.udt_name                                      AS "Tipo UDT",
  c.is_nullable                                   AS "Nullable",
  c.column_default                                AS "Default",
  c.character_maximum_length                      AS "Max Length",
  CASE WHEN pk.column_name IS NOT NULL
       THEN 'PK' ELSE '' END                      AS "PK",
  CASE WHEN fk.column_name IS NOT NULL
       THEN fk.foreign_table_name || '.' || fk.foreign_column_name
       ELSE '' END                                AS "FK → Referencia"
FROM
  information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_name = t.table_name
    AND c.table_schema = t.table_schema
  -- Primary keys
  LEFT JOIN (
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  ) pk ON pk.table_name = t.table_name AND pk.column_name = c.column_name
  -- Foreign keys
  LEFT JOIN (
    SELECT
      kcu.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  ) fk ON fk.table_name = t.table_name AND fk.column_name = c.column_name
WHERE
  t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY
  t.table_name,
  c.ordinal_position;

-- ============================================================
-- RESUMO: LISTA DE TABELAS E CONTAGEM DE LINHAS
-- ============================================================

SELECT
  schemaname,
  relname AS tablename,
  n_live_tup AS registros_vivos,
  n_dead_tup AS registros_mortos
FROM
  pg_stat_user_tables
WHERE
  schemaname = 'public'
ORDER BY
  n_live_tup DESC;

-- ============================================================
-- FUNÇÕES RPC CUSTOMIZADAS
-- ============================================================

SELECT
  routine_name   AS "Função RPC",
  routine_type   AS "Tipo",
  data_type      AS "Retorno"
FROM
  information_schema.routines
WHERE
  routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY
  routine_name;
