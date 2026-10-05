-- 129_fin_contas_pagar_por_nucleo.sql
-- 04/10/2026 — decisão do Joaquim: UMA estrutura financeira só. As
-- despesas do núcleo (hoje em nucleo_despesas, migration 115) passam a
-- viver em fin_contas_pagar, a mesma tabela do /admin/financeiro, com o
-- mesmo Plano de Contas (fin_categorias). Professor e secretário lançam
-- despesa cada um na sua área; despesa de turma NÃO aparece no Financeiro
-- da turma (lá só mensalidade/histórico), então course_edition_id serve
-- apenas pra classificação/relatório de Contas a Pagar.
--
-- PRÉ-REQUISITO: backup de produção validado antes de aplicar lá
-- (E:\bk-projetos\db\portal-teologico_PROD_pre-129_*.dump).
-- Aplicar PRIMEIRO só no staging (cjxdroyyplpknygtcdgr).
--
-- O que muda:
--   1. fin_contas_pagar ganha colunas opcionais de escopo/autoria.
--      church_id NULL = despesa da instituição (comportamento de hoje).
--   2. RLS: a policy antiga fin_contas_pagar_staff (system_role, sem
--      escopo — qualquer staff via TUDO) é trocada por uma escopada por
--      unidade, no mesmo molde de fin_contas_receber (migration 111), +
--      policy do professor sobre as despesas do próprio núcleo.
--   3. Dados de nucleo_despesas copiados pra fin_contas_pagar
--      (idempotente, rastreável por origem_nucleo_despesa_id).
--   nucleo_despesas NÃO é apagada aqui: fica como histórico até a
--   migração ser conferida; remover numa migration futura.

-- ── 1. Colunas novas ─────────────────────────────────────────────
alter table public.fin_contas_pagar
  add column if not exists church_id uuid references public.churches(id) on delete set null,
  add column if not exists course_edition_id uuid references public.course_editions(id) on delete set null,
  add column if not exists professor_id uuid references public.professores(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists origem_nucleo_despesa_id uuid;

create unique index if not exists fin_contas_pagar_origem_nucleo_despesa_uidx
  on public.fin_contas_pagar(origem_nucleo_despesa_id)
  where origem_nucleo_despesa_id is not null;
create index if not exists fin_contas_pagar_church_idx on public.fin_contas_pagar(church_id);
create index if not exists fin_contas_pagar_edition_idx on public.fin_contas_pagar(course_edition_id);
create index if not exists fin_contas_pagar_professor_idx on public.fin_contas_pagar(professor_id);

-- ── 2. RLS ───────────────────────────────────────────────────────
drop policy if exists fin_contas_pagar_staff on public.fin_contas_pagar;
drop policy if exists fin_contas_pagar_scoped on public.fin_contas_pagar;
drop policy if exists fin_contas_pagar_professor on public.fin_contas_pagar;

-- Staff: super master e GLOBAL_ADMIN veem tudo (inclui despesas da
-- instituição, church_id NULL). Demais níveis só as despesas cuja igreja
-- está numa unidade acessível a eles.
create policy fin_contas_pagar_scoped on public.fin_contas_pagar
  for all
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = fin_contas_pagar.church_id
        and c.unit_id is not null
        and c.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  )
  with check (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.churches c
      where c.id = fin_contas_pagar.church_id
        and c.unit_id is not null
        and c.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );

-- Professor: enxerga e gerencia as despesas do próprio núcleo
-- (professores.church_id), nunca as da instituição (church_id NULL).
create policy fin_contas_pagar_professor on public.fin_contas_pagar
  for all
  using (
    church_id is not null
    and exists (
      select 1 from public.professores p
      where p.user_id = (select auth.uid())
        and p.church_id = fin_contas_pagar.church_id
    )
  )
  with check (
    church_id is not null
    and exists (
      select 1 from public.professores p
      where p.user_id = (select auth.uid())
        and p.church_id = fin_contas_pagar.church_id
    )
  );

-- ── 3. Migração de dados: nucleo_despesas -> fin_contas_pagar ────
-- Despesa do núcleo é lançamento imediato (já paga): status PAGO,
-- vencimento = pago_em = data da despesa, sem fin_lancamento_id (nunca
-- passou pelo Caixa Diário). forma_pagamento (texto livre) mapeada pro
-- CHECK de fin_contas_pagar; o que não bate cai em TRANSFERENCIA
-- (default da tabela).
insert into public.fin_contas_pagar (
  categoria_id, fornecedor, descricao, valor_centavos,
  forma_pagamento_prevista, data_vencimento, status, pago_em, baixado_por,
  church_id, professor_id, created_by, origem_nucleo_despesa_id, created_at
)
select
  d.categoria_id,
  'Não informado',
  d.descricao,
  d.valor_centavos,
  case upper(coalesce(d.forma_pagamento, ''))
    when 'DINHEIRO' then 'DINHEIRO'
    when 'PIX' then 'PIX'
    when 'BOLETO' then 'BOLETO'
    when 'CARTAO' then 'CARTAO'
    when 'DEBITO' then 'CARTAO'
    when 'CREDITO' then 'CARTAO'
    else 'TRANSFERENCIA'
  end,
  d.data_despesa,
  'PAGO',
  d.data_despesa::timestamptz,
  d.created_by,
  d.church_id,
  d.professor_id,
  d.created_by,
  d.id,
  d.created_at
from public.nucleo_despesas d
on conflict (origem_nucleo_despesa_id) where origem_nucleo_despesa_id is not null
do nothing;

comment on table public.nucleo_despesas is
  'DEPRECATED (129): despesas migradas para fin_contas_pagar (origem_nucleo_despesa_id). Não gravar mais aqui; remover em migration futura após conferência.';
