-- 119_materiais_didaticos_estoque.sql
-- Estoque de material didático (29/09/2026, pedido do Joaquim) — dashboard
-- financeiro/gerencial ganhou um módulo de estoque igual ao relatório em
-- planilha que ele já usa (POSIÇÃO FINANCEIRA E GERENCIAMENTO DE ESTOQUE):
-- por material (ex.: Escatologia, Liderança Cristã), acompanhar "Atual"
-- (quantidade em estoque), "Alunos" (quantos precisam) e "Imprimir"
-- (déficit). "Alunos" e "Imprimir" são calculados na hora (não guardados
-- aqui) a partir de ead_matriculas — só "estoque_atual" é dado persistido.
--
-- Decisão do Joaquim: desconto AUTOMÁTICO — toda vez que uma nova
-- matrícula é criada num curso vinculado a um material, o estoque desse
-- material desconta sozinho (trigger abaixo). Pode ficar negativo de
-- propósito (sinaliza "precisa imprimir mais", igual à coluna do PDF).

create table if not exists materiais_didaticos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- 'LIVRO' ou 'PROVA' (mesma distinção do PDF de referência — cada curso
  -- pode ter os dois como itens de estoque separados).
  tipo text not null check (tipo = any (array['LIVRO', 'PROVA'])),
  -- Vínculo com o curso que consome esse material a cada matrícula. Nulo
  -- = material cadastrado mas sem desconto automático (controle manual).
  curso_id uuid references courses(id) on delete set null,
  estoque_atual integer not null default 0,
  estoque_minimo integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materiais_didaticos_curso on materiais_didaticos(curso_id);

alter table materiais_didaticos enable row level security;

create policy materiais_didaticos_staff_all
  on materiais_didaticos
  for all
  using (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']));

-- Desconto automático: uma nova matrícula desconta 1 unidade de CADA
-- material (livro e prova, se ambos existirem) vinculado ao curso.
create or replace function public.descontar_estoque_materiais()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update materiais_didaticos
  set estoque_atual = estoque_atual - 1,
      updated_at = now()
  where curso_id = new.course_id;
  return new;
end;
$$;

drop trigger if exists trg_descontar_estoque_materiais on ead_matriculas;
create trigger trg_descontar_estoque_materiais
  after insert on ead_matriculas
  for each row
  execute function public.descontar_estoque_materiais();

comment on table materiais_didaticos is
  'Estoque de apostilas/provas por curso (dashboard gerencial, 29/09/2026). estoque_atual desconta sozinho a cada nova ead_matriculas via trigger — pode ficar negativo (sinaliza déficit de impressão).';
