-- 115_nucleo_despesas.sql
-- Fase 2 do Painel do Professor (27/09/2026) — "Caixa do núcleo", escopo
-- fechado com o Joaquim: só despesas (não duplica entrada de mensalidade,
-- que já vive em fin_contas_receber), sem abrir/fechar caixa (lançamento
-- solto, sem o ritual do Caixa Diário da secretaria) e sem aprovação — o
-- professor lança direto, autonomia total sobre o próprio núcleo.
--
-- Por que uma tabela nova em vez de estender fin_contas_pagar: aquela
-- tabela já tem um modelo de conta a pagar completo (vencimento, parcelas,
-- fornecedor, status de aprovação implícito da secretaria) que não bate
-- com o que foi pedido aqui (lançamento simples e imediato). Reaproveita
-- fin_categorias (plano de contas já existente, global/compartilhado) só
-- pra classificar a despesa, sem herdar o resto do modelo de contas a
-- pagar. Nada em fin_contas_pagar/fin_caixa_diario foi alterado.

create table if not exists nucleo_despesas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores(id) on delete cascade,
  -- Igreja/núcleo dono da despesa — copiado de professores.church_id no
  -- momento do lançamento (não referenciado via join toda vez), mas
  -- mantido como FK própria pra permitir, no futuro, um professor com mais
  -- de um núcleo lançar despesa explicitamente em cada um.
  church_id uuid references churches(id),
  categoria_id uuid references fin_categorias(id),
  descricao text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  data_despesa date not null default current_date,
  forma_pagamento text,
  comprovante_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nucleo_despesas_professor on nucleo_despesas(professor_id);
create index if not exists idx_nucleo_despesas_church on nucleo_despesas(church_id);
create index if not exists idx_nucleo_despesas_data on nucleo_despesas(data_despesa desc);

alter table nucleo_despesas enable row level security;

-- Professor só vê/edita as próprias despesas (via professores.user_id =
-- auth.uid()) — mesmo padrão de posse usado em ead_matriculas.professor_id
-- nas actions de professor/actions.ts.
create policy nucleo_despesas_professor_all
  on nucleo_despesas
  for all
  using (
    exists (
      select 1 from professores p
      where p.id = nucleo_despesas.professor_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from professores p
      where p.id = nucleo_despesas.professor_id
        and p.user_id = (select auth.uid())
    )
  );

-- Staff (secretaria/admin) enxerga tudo pra relatório/auditoria, mesmo
-- critério de escopo territorial já usado em professores_select_scoped
-- (migration 111): super master, admin global, ou unidade acessível via
-- get_accessible_unit_ids() — aqui resolvida através da igreja da despesa.
create policy nucleo_despesas_staff_select
  on nucleo_despesas
  for select
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from churches c
      where c.id = nucleo_despesas.church_id
        and c.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );
