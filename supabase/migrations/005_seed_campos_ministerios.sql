-- ============================================================
-- Seed de campos/ministérios — aplicada diretamente via execute_sql
-- (dado de referência, não DDL) ao criar o projeto isolado.
-- Registrada aqui para o arquivo local bater com o que está em produção.
-- ============================================================

INSERT INTO public.ead_campos_ministerios (nome, tipo, ativo) VALUES
  ('Campo Piracicaba Sede', 'CAMPO', true),
  ('Ministério de Jovens', 'MINISTERIO', true),
  ('Ministério de Missões', 'MINISTERIO', true)
ON CONFLICT DO NOTHING;
