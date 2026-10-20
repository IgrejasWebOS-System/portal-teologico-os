-- ============================================================
-- 140_controle_presenca.sql  (17/10/2026, pedido do Joaquim)
-- Controle de presenca (chamada) por turma + bloqueio da PROVA por frequencia.
--
-- DESENHO (decisoes do Joaquim, 17/10/2026):
--   * Frequencia minima para fazer a prova: 75% (configuravel em presenca_config).
--   * Base do calculo: aulas PREVISTAS no calendario da turma
--     (course_edition_lesson_schedule). Se o professor fizer mais chamadas do que
--     as previstas, vale o maior dos dois numeros.
--   * Chamada: o professor marca PRESENTE; ao FECHAR a chamada, quem ficou sem marca
--     vira FALTA. Antes de fechar, ninguem e considerado faltoso.
--   * Correcao depois de fechada: professor ate N dias (padrao 7) COM motivo;
--     depois disso so a secretaria, sempre COM motivo.
--   * So vale para turmas novas: nada de turmas migradas do sistema antigo
--     ("(LEG-...)") nem datas anteriores ao inicio do controle.
--
-- AUDITORIA:
--   * Toda marcacao/alteracao grava uma linha em aula_presencas_historico
--     (somente inclusao: UPDATE/DELETE bloqueados por trigger).
--   * aula_presencas e aula_encontros nao podem ser apagados.
--   * Hora sempre do servidor (nunca do aparelho); sem data futura.
--
-- SEGURANCA (mesmo padrao de auditoria_acoes / avaliacoes):
--   * RLS ligado so com SELECT escopado; NENHUMA policy de escrita. Toda escrita
--     passa pelas funcoes abaixo (SECURITY DEFINER, so service_role executa), chamadas
--     pelas server actions depois de checar a permissao do usuario.
--   * Bloqueio da prova tambem no banco: trigger em avaliacoes (tipo PROVA).
--
-- ROLLOUT SEGURO: presenca_config.bloqueio_prova_ativo nasce FALSE. Primeiro se
-- coleta a presenca; quando a secretaria ativar, a prova passa a exigir a frequencia.
-- Idempotente. Aplicar primeiro no staging.
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Configuracao (linha unica)
-- ---------------------------------------------------------------
create table if not exists public.presenca_config (
  id                            boolean primary key default true check (id),
  frequencia_minima             numeric(5,2) not null default 75.00 check (frequencia_minima between 0 and 100),
  prazo_correcao_professor_dias integer not null default 7 check (prazo_correcao_professor_dias between 0 and 60),
  data_inicio_controle          date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  bloqueio_prova_ativo          boolean not null default false,
  atualizado_em                 timestamptz not null default now(),
  atualizado_por                uuid
);
insert into public.presenca_config (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- 2) Encontros (uma chamada = turma + aula + data)
-- ---------------------------------------------------------------
create table if not exists public.aula_encontros (
  id                uuid primary key default gen_random_uuid(),
  course_edition_id uuid not null references public.course_editions(id) on delete restrict,
  lesson_id         uuid not null references public.lessons(id) on delete restrict,
  data              date not null,
  professor_id      uuid references public.professores(id) on delete set null,
  status            text not null default 'ABERTA' check (status in ('ABERTA','FECHADA')),
  criado_por        uuid,
  criado_em         timestamptz not null default now(),
  fechada_em        timestamptz,
  fechada_por       uuid,
  unique (course_edition_id, lesson_id, data)
);
create index if not exists aula_encontros_edition_idx on public.aula_encontros (course_edition_id, data);

-- ---------------------------------------------------------------
-- 3) Presencas (uma linha por aluno/matricula em cada encontro)
-- ---------------------------------------------------------------
create table if not exists public.aula_presencas (
  id               uuid primary key default gen_random_uuid(),
  encontro_id      uuid not null references public.aula_encontros(id) on delete restrict,
  matricula_id     uuid not null references public.ead_matriculas(id) on delete restrict,
  situacao         text not null check (situacao in ('PRESENTE','FALTA','JUSTIFICADA')),
  marcado_por      uuid,
  papel_marcador   text,
  motivo_alteracao text,
  marcado_em       timestamptz not null default now(),
  unique (encontro_id, matricula_id)
);
create index if not exists aula_presencas_matricula_idx on public.aula_presencas (matricula_id);

-- Historico (somente inclusao). Sem FK de proposito: sobrevive a qualquer exclusao.
create table if not exists public.aula_presencas_historico (
  id                uuid primary key default gen_random_uuid(),
  presenca_id       uuid,
  encontro_id       uuid,
  matricula_id      uuid,
  situacao_anterior text,
  situacao_nova     text not null,
  ator_user_id      uuid,
  papel             text,
  motivo            text,
  registrado_em     timestamptz not null default now()
);
create index if not exists aula_presencas_hist_encontro_idx on public.aula_presencas_historico (encontro_id, registrado_em desc);
create index if not exists aula_presencas_hist_matricula_idx on public.aula_presencas_historico (matricula_id, registrado_em desc);

-- Liberacao excepcional da prova pela secretaria (com justificativa)
create table if not exists public.presenca_liberacoes (
  id              uuid primary key default gen_random_uuid(),
  matricula_id    uuid not null unique,
  motivo          text not null check (length(btrim(motivo)) >= 5),
  liberado_por    uuid,
  papel           text,
  criado_em       timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 4) Triggers de integridade e auditoria
-- ---------------------------------------------------------------
create or replace function public.trg_aula_presenca_historico() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  if TG_OP = 'INSERT' then
    insert into public.aula_presencas_historico
      (presenca_id, encontro_id, matricula_id, situacao_anterior, situacao_nova, ator_user_id, papel, motivo)
    values (NEW.id, NEW.encontro_id, NEW.matricula_id, null, NEW.situacao, NEW.marcado_por, NEW.papel_marcador, NEW.motivo_alteracao);
  elsif TG_OP = 'UPDATE' and NEW.situacao is distinct from OLD.situacao then
    insert into public.aula_presencas_historico
      (presenca_id, encontro_id, matricula_id, situacao_anterior, situacao_nova, ator_user_id, papel, motivo)
    values (NEW.id, NEW.encontro_id, NEW.matricula_id, OLD.situacao, NEW.situacao, NEW.marcado_por, NEW.papel_marcador, NEW.motivo_alteracao);
  end if;
  return NEW;
end
$fn$;
drop trigger if exists trg_aula_presenca_historico on public.aula_presencas;
create trigger trg_aula_presenca_historico
  after insert or update on public.aula_presencas
  for each row execute function public.trg_aula_presenca_historico();

create or replace function public.trg_presenca_imutavel() returns trigger
language plpgsql set search_path = public, pg_temp as $fn$
begin
  raise exception 'Registro de presenca nao pode ser apagado nem ter o historico alterado (%).', TG_TABLE_NAME;
end
$fn$;
drop trigger if exists trg_aula_presencas_sem_delete on public.aula_presencas;
create trigger trg_aula_presencas_sem_delete before delete on public.aula_presencas
  for each row execute function public.trg_presenca_imutavel();
drop trigger if exists trg_aula_encontros_sem_delete on public.aula_encontros;
create trigger trg_aula_encontros_sem_delete before delete on public.aula_encontros
  for each row execute function public.trg_presenca_imutavel();
drop trigger if exists trg_aula_hist_imutavel on public.aula_presencas_historico;
create trigger trg_aula_hist_imutavel before update or delete on public.aula_presencas_historico
  for each row execute function public.trg_presenca_imutavel();

create or replace function public.trg_aula_encontro_integridade() returns trigger
language plpgsql set search_path = public, pg_temp as $fn$
begin
  if NEW.course_edition_id is distinct from OLD.course_edition_id
     or NEW.lesson_id is distinct from OLD.lesson_id
     or NEW.data is distinct from OLD.data then
    raise exception 'Turma, aula e data de um encontro nao podem ser alteradas.';
  end if;
  if OLD.status = 'FECHADA' and NEW.status <> 'FECHADA' then
    raise exception 'Chamada fechada nao pode ser reaberta.';
  end if;
  return NEW;
end
$fn$;
drop trigger if exists trg_aula_encontro_integridade on public.aula_encontros;
create trigger trg_aula_encontro_integridade before update on public.aula_encontros
  for each row execute function public.trg_aula_encontro_integridade();

-- ---------------------------------------------------------------
-- 5) Funcoes de escrita (so service_role)
-- ---------------------------------------------------------------
create or replace function public.presenca_abrir_encontro(
  p_edition uuid, p_lesson uuid, p_data date, p_ator uuid, p_professor uuid, p_papel text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  cfg public.presenca_config;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_id uuid;
begin
  select * into cfg from public.presenca_config where id;
  if p_data > v_hoje then
    raise exception 'Nao e permitido registrar chamada em data futura.';
  end if;
  if p_data < cfg.data_inicio_controle then
    raise exception 'Data anterior ao inicio do controle de presenca (%).', to_char(cfg.data_inicio_controle, 'DD/MM/YYYY');
  end if;
  if p_papel = 'PROFESSOR' and p_data < v_hoje - cfg.prazo_correcao_professor_dias then
    raise exception 'O professor so pode registrar chamadas dos ultimos % dias. Fale com a secretaria.', cfg.prazo_correcao_professor_dias;
  end if;
  if not exists (
    select 1 from public.course_editions ce join public.lessons l on l.course_id = ce.course_id
    where ce.id = p_edition and l.id = p_lesson
  ) then
    raise exception 'A aula informada nao pertence ao curso desta turma.';
  end if;
  if exists (select 1 from public.course_editions where id = p_edition and nome like '%(LEG-%') then
    raise exception 'Turma migrada do sistema antigo: nao tem controle de presenca.';
  end if;

  insert into public.aula_encontros (course_edition_id, lesson_id, data, professor_id, criado_por)
  values (p_edition, p_lesson, p_data, p_professor, p_ator)
  on conflict (course_edition_id, lesson_id, data) do nothing;

  select id into v_id from public.aula_encontros
   where course_edition_id = p_edition and lesson_id = p_lesson and data = p_data;
  return v_id;
end
$fn$;

create or replace function public.presenca_marcar(
  p_encontro uuid, p_matricula uuid, p_situacao text, p_ator uuid, p_papel text, p_motivo text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  cfg public.presenca_config;
  e public.aula_encontros;
  m public.ead_matriculas;
  v_existe boolean;
begin
  if p_situacao not in ('PRESENTE','FALTA','JUSTIFICADA') then
    raise exception 'Situacao invalida.';
  end if;
  if p_papel not in ('PROFESSOR','SECRETARIA') then
    raise exception 'Papel invalido.';
  end if;
  if p_situacao = 'JUSTIFICADA' and p_papel <> 'SECRETARIA' then
    raise exception 'Somente a secretaria pode registrar falta justificada.';
  end if;

  select * into cfg from public.presenca_config where id;
  select * into e from public.aula_encontros where id = p_encontro for update;
  if not found then raise exception 'Encontro nao encontrado.'; end if;
  select * into m from public.ead_matriculas where id = p_matricula;
  if not found or m.course_edition_id is distinct from e.course_edition_id then
    raise exception 'Esta matricula nao pertence a turma do encontro.';
  end if;
  select exists (select 1 from public.aula_presencas where encontro_id = p_encontro and matricula_id = p_matricula) into v_existe;

  if e.status = 'ABERTA' then
    if not v_existe and m.status <> 'EM_ANDAMENTO' then
      raise exception 'Somente alunos com matricula em andamento entram na chamada.';
    end if;
  else
    -- chamada fechada: correcao exige motivo; professor so dentro do prazo
    if p_motivo is null or length(btrim(p_motivo)) < 5 then
      raise exception 'Informe o motivo da correcao (minimo 5 caracteres).';
    end if;
    if p_papel = 'PROFESSOR' and now() > e.fechada_em + make_interval(days => cfg.prazo_correcao_professor_dias) then
      raise exception 'Prazo de correcao do professor encerrado (% dias). Fale com a secretaria.', cfg.prazo_correcao_professor_dias;
    end if;
  end if;

  insert into public.aula_presencas (encontro_id, matricula_id, situacao, marcado_por, papel_marcador, motivo_alteracao)
  values (p_encontro, p_matricula, p_situacao, p_ator, p_papel, nullif(btrim(coalesce(p_motivo,'')), ''))
  on conflict (encontro_id, matricula_id) do update
    set situacao = excluded.situacao,
        marcado_por = excluded.marcado_por,
        papel_marcador = excluded.papel_marcador,
        motivo_alteracao = excluded.motivo_alteracao,
        marcado_em = now();
end
$fn$;

create or replace function public.presenca_fechar_chamada(p_encontro uuid, p_ator uuid, p_papel text)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  e public.aula_encontros;
  v_faltas integer;
begin
  select * into e from public.aula_encontros where id = p_encontro for update;
  if not found then raise exception 'Encontro nao encontrado.'; end if;
  if e.status = 'FECHADA' then raise exception 'Esta chamada ja foi fechada.'; end if;

  with ins as (
    insert into public.aula_presencas (encontro_id, matricula_id, situacao, marcado_por, papel_marcador, motivo_alteracao)
    select p_encontro, m.id, 'FALTA', p_ator, p_papel, 'Sem marcacao ao fechar a chamada'
      from public.ead_matriculas m
     where m.course_edition_id = e.course_edition_id
       and m.status = 'EM_ANDAMENTO'
       and not exists (select 1 from public.aula_presencas p where p.encontro_id = p_encontro and p.matricula_id = m.id)
    returning 1
  )
  select count(*) into v_faltas from ins;

  update public.aula_encontros
     set status = 'FECHADA', fechada_em = now(), fechada_por = p_ator
   where id = p_encontro;
  return v_faltas;
end
$fn$;

create or replace function public.presenca_liberar_prova(p_matricula uuid, p_ator uuid, p_papel text, p_motivo text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  if p_papel not in ('SECRETARIA','ADMIN_GLOBAL') then
    raise exception 'Somente a secretaria pode liberar a prova.';
  end if;
  if p_motivo is null or length(btrim(p_motivo)) < 5 then
    raise exception 'Informe a justificativa da liberacao (minimo 5 caracteres).';
  end if;
  insert into public.presenca_liberacoes (matricula_id, motivo, liberado_por, papel)
  values (p_matricula, btrim(p_motivo), p_ator, p_papel)
  on conflict (matricula_id) do update
    set motivo = excluded.motivo, liberado_por = excluded.liberado_por, papel = excluded.papel, criado_em = now();
end
$fn$;

-- ---------------------------------------------------------------
-- 6) Frequencia da matricula e regra da prova
-- ---------------------------------------------------------------
create or replace function public.presenca_frequencia_matricula(p_matricula uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare
  cfg public.presenca_config;
  m public.ead_matriculas;
  ce public.course_editions;
  v_previstas integer; v_fechados integer; v_presentes integer; v_base integer;
  v_freq numeric; v_lib boolean; v_liberacao boolean;
begin
  select * into cfg from public.presenca_config where id;
  select * into m from public.ead_matriculas where id = p_matricula;
  if not found then
    return jsonb_build_object('aplicavel', false, 'liberada', true, 'motivo', 'MATRICULA_NAO_ENCONTRADA');
  end if;
  select * into ce from public.course_editions where id = m.course_edition_id;
  if m.course_edition_id is null or not found
     or ce.nome like '%(LEG-%'
     or ce.ano < extract(year from cfg.data_inicio_controle)::int then
    return jsonb_build_object('aplicavel', false, 'liberada', true, 'motivo', 'NAO_APLICAVEL',
                              'minima', cfg.frequencia_minima, 'bloqueio_ativo', cfg.bloqueio_prova_ativo);
  end if;

  select count(*) into v_previstas
    from public.course_edition_lesson_schedule s
   where s.course_edition_id = m.course_edition_id
     and coalesce(s.data_fim, s.data_inicio, cfg.data_inicio_controle) >= cfg.data_inicio_controle;

  select count(*) into v_fechados
    from public.aula_encontros e
   where e.course_edition_id = m.course_edition_id and e.status = 'FECHADA' and e.data >= cfg.data_inicio_controle;

  select count(*) into v_presentes
    from public.aula_presencas p join public.aula_encontros e on e.id = p.encontro_id
   where p.matricula_id = p_matricula and e.status = 'FECHADA' and e.data >= cfg.data_inicio_controle
     and p.situacao in ('PRESENTE','JUSTIFICADA');

  v_base := greatest(v_previstas, v_fechados);
  v_liberacao := exists (select 1 from public.presenca_liberacoes where matricula_id = p_matricula);

  if v_base = 0 then
    return jsonb_build_object('aplicavel', true, 'previstas', 0, 'encontros_fechados', 0, 'presentes', 0, 'base', 0,
                              'frequencia', null, 'minima', cfg.frequencia_minima, 'bloqueio_ativo', cfg.bloqueio_prova_ativo,
                              'liberacao_secretaria', v_liberacao, 'liberada', true, 'motivo', 'SEM_AULAS_NO_PERIODO');
  end if;

  v_freq := round(v_presentes::numeric * 100 / v_base, 2);
  v_lib := (not cfg.bloqueio_prova_ativo) or v_liberacao or v_freq >= cfg.frequencia_minima;

  return jsonb_build_object('aplicavel', true, 'previstas', v_previstas, 'encontros_fechados', v_fechados,
                            'presentes', v_presentes, 'base', v_base, 'frequencia', v_freq,
                            'minima', cfg.frequencia_minima, 'bloqueio_ativo', cfg.bloqueio_prova_ativo,
                            'liberacao_secretaria', v_liberacao, 'liberada', v_lib,
                            'motivo', case when v_lib then 'OK' else 'FREQUENCIA_INSUFICIENTE' end);
end
$fn$;

-- Bloqueio no banco: nao existe PROVA sem frequencia (quando o bloqueio esta ativo)
create or replace function public.trg_avaliacoes_prova_exige_frequencia() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare r jsonb;
begin
  if NEW.tipo = 'PROVA' then
    r := public.presenca_frequencia_matricula(NEW.matricula_id);
    if not coalesce((r->>'liberada')::boolean, true) then
      raise exception 'PROVA_BLOQUEADA_FREQUENCIA: frequencia % %% (minimo % %%).', r->>'frequencia', r->>'minima';
    end if;
  end if;
  return NEW;
end
$fn$;
drop trigger if exists trg_avaliacoes_prova_frequencia on public.avaliacoes;
create trigger trg_avaliacoes_prova_frequencia before insert on public.avaliacoes
  for each row execute function public.trg_avaliacoes_prova_exige_frequencia();

-- ---------------------------------------------------------------
-- 7) Permissoes: so service_role executa as funcoes
-- ---------------------------------------------------------------
revoke all on function public.presenca_abrir_encontro(uuid, uuid, date, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.presenca_fechar_chamada(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.presenca_liberar_prova(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.presenca_frequencia_matricula(uuid) from public, anon, authenticated;
grant execute on function public.presenca_abrir_encontro(uuid, uuid, date, uuid, uuid, text) to service_role;
grant execute on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.presenca_fechar_chamada(uuid, uuid, text) to service_role;
grant execute on function public.presenca_liberar_prova(uuid, uuid, text, text) to service_role;
grant execute on function public.presenca_frequencia_matricula(uuid) to service_role;

-- ---------------------------------------------------------------
-- 8) RLS: so leitura escopada (escrita so via funcoes acima)
-- ---------------------------------------------------------------
alter table public.presenca_config           enable row level security;
alter table public.aula_encontros            enable row level security;
alter table public.aula_presencas            enable row level security;
alter table public.aula_presencas_historico  enable row level security;
alter table public.presenca_liberacoes       enable row level security;

revoke insert, update, delete, truncate on
  public.presenca_config, public.aula_encontros, public.aula_presencas,
  public.aula_presencas_historico, public.presenca_liberacoes from anon, authenticated;
revoke all on public.aula_presencas_historico, public.presenca_liberacoes from anon;
revoke all on public.aula_encontros, public.aula_presencas, public.presenca_config from anon;

create or replace function public.presenca_pode_ver_turma(p_edition uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $fn$
  select
    exists (
      select 1 from public.professor_turmas pt
      join public.professores p on p.id = pt.professor_id
      where pt.course_edition_id = p_edition and p.user_id = (select auth.uid())
    )
    or is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.course_editions ce
      where ce.id = p_edition and ce.unit_id in (select unit_id from get_accessible_unit_ids())
    )
$fn$;

create or replace function public.presenca_pode_ver_matricula(p_matricula uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.ead_matriculas m
    join public.ead_alunos al on al.id = m.aluno_id
    where m.id = p_matricula and al.user_id = (select auth.uid())
  )
$fn$;

drop policy if exists presenca_config_select on public.presenca_config;
create policy presenca_config_select on public.presenca_config
  for select to authenticated using (true);

drop policy if exists aula_encontros_select on public.aula_encontros;
create policy aula_encontros_select on public.aula_encontros
  for select to authenticated
  using (
    public.presenca_pode_ver_turma(course_edition_id)
    or exists (
      select 1 from public.ead_matriculas m
      join public.ead_alunos al on al.id = m.aluno_id
      where m.course_edition_id = aula_encontros.course_edition_id and al.user_id = (select auth.uid())
    )
  );

drop policy if exists aula_presencas_select on public.aula_presencas;
create policy aula_presencas_select on public.aula_presencas
  for select to authenticated
  using (
    public.presenca_pode_ver_matricula(matricula_id)
    or exists (
      select 1 from public.aula_encontros e
      where e.id = aula_presencas.encontro_id and public.presenca_pode_ver_turma(e.course_edition_id)
    )
  );

drop policy if exists aula_presencas_hist_select on public.aula_presencas_historico;
create policy aula_presencas_hist_select on public.aula_presencas_historico
  for select to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.aula_encontros e
      join public.course_editions ce on ce.id = e.course_edition_id
      where e.id = aula_presencas_historico.encontro_id
        and ce.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );

drop policy if exists presenca_liberacoes_select on public.presenca_liberacoes;
create policy presenca_liberacoes_select on public.presenca_liberacoes
  for select to authenticated
  using (
    is_super_master()
    or current_system_role() = 'GLOBAL_ADMIN'
    or exists (
      select 1 from public.ead_matriculas m
      join public.course_editions ce on ce.id = m.course_edition_id
      where m.id = presenca_liberacoes.matricula_id
        and ce.unit_id in (select unit_id from get_accessible_unit_ids())
    )
  );

comment on table public.aula_encontros is 'Chamada: turma + aula + data. Fechar a chamada transforma quem nao foi marcado em FALTA.';
comment on table public.aula_presencas is 'Presenca por matricula em cada encontro. Escrita so via funcoes presenca_* (service_role).';
comment on table public.aula_presencas_historico is 'Historico somente-inclusao de toda marcacao/alteracao de presenca.';
