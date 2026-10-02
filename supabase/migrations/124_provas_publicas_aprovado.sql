-- 124_provas_publicas_aprovado.sql
--
-- 01/10/2026, pedido do Joaquim: as provas públicas por link + CPF devem
-- seguir a mesma regra de aprovação já usada nas provas oficiais da
-- plataforma -- NOTA_MINIMA = 6.1 (ver
-- src/app/[locale]/portal/testes/[lessonId]/actions.ts, atualizado em
-- 29/09/2026 de 6,0 pra 6,1). Guardamos o resultado já calculado (em vez
-- de só a nota) pra não depender de recalcular o limiar toda vez que
-- alguém olhar provas_publicas_respostas.

alter table public.provas_publicas_respostas
  add column if not exists aprovado boolean not null default false;

comment on column public.provas_publicas_respostas.aprovado is
  'nota >= 6.1 (mesmo limiar das provas oficiais, NOTA_MINIMA em portal/testes/[lessonId]/actions.ts). Calculado no envio, não recalcular aqui.';
