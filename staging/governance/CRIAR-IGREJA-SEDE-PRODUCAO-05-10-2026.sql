-- CRIAR A "IGREJA" DA SEDE (producao, toduvwtzklntyptcodkf) -- 05/10/2026
--
-- Problema (print do Joaquim, professora LUCIANE BRISOTTI): em
-- /professor/matricula e /professor/configuracoes o seletor de Setor nao tem
-- a opcao "SEDE". Os formularios montam essa opcao com a IGREJA cujo
-- churches.unit_id e a unidade do tipo SEDE. Em producao a unidade SEDE
-- existe ("AD Bras Piracicaba -- Sede", id e36d8f34-4b89-4892-ae7f-cab030306db2),
-- mas NAO existe nenhuma linha em churches ligada a ela -- por isso a opcao
-- some (so /professor/turmas funciona, porque le a unidade direto).
-- Efeito colateral: a Luciane tem church_id nulo e nao consegue matricular
-- aluno nem usar Caixa/Financeiro do nucleo.
--
-- Esta correcao nao muda codigo: cria a igreja-ponte da Sede (a tabela
-- churches so tem trigger de updated_at, nada mais dispara).
-- Faca ANTES um backup (ja feito hoje: dump _PRE-pre-limpeza-cpf; para
-- ponto de retorno novo use -Label pre-igreja-sede).

-- PASSO 1 -- conferir (esperado: unidade existe e 0 igrejas ligadas a ela).
select u.id, u.name, u.type,
       (select count(*) from churches c where c.unit_id = u.id) as igrejas_ligadas
  from units u
 where u.id = 'e36d8f34-4b89-4892-ae7f-cab030306db2';

-- PASSO 2 -- criar a igreja da Sede (idempotente: so insere se nao existir).
insert into churches (name, unit_id, sector_id, is_sede, church_type, status)
select 'AD Brás Piracicaba — Sede',
       'e36d8f34-4b89-4892-ae7f-cab030306db2',
       null,
       true,
       'CHURCH',
       'ACTIVE'
 where not exists (
   select 1 from churches where unit_id = 'e36d8f34-4b89-4892-ae7f-cab030306db2'
 );

-- PASSO 3 -- conferir (esperado: 1 linha, is_sede = true).
select id, name, unit_id, sector_id, is_sede, status
  from churches
 where unit_id = 'e36d8f34-4b89-4892-ae7f-cab030306db2';

-- DEPOIS: a professora entra em /professor/configuracoes, escolhe
-- Setor = "SEDE -- AD Brás Piracicaba -- Sede" e salva (isso preenche o
-- church_id dela). A partir dai /professor/matricula tambem mostra a SEDE.
--
-- ROLLBACK (so se nenhum professor/aluno ja tiver sido ligado a ela):
-- delete from churches where unit_id = 'e36d8f34-4b89-4892-ae7f-cab030306db2';
