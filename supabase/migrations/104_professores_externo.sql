-- Professor de fora (não-membro) — 15/09/2026.
--
-- Correção: o módulo de professor foi criado justamente para cobrir
-- professores que vêm de fora e NÃO são membros da igreja (não têm
-- cadastro em `members`), então a ficha completa não pode depender de
-- member_id. Mesma lógica já usada em Nova Matrícula: quando o professor
-- É membro, os campos abaixo continuam vindo de `members` (sem duplicar,
-- só leitura); quando NÃO é membro ("Professor de fora"), a secretaria
-- preenche esses mesmos campos aqui, direto na ficha do professor.

alter table professores
  add column if not exists tipo_professor text check (tipo_professor in ('MEMBRO','EXTERNO')),
  add column if not exists cpf text,
  add column if not exists rg text,
  add column if not exists rg_orgao_emissor text,
  add column if not exists rg_uf text,
  add column if not exists data_nascimento date,
  add column if not exists genero text,
  add column if not exists estado_civil text,
  add column if not exists escolaridade text,
  add column if not exists profissao text,
  add column if not exists naturalidade_cidade text,
  add column if not exists naturalidade_estado text,
  add column if not exists nacionalidade text,
  add column if not exists nome_conjuge text,
  add column if not exists nome_mae text,
  add column if not exists nome_pai text,
  add column if not exists cep text,
  add column if not exists endereco text,
  add column if not exists endereco_numero text,
  add column if not exists endereco_complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists foto_url text;

comment on column professores.tipo_professor is
  'MEMBRO = ficha completa vem de members via member_id (só leitura aqui). EXTERNO = ficha completa preenchida direto nestas colunas, porque a pessoa não tem cadastro em members.';

-- Backfill dos 4 professores já cadastrados: nenhum deles tem member_id
-- (nunca passaram pela busca de membro), então o dado real hoje é que o
-- sistema não tem vínculo nenhum com `members` pra eles — inferimos
-- EXTERNO a partir disso. Se algum for membro de fato, a secretaria
-- reabre o cadastro, troca pra "Professor membro" e vincula pela busca
-- de matrícula/CPF.
update professores set tipo_professor = 'EXTERNO' where member_id is null and tipo_professor is null;
update professores set tipo_professor = 'MEMBRO' where member_id is not null and tipo_professor is null;
