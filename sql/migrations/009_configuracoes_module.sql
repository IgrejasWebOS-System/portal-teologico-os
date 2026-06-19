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

-- 3. Criar tabela de departamentos
CREATE TABLE IF NOT EXISTS public.settings_departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings_departments ENABLE ROW LEVEL SECURITY;

-- 4. Policy para departamentos (usando DROP + CREATE para evitar conflito)
DROP POLICY IF EXISTS "church members manage departments" ON public.settings_departments;

CREATE POLICY "church members manage departments"
  ON public.settings_departments FOR ALL
  USING (
    church_id = (
      SELECT church_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_churches_church_type ON public.churches(church_type);
CREATE INDEX IF NOT EXISTS idx_churches_sector_id   ON public.churches(sector_id);
CREATE INDEX IF NOT EXISTS idx_churches_parent_id   ON public.churches(parent_id);
CREATE INDEX IF NOT EXISTS idx_settings_departments_church ON public.settings_departments(church_id);

-- ============================================================
-- Verificar resultado — deve listar as colunas criadas
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('churches', 'sectors', 'settings_departments')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
