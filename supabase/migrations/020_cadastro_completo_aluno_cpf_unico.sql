-- Ficha cadastral completa do aluno EAD (mesmo padrão de riqueza já
-- usado em `members`, reaproveitando as tabelas settings_* existentes
-- para as opções de gênero/estado civil/escolaridade/profissão) +
-- CPF único (uma pessoa = uma linha em ead_alunos; os cursos dela
-- ficam em ead_matriculas, migration seguinte).

ALTER TABLE public.ead_alunos
  ADD COLUMN rg text,
  ADD COLUMN rg_orgao_emissor text,
  ADD COLUMN rg_uf text,
  ADD COLUMN data_nascimento date,
  ADD COLUMN genero text,
  ADD COLUMN estado_civil text,
  ADD COLUMN escolaridade text,
  ADD COLUMN profissao text,
  ADD COLUMN naturalidade_cidade text,
  ADD COLUMN naturalidade_estado text,
  ADD COLUMN nome_conjuge text,
  ADD COLUMN nome_mae text,
  ADD COLUMN nome_pai text,
  ADD COLUMN cep text,
  ADD COLUMN endereco text,
  ADD COLUMN endereco_numero text,
  ADD COLUMN endereco_complemento text,
  ADD COLUMN bairro text,
  ADD COLUMN cidade text,
  ADD COLUMN estado text,
  ADD COLUMN foto_url text;

CREATE UNIQUE INDEX ead_alunos_cpf_unique
  ON public.ead_alunos (cpf)
  WHERE (cpf IS NOT NULL AND cpf <> '');
