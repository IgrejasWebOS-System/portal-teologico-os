-- Badge "De fora" na lista de professores estava errada (28/09/2026,
-- achado do Joaquim): a lista decidia Membro/De fora olhando
-- `tipo_professor === 'MEMBRO' && member_id`, mas esse campo só fica
-- preenchido quando a busca de membro (BuscaProfessorCompleta) encontra
-- um match -- não tem nenhuma relação com o fato de a ficha já trazer
-- setor/igreja preenchidos, nem com qual rota de cadastro foi usada.
-- Resultado: todo professor cadastrado sem usar a busca (ainda que pela
-- rota "/novo/membro", com setor/igreja normais) caía em "De fora".
--
-- Regra correta (pedido do Joaquim): só é "De fora" quando o cadastro
-- veio mesmo da rota /novo/externo ("Professor sem cadastro de membro
-- nesta igreja — ficha completa preenchida manualmente"). Isso é uma
-- decisão de ROTA, não de resultado de busca -- por isso vira uma coluna
-- própria, setada só na criação (addProfessorAction), nunca tocada na
-- edição (updateProfessorAction não grava este campo).
--
-- Backfill: todos os professores já cadastrados em staging até hoje
-- vieram de teste manual pela rota "/novo/membro" (com busca disponível,
-- ainda que sem match) -- nenhum deles passou pela rota /novo/externo de
-- verdade -- então o default `false` já corrige a exibição errada atual.
alter table professores
  add column if not exists veio_de_fora boolean not null default false;

comment on column professores.veio_de_fora is
  'true somente quando o cadastro foi criado pela rota /novo/externo (Professor sem cadastro de membro). Nunca reescrito na edição -- não confundir com tipo_professor/member_id, que refletem se a busca de membro encontrou um match.';
