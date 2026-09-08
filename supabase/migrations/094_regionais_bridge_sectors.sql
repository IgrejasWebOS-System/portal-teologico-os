-- ============================================================
-- 094 — Bridge das 23 Regionais em `sectors` (mesmo tratamento de Setor)
--
-- Achado do parecer PARECER_TECNICO_REGIONAIS_NUCLEOS_ENSINO.md: Regional
-- já usa unit_type = 'SETOR' em `units` (correto — mesma hierarquia, mesma
-- regra de RLS/admin_roles que um Setor local), mas nunca ganhou linha na
-- tabela-ponte `sectors`, que é o que os formulários de matrícula e o
-- dropdown Setor/Igreja realmente consultam. Resultado: as 23 Regionais
-- e suas ~314 igrejas ficavam fora do fluxo de matrícula.
--
-- Correção: NÃO cria um unit_type novo (evitaria duplicar regra/RLS).
-- Só estende `sectors` com uma coluna de rótulo (`categoria`) e insere as
-- Regionais como linhas normais, mesma tabela, mesma regra.
-- ============================================================

ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'SETOR'
    CHECK (categoria IN ('SETOR', 'REGIONAL'));

-- Insere as 23 Regionais como linhas-ponte, mesma forma que os 15 Setores
-- locais já têm (name + unit_id), só marcando categoria = 'REGIONAL'.
INSERT INTO public.sectors (name, unit_id, categoria, status)
SELECT u.name, u.id, 'REGIONAL', 'ACTIVE'
FROM public.units u
WHERE u.type = 'SETOR'
  AND u.name LIKE 'REGIONAL %'
  AND NOT EXISTS (SELECT 1 FROM public.sectors s WHERE s.unit_id = u.id);

-- Preenche churches.sector_id para as igrejas de Regional — mesma lógica
-- que já valia pras igrejas de Setor local, só que a linha-ponte não
-- existia até a inserção acima.
UPDATE public.churches c
SET sector_id = s.id
FROM public.units u
JOIN public.sectors s ON s.unit_id = u.parent_id
WHERE c.unit_id = u.id
  AND u.type = 'IGREJA'
  AND c.sector_id IS NULL
  AND s.categoria = 'REGIONAL';
