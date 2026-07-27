-- 069: Vincula professores diretamente a units (Campo/Sede/Setor/Igreja/Sub-unidade),
-- permitindo a cascata real no formulario de cadastro. church_id/sector_id continuam
-- sendo preenchidos (bridge) a partir do unit_id escolhido, para nao quebrar a listagem atual.
ALTER TABLE professores ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES units(id);
