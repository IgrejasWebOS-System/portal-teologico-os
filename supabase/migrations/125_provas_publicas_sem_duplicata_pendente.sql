-- 125_provas_publicas_sem_duplicata_pendente.sql
--
-- 01/10/2026, achado em teste (Joaquim): fazer a mesma prova pública 3x
-- com o mesmo CPF criava 3 linhas pendentes em provas_publicas_respostas.
-- Quando a matrícula desse CPF fosse criada, o trigger
-- vincular_provas_publicas_por_cpf (migration 123) linkaria as 3 de uma
-- vez só, bagunçando o histórico do aluno.
--
-- Limpeza: apaga tentativas pendentes repetidas de teste (deixa só a mais
-- recente por prova+CPF) -- em produção a tabela ainda está vazia neste
-- ponto, então este DELETE é um no-op; aplicado mesmo assim pra manter o
-- histórico de migrations idêntico ao de staging.
delete from public.provas_publicas_respostas r
where r.ead_aluno_id is null
  and r.id not in (
    select distinct on (prova_id, cpf) id
    from public.provas_publicas_respostas
    where ead_aluno_id is null
    order by prova_id, cpf, enviado_em desc
  );

-- Índice único parcial: só pode existir 1 linha PENDENTE (ead_aluno_id is
-- null) por prova+CPF. Linhas já vinculadas (ead_aluno_id preenchido)
-- ficam de fora -- nunca apaga um resultado que já virou oficial.
create unique index if not exists provas_publicas_respostas_prova_cpf_pendente_key
  on public.provas_publicas_respostas (prova_id, cpf)
  where ead_aluno_id is null;

comment on index public.provas_publicas_respostas_prova_cpf_pendente_key is
  'Só 1 tentativa pendente por prova+CPF -- a Server Action apaga a tentativa pendente anterior antes de gravar a nova (ver enviarProvaPublicaAction).';
