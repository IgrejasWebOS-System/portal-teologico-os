-- ============================================================
-- Preços fixos por curso, administrados centralmente em Financeiro
-- (item pendente "Implementar planos de pagamento dos cursos") —
-- fonte única de verdade: qualquer tela que precise de valor de
-- matrícula/parcela por curso lê daqui, nunca hardcoded no formulário.
--
-- Modelo: valor_matricula_centavos (pode ser 0 — ex.: Curso Médio não
-- cobra matrícula separada) + valor_parcela_centavos x numero_parcelas
-- (limite de 12, mesma regra já aplicada em fin_contas_receber).
-- Valor total é sempre derivado (matricula + parcela*num_parcelas),
-- nunca guardado solto — evita os dois números saírem de sincronia.
--
-- Aplicado em staging via MCP em 05/09/2026. Rodar manualmente em
-- produção (SQL Editor ou apply_migration) antes do merge que
-- depende desta tabela.
-- ============================================================

create table if not exists course_pricing (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  valor_matricula_centavos integer not null default 0 check (valor_matricula_centavos >= 0),
  valor_parcela_centavos integer not null default 0 check (valor_parcela_centavos >= 0),
  numero_parcelas integer not null default 12 check (numero_parcelas between 1 and 12),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (course_id)
);

alter table course_pricing enable row level security;

-- Mesmo padrão de courses/course_editions: leitura liberada pra curso
-- publicado (a tela pública de inscrição também pode precisar mostrar
-- valor no futuro), escrita só pra staff.
create policy course_pricing_select_published on course_pricing
  for select
  using (
    exists (
      select 1 from courses c
      where c.id = course_pricing.course_id
        and c.status = 'PUBLISHED'::course_status
    )
  );

create policy course_pricing_write_staff on course_pricing
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
    )
  );

-- Seed com os valores informados: Curso Básico (R$25 matrícula + 12x R$65)
-- e Curso Médio (sem matrícula separada, 12x R$80).
insert into course_pricing (course_id, valor_matricula_centavos, valor_parcela_centavos, numero_parcelas)
select id, 2500, 6500, 12 from courses where title = 'Curso Teológico Básico'
on conflict (course_id) do nothing;

insert into course_pricing (course_id, valor_matricula_centavos, valor_parcela_centavos, numero_parcelas)
select id, 0, 8000, 12 from courses where title = 'Curso Teológico Médio'
on conflict (course_id) do nothing;
