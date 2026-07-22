-- 045_nacionalidade_consentimento_lgpd.sql
-- Fecha dois gaps do parecer PARECER_FORMULARIO_MATRICULA_E_PROVAS_REAIS.md:
-- nacionalidade (não existia coluna) e consentimento LGPD explícito
-- (o formulário físico tem declaração assinada, art. 7º/11 da Lei 13.709/2018).

alter table ead_alunos
  add column if not exists nacionalidade text not null default 'Brasileira',
  add column if not exists consentimento_lgpd_aceito boolean not null default false,
  add column if not exists consentimento_lgpd_data timestamptz;

update ead_alunos set nacionalidade = 'Brasileira' where nacionalidade is null;
