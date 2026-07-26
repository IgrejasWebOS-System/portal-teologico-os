-- 067: Adiciona campo Nacionalidade (distinto de Naturalidade) em members
ALTER TABLE members ADD COLUMN IF NOT EXISTS nationality text NOT NULL DEFAULT 'Brasileira';
