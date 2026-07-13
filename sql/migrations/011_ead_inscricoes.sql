-- ============================================================
-- Migration 011 — Portal EAD de Teologia (CETADP)
-- Tabelas: ead_campos_ministerios, ead_inscricoes, ead_alunos
-- Objetivo: fluxo público de inscrição -> aprovação da
--           secretaria -> geração de matrícula -> aluno ativo.
--
-- IMPORTANTE (segurança): este fluxo usa profiles.system_role
-- (já existente no schema: GLOBAL_ADMIN | SECTOR_ADMIN |
-- LOCAL_ADMIN | MEMBER) para restringir quem é "staff" e pode
-- ver/aprovar inscrições. Isso corrige, para este módulo, a
-- lacuna de controle de acesso identificada no parecer técnico
-- de 12/07/2026 (ausência de checagem de papel nas rotas de
-- admin). Recomenda-se aplicar o mesmo padrão às demais tabelas
-- administrativas do sistema.
-- ============================================================

-- ── ead_campos_ministerios ───────────────────────────────────
-- Lista de campos/ministérios que podem indicar os alunos.
-- Alimenta o <select> do formulário público de inscrição.
CREATE TABLE IF NOT EXISTS ead_campos_ministerios (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT        NOT NULL,
  tipo       TEXT        NOT NULL DEFAULT 'CAMPO', -- CAMPO | MINISTERIO
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE ead_campos_ministerios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ead_campos_select_all" ON ead_campos_ministerios;
CREATE POLICY "ead_campos_select_all"
  ON ead_campos_ministerios FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "ead_campos_write_staff" ON ead_campos_ministerios;
CREATE POLICY "ead_campos_write_staff"
  ON ead_campos_ministerios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

-- ── ead_alunos ───────────────────────────────────────────────
-- Aluno "oficializado" — criado somente após aprovação da
-- inscrição pela secretaria. Independente de `members` (que é
-- o cadastro de membros de uma igreja específica), pois um
-- aluno do EAD pode vir de qualquer campo/ministério, mesmo
-- fora do IgrejaWebOS.
CREATE TABLE IF NOT EXISTS ead_alunos (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_completo       TEXT        NOT NULL,
  cpf                 TEXT,
  email               TEXT        NOT NULL,
  telefone            TEXT,
  campo_ministerio_id UUID        REFERENCES ead_campos_ministerios(id) ON DELETE SET NULL,
  campo_ministerio_nome TEXT,
  matricula           TEXT        NOT NULL UNIQUE,
  curso_pretendido    TEXT,
  status              TEXT        NOT NULL DEFAULT 'ATIVO', -- ATIVO | INATIVO
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ead_alunos_user_id   ON ead_alunos(user_id);
CREATE INDEX IF NOT EXISTS idx_ead_alunos_matricula ON ead_alunos(matricula);

ALTER TABLE ead_alunos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ead_alunos_select_self_or_staff" ON ead_alunos;
CREATE POLICY "ead_alunos_select_self_or_staff"
  ON ead_alunos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

DROP POLICY IF EXISTS "ead_alunos_write_staff" ON ead_alunos;
CREATE POLICY "ead_alunos_write_staff"
  ON ead_alunos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

-- ── ead_inscricoes ───────────────────────────────────────────
-- Pedido de inscrição enviado publicamente (sem login).
-- Fica PENDENTE até a secretaria aprovar ou rejeitar.
CREATE TABLE IF NOT EXISTS ead_inscricoes (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo         TEXT        NOT NULL,
  cpf                   TEXT,
  email                 TEXT        NOT NULL,
  telefone              TEXT,
  campo_ministerio_id   UUID        REFERENCES ead_campos_ministerios(id) ON DELETE SET NULL,
  campo_ministerio_nome TEXT,
  curso_pretendido      TEXT        NOT NULL, -- OFICIAL | RECICLAGEM | TEOLOGIA_BASICO | TEOLOGIA_MEDIO | TEOLOGIA_AVANCADO | TREINAMENTO
  mensagem              TEXT,
  status                TEXT        NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | APROVADA | REJEITADA
  aluno_id              UUID        REFERENCES ead_alunos(id) ON DELETE SET NULL,
  matricula_gerada      TEXT,
  analisado_por         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  analisado_em          TIMESTAMPTZ,
  motivo_rejeicao       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ead_inscricoes_status ON ead_inscricoes(status);

ALTER TABLE ead_inscricoes ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante (anônimo) pode CRIAR uma inscrição pendente.
-- Isso é intencional e seguro: é um formulário público de "quero me
-- inscrever", análogo a um formulário de contato. Não expõe dados
-- de terceiros, apenas permite gravar um novo pedido.
DROP POLICY IF EXISTS "ead_inscricoes_insert_public" ON ead_inscricoes;
CREATE POLICY "ead_inscricoes_insert_public"
  ON ead_inscricoes FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'PENDENTE' AND aluno_id IS NULL);

-- Leitura e atualização (aprovar/rejeitar) somente para staff
-- (profiles.system_role <> MEMBER). Sem isso, qualquer aluno
-- logado poderia ler CPF/e-mail/telefone de outros candidatos.
DROP POLICY IF EXISTS "ead_inscricoes_select_staff" ON ead_inscricoes;
CREATE POLICY "ead_inscricoes_select_staff"
  ON ead_inscricoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

DROP POLICY IF EXISTS "ead_inscricoes_update_staff" ON ead_inscricoes;
CREATE POLICY "ead_inscricoes_update_staff"
  ON ead_inscricoes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

-- ── Matrícula EAD ────────────────────────────────────────────
-- Sequência própria, independente da matrícula de membros de
-- igreja (get_next_matricula), pois o aluno do EAD pode não
-- pertencer a nenhuma igreja cadastrada no IgrejaWebOS.
CREATE SEQUENCE IF NOT EXISTS ead_matricula_seq START WITH 1;

CREATE OR REPLACE FUNCTION get_next_matricula_ead()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  proximo INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria pode gerar matrícula.';
  END IF;

  proximo := nextval('ead_matricula_seq');
  RETURN 'CETADP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(proximo::TEXT, 4, '0');
END;
$$;

-- Apenas staff pode chamar a função de geração de matrícula
-- (ela roda com SECURITY DEFINER, então a restrição de quem
-- pode executá-la fica no GRANT/REVOKE abaixo).
REVOKE EXECUTE ON FUNCTION get_next_matricula_ead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_matricula_ead() TO authenticated;

-- ── Seed inicial (opcional) ──────────────────────────────────
INSERT INTO ead_campos_ministerios (nome, tipo) VALUES
  ('Campo Piracicaba Sede', 'CAMPO'),
  ('Ministério de Jovens', 'MINISTERIO'),
  ('Ministério de Missões', 'MINISTERIO')
ON CONFLICT DO NOTHING;
