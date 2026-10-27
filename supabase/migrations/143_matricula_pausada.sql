-- ============================================================
-- 143_matricula_pausada.sql  (26/10/2026, pedido do Joaquim)
-- "PAUSAR CURSO": o aluno fica ausente por um periodo, sem cancelar a matricula.
--   * novo status PAUSADA em ead_matriculas (alem de EM_ANDAMENTO/APROVADO/REPROVADO/CANCELADO);
--   * colunas pausada_em, retorno_previsto e pausa_motivo (historico completo fica em auditoria_acoes);
--   * PAUSADA conta como matricula ATIVA na regra de matricula unica (nao permite abrir outra
--     matricula do mesmo curso enquanto a primeira esta pausada);
--   * PAUSADA fica fora da chamada (a lista de presenca so usa EM_ANDAMENTO) e nao mexe em parcelas:
--     ajustes financeiros sao feitos pela tela FINANCEIRO.
-- Nao apaga nem altera dados existentes. Idempotente. Staging primeiro.
-- Reversao: voltar matriculas PAUSADA para EM_ANDAMENTO e recriar o CHECK sem PAUSADA.
-- ============================================================

alter table public.ead_matriculas
  add column if not exists pausada_em date,
  add column if not exists retorno_previsto date,
  add column if not exists pausa_motivo text;

alter table public.ead_matriculas drop constraint if exists ead_matriculas_status_check;
alter table public.ead_matriculas
  add constraint ead_matriculas_status_check
  check (status = any (array['EM_ANDAMENTO'::text, 'APROVADO'::text, 'REPROVADO'::text, 'CANCELADO'::text, 'PAUSADA'::text]));

create or replace function public.check_matricula_unica()
returns trigger
language plpgsql
as $function$
begin
  if new.course_id is not null and exists (
    select 1 from public.ead_matriculas m
    where m.aluno_id = new.aluno_id
      and m.course_id = new.course_id
      and m.status in ('EM_ANDAMENTO', 'APROVADO', 'PAUSADA')
      and m.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Este aluno já possui matrícula em andamento, pausada ou aprovada neste curso.';
  end if;
  return new;
end;
$function$;

comment on column public.ead_matriculas.pausada_em is 'Data em que o curso foi pausado (status PAUSADA).';
comment on column public.ead_matriculas.retorno_previsto is 'Data prevista de retorno do aluno (opcional).';
comment on column public.ead_matriculas.pausa_motivo is 'Motivo informado ao pausar o curso.';
