-- 122_calendario_aulas_e_pedidos_material.sql
-- Redesenho do fluxo de material didático (29/09/2026, pedido do Joaquim
-- depois de ver a migration 119 rodando) — o modelo anterior (1 material
-- por CURSO, descontado automaticamente a cada matrícula) não bate com o
-- processo real da gráfica:
--
--   * cada curso tem uma sequência de aulas, e cada AULA (não o curso
--     inteiro) tem seu próprio livro/material (ex.: aula 1 → "Anjos, Homens
--     e Pecado", aula 2 → "Bibliologia"...);
--   * o material da próxima aula só é encomendado perto do fim da aula
--     atual (10 dias corridos antes do fim da aula atual), depois de
--     conferir quantos alunos daquela turma ainda estão em andamento;
--   * a quantidade do pedido é digitada manualmente pela secretaria/
--     professor (sem regra fixa de margem — a contagem automática é só
--     referência, sempre compram com sobra);
--   * existe visão por turma (professor) e visão consolidada global
--     (secretaria), pra fechar um pedido só com a gráfica.
--
-- Isso exige um dado que HOJE NÃO EXISTE: uma data de início/fim por AULA
-- dentro de cada TURMA (course_editions só tem data_inicio/data_fim do
-- curso inteiro). Com 6.800+ turmas já criadas e nenhum ritmo real
-- registrado, o Joaquim pediu geração automática (dividir o período da
-- turma em partes iguais pelo nº de aulas do curso), mas com edição manual
-- liberada depois — daí a tabela course_edition_lesson_schedule ser uma
-- tabela de verdade (editável linha a linha), não uma view calculada.
--
-- O que este arquivo faz:
--   1. cria course_edition_lesson_schedule (calendário aula-a-turma);
--   2. cria função gerar_calendario_aulas_turma() que preenche esse
--      calendário automaticamente por divisão igual do período;
--   3. reaproveita materiais_didaticos, mas por AULA em vez de por curso
--      (adiciona lesson_id) e REMOVE o desconto automático da migration
--      119 (trigger trg_descontar_estoque_materiais / função
--      descontar_estoque_materiais) — o consumo de estoque agora acontece
--      via pedidos_material.status = 'RECEBIDO', não mais no INSERT de
--      ead_matriculas;
--   4. cria pedidos_material (pedido de remessa por turma+aula, visão
--      professor e visão consolidada da secretaria).

-- ---------------------------------------------------------------------
-- 1) Calendário de aulas por turma
-- ---------------------------------------------------------------------
create table if not exists course_edition_lesson_schedule (
  id uuid primary key default gen_random_uuid(),
  course_edition_id uuid not null references course_editions(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  ordem integer not null,
  data_inicio date,
  data_fim date,
  gerado_automaticamente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_edition_id, lesson_id)
);

create index if not exists idx_cels_course_edition on course_edition_lesson_schedule(course_edition_id);
create index if not exists idx_cels_data_fim on course_edition_lesson_schedule(data_fim);

alter table course_edition_lesson_schedule enable row level security;

-- Professor gerencia o calendário só das turmas onde leciona (mesmo
-- padrão de posse de nucleo_despesas/professor_turmas).
create policy cels_professor_all
  on course_edition_lesson_schedule
  for all
  using (
    exists (
      select 1 from professor_turmas pt
      join professores p on p.id = pt.professor_id
      where pt.course_edition_id = course_edition_lesson_schedule.course_edition_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from professor_turmas pt
      join professores p on p.id = pt.professor_id
      where pt.course_edition_id = course_edition_lesson_schedule.course_edition_id
        and p.user_id = (select auth.uid())
    )
  );

create policy cels_staff_all
  on course_edition_lesson_schedule
  for all
  using (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']));

-- Gera (ou completa) o calendário de uma turma dividindo o período da
-- turma (course_editions.data_inicio → data_fim) em partes iguais pelo
-- número de aulas do curso. Só toca linhas que ainda não foram editadas
-- manualmente (gerado_automaticamente = true) ou que ainda não existem —
-- rodar de novo não sobrescreve um ajuste manual feito pelo professor,
-- a menos que p_forcar seja true.
create or replace function public.gerar_calendario_aulas_turma(
  p_course_edition_id uuid,
  p_forcar boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edition record;
  v_total_aulas integer;
  v_total_dias integer;
  v_dias_por_aula numeric;
  v_lesson record;
  v_idx integer := 0;
  v_data_inicio date;
  v_data_fim date;
begin
  select * into v_edition from course_editions where id = p_course_edition_id;
  if not found or v_edition.data_inicio is null or v_edition.data_fim is null then
    return;
  end if;

  select count(*) into v_total_aulas from lessons where course_id = v_edition.course_id;
  if v_total_aulas = 0 then
    return;
  end if;

  v_total_dias := greatest(1, (v_edition.data_fim - v_edition.data_inicio));
  v_dias_por_aula := v_total_dias::numeric / v_total_aulas;

  for v_lesson in
    select id from lessons where course_id = v_edition.course_id order by order_index, id
  loop
    v_data_inicio := v_edition.data_inicio + floor(v_idx * v_dias_por_aula)::integer;
    v_data_fim := v_edition.data_inicio + floor((v_idx + 1) * v_dias_por_aula)::integer - 1;
    if v_data_fim < v_data_inicio then
      v_data_fim := v_data_inicio;
    end if;

    insert into course_edition_lesson_schedule (course_edition_id, lesson_id, ordem, data_inicio, data_fim, gerado_automaticamente)
    values (p_course_edition_id, v_lesson.id, v_idx + 1, v_data_inicio, v_data_fim, true)
    on conflict (course_edition_id, lesson_id) do update
      set ordem = excluded.ordem,
          data_inicio = case when p_forcar or course_edition_lesson_schedule.gerado_automaticamente then excluded.data_inicio else course_edition_lesson_schedule.data_inicio end,
          data_fim = case when p_forcar or course_edition_lesson_schedule.gerado_automaticamente then excluded.data_fim else course_edition_lesson_schedule.data_fim end,
          updated_at = now();

    v_idx := v_idx + 1;
  end loop;
end;
$$;

comment on function public.gerar_calendario_aulas_turma is
  'Preenche/recalcula course_edition_lesson_schedule dividindo o período da turma em partes iguais pelo nº de aulas do curso. p_forcar=true sobrescreve também linhas já editadas manualmente.';

-- ---------------------------------------------------------------------
-- 2) materiais_didaticos: de "por curso" pra "por aula"
-- ---------------------------------------------------------------------
drop trigger if exists trg_descontar_estoque_materiais on ead_matriculas;
drop function if exists public.descontar_estoque_materiais();

alter table materiais_didaticos
  add column if not exists lesson_id uuid references lessons(id) on delete set null;

create index if not exists idx_materiais_didaticos_lesson on materiais_didaticos(lesson_id);

comment on table materiais_didaticos is
  'Estoque de apostilas/provas por AULA (não mais por curso — migration 122). estoque_atual agora só muda por ação manual (entrada ao receber da gráfica) ou quando um pedidos_material é marcado RECEBIDO; não há mais desconto automático no INSERT de ead_matriculas.';
comment on column materiais_didaticos.curso_id is
  'Mantido só como referência/agrupamento de relatório (qual curso a aula pertence) — o vínculo operacional real passou a ser lesson_id (migration 122).';

-- ---------------------------------------------------------------------
-- 3) Pedidos de remessa (professor por turma + consolidado da secretaria)
-- ---------------------------------------------------------------------
create table if not exists pedidos_material (
  id uuid primary key default gen_random_uuid(),
  course_edition_id uuid not null references course_editions(id) on delete cascade,
  -- Aula-alvo do pedido: normalmente a PRÓXIMA aula da turma (a que ainda
  -- não tem material entregue), não a aula que está terminando agora.
  lesson_id uuid not null references lessons(id) on delete cascade,
  material_id uuid references materiais_didaticos(id) on delete set null,
  -- Contagem automática de ead_matriculas em EM_ANDAMENTO no momento em
  -- que o pedido foi criado — referência pra secretaria/professor, não
  -- trava nem define a quantidade pedida.
  alunos_em_andamento_snapshot integer not null default 0,
  quantidade_solicitada integer not null check (quantidade_solicitada > 0),
  status text not null default 'SOLICITADO'
    check (status = any (array['SOLICITADO', 'ENVIADO_GRAFICA', 'RECEBIDO', 'CANCELADO'])),
  solicitado_por_professor_id uuid references professores(id) on delete set null,
  solicitado_por_user_id uuid references auth.users(id) on delete set null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pedidos_material_course_edition on pedidos_material(course_edition_id);
create index if not exists idx_pedidos_material_lesson on pedidos_material(lesson_id);
create index if not exists idx_pedidos_material_status on pedidos_material(status);

alter table pedidos_material enable row level security;

create policy pedidos_material_professor_all
  on pedidos_material
  for all
  using (
    exists (
      select 1 from professor_turmas pt
      join professores p on p.id = pt.professor_id
      where pt.course_edition_id = pedidos_material.course_edition_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from professor_turmas pt
      join professores p on p.id = pt.professor_id
      where pt.course_edition_id = pedidos_material.course_edition_id
        and p.user_id = (select auth.uid())
    )
  );

create policy pedidos_material_staff_all
  on pedidos_material
  for all
  using (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']))
  with check (public.current_system_role() = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN']));

comment on table pedidos_material is
  'Pedido de remessa de material à gráfica, por turma+aula (migration 122). Professor cria/gerencia o pedido da própria turma; secretaria (staff) vê/gerencia todos, consolidando por material pra fechar uma remessa só.';

-- ---------------------------------------------------------------------
-- 4) Backfill: gera o calendário automático pras turmas já existentes
--    que têm data_inicio/data_fim preenchidos.
-- ---------------------------------------------------------------------
do $$
declare
  v_edition record;
begin
  for v_edition in
    select id from course_editions
    where data_inicio is not null and data_fim is not null
  loop
    perform public.gerar_calendario_aulas_turma(v_edition.id, false);
  end loop;
end;
$$;
