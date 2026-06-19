-- ============================================================
-- Migration 003: member_timeline
-- Histórico eclesiástico de cada membro (log de ocorrências)
-- ============================================================

CREATE TABLE IF NOT EXISTS member_timeline (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  church_id       UUID        REFERENCES churches(id) ON DELETE SET NULL,
  event_type      VARCHAR(50) NOT NULL DEFAULT 'OCORRÊNCIA',
  description     TEXT        NOT NULL,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_member_timeline_member_id  ON member_timeline(member_id);
CREATE INDEX IF NOT EXISTS idx_member_timeline_church_id  ON member_timeline(church_id);
CREATE INDEX IF NOT EXISTS idx_member_timeline_created_at ON member_timeline(created_at DESC);

-- RLS
ALTER TABLE member_timeline ENABLE ROW LEVEL SECURITY;

-- Leitura: somente para usuários da mesma igreja
CREATE POLICY "member_timeline_select"
  ON member_timeline FOR SELECT
  USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Inserção: somente para usuários da mesma igreja
CREATE POLICY "member_timeline_insert"
  ON member_timeline FOR INSERT
  WITH CHECK (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Atualização e deleção apenas pelo próprio usuário ou admin (opcional)
CREATE POLICY "member_timeline_update"
  ON member_timeline FOR UPDATE
  USING (created_by = auth.uid());
