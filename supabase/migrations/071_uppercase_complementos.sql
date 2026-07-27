-- 071_uppercase_complementos.sql
-- A seed original (029_seed_tabelas_auxiliares_configuracoes.sql) cadastrou
-- Gênero/Estado Civil/Escolaridade/Profissões/Regiões-DF em Title Case
-- ("Solteiro(a)", "Pastor(a)"...). O formulário de Cadastrar/Editar dessas
-- telas já força maiúsculas em texto novo (SimpleSettingsCRUD + as
-- server actions add/updateSettingItemAction) — esta migração só corrige
-- os registros legados pra ficarem consistentes com o padrão atual.

UPDATE public.settings_gender
  SET name = UPPER(TRIM(name));

UPDATE public.settings_civil_status
  SET name = UPPER(TRIM(name));

UPDATE public.settings_schooling
  SET name = UPPER(TRIM(name));

UPDATE public.settings_professions
  SET name = UPPER(TRIM(name));

UPDATE public.settings_custom_regions
  SET name = UPPER(TRIM(name))
  WHERE state_uf = 'DF';
