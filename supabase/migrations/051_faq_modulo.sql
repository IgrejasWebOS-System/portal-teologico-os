-- 051_faq_modulo.sql
-- Módulo de FAQ (perguntas frequentes) com widget flutuante global.
-- Categorias representam qualquer escopo do projeto (módulo, curso,
-- departamento, reciclagem etc.) — o admin decide a granularidade ao
-- cadastrar. Busca por texto simples (sem IA) via full-text search
-- nativo do Postgres, em português.

create table if not exists faq_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists faq_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references faq_categories(id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  search_vector tsvector generated always as (
    to_tsvector('portuguese', coalesce(pergunta, '') || ' ' || coalesce(resposta, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_items_search_idx on faq_items using gin(search_vector);
create index if not exists faq_items_category_idx on faq_items(category_id);

alter table faq_categories enable row level security;
alter table faq_items enable row level security;

-- Leitura pública (widget aparece em páginas públicas também)
create policy faq_categories_select_public on faq_categories
  for select
  using (true);

create policy faq_items_select_public on faq_items
  for select
  using (true);

-- Escrita restrita a staff (usa a função SECURITY DEFINER já criada
-- na migration 050 pra evitar recursão de RLS em profiles)
create policy faq_categories_write_staff on faq_categories
  for all
  using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));

create policy faq_items_write_staff on faq_items
  for all
  using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));

-- Categorias iniciais cobrindo os módulos reais do portal
insert into faq_categories (nome, slug, ordem) values
  ('Geral', 'geral', 0),
  ('Matrícula e Inscrição', 'matricula', 1),
  ('Escola de Teologia', 'escola', 2),
  ('Cursos e Preparatórios', 'cursos', 3),
  ('EBD', 'ebd', 4),
  ('Financeiro', 'financeiro', 5),
  ('Secretaria', 'secretaria', 6),
  ('Loja', 'loja', 7),
  ('Certificados', 'certificados', 8)
on conflict (slug) do nothing;
