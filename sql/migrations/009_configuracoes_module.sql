-- ============================================================
-- Migration 009 — Módulo Configurações
-- Execute no SQL Editor do Supabase (após fazer backup)
-- ============================================================

-- 1. Adicionar colunas à tabela churches (se não existirem)
ALTER TABLE public.churches
  ADD COLUMN IF NOT EXISTS church_type  text DEFAULT 'CHURCH',
  ADD COLUMN IF NOT EXISTS sector_id    uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_id    uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pastor_name  text,
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS is_sede      boolean DEFAULT false;

-- 2. Adicionar coluna mother_church_id em sectors (para Líderes de Setor)
ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS mother_church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_churches_church_type ON public.churches(church_type);
CREATE INDEX IF NOT EXISTS idx_churches_sector_id   ON public.churches(sector_id);
CREATE INDEX IF NOT EXISTS idx_churches_parent_id   ON public.churches(parent_id);

-- ============================================================
-- Verificar resultado
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('churches', 'sectors')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
