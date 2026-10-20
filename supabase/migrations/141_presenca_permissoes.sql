-- ============================================================
-- 141_presenca_permissoes.sql  (17/10/2026, pedido do Joaquim)
-- Na fase de implantacao, professor, secretario de setor/nucleo e secretaria geral
-- tem as MESMAS permissoes no controle de presenca. So a secretaria geral muda as
-- diretrizes. A matriz fica em presenca_config.permissoes, para restringir por perfil
-- depois, sem alterar codigo.
--   perfis: PROFESSOR | SECRETARIA (secretario de setor/nucleo e secretaria geral)
--   acoes : corrigir_fora_prazo, justificar, liberar_prova
-- Idempotente. Aplicar primeiro no staging.
-- ============================================================

alter table public.presenca_config
  add column if not exists permissoes jsonb not null default
  '{"PROFESSOR":{"corrigir_fora_prazo":true,"justificar":true,"liberar_prova":true},"SECRETARIA":{"corrigir_fora_prazo":true,"justificar":true,"liberar_prova":true}}'::jsonb;

create or replace function public.presenca_permite(p_papel text, p_acao text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $fn$
  select coalesce(
    (select (permissoes -> (case when p_papel = 'PROFESSOR' then 'PROFESSOR' else 'SECRETARIA' end) ->> p_acao)::boolean
       from public.presenca_config where id),
    false)
$fn$;

create or replace function public.presenca_atualizar_config(
  p_minima numeric, p_prazo integer, p_bloqueio boolean, p_permissoes jsonb, p_ator uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  update public.presenca_config
     set frequencia_minima = p_minima,
         prazo_correcao_professor_dias = p_prazo,
         bloqueio_prova_ativo = p_bloqueio,
         permissoes = p_permissoes,
         atualizado_em = now(),
         atualizado_por = p_ator
   where id;
end
$fn$;

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
  if p_papel = 'PROFESSOR' and not public.presenca_permite(p_papel, 'corrigir_fora_prazo')
     and p_data < v_hoje - cfg.prazo_correcao_professor_dias then
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
  if p_situacao = 'JUSTIFICADA' and not public.presenca_permite(p_papel, 'justificar') then
    raise exception 'Este perfil nao pode registrar falta justificada.';
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
    if p_motivo is null or length(btrim(p_motivo)) < 5 then
      raise exception 'Informe o motivo da correcao (minimo 5 caracteres).';
    end if;
    if p_papel = 'PROFESSOR' and not public.presenca_permite(p_papel, 'corrigir_fora_prazo')
       and now() > e.fechada_em + make_interval(days => cfg.prazo_correcao_professor_dias) then
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

create or replace function public.presenca_liberar_prova(p_matricula uuid, p_ator uuid, p_papel text, p_motivo text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  if p_papel not in ('PROFESSOR','SECRETARIA','ADMIN_GLOBAL') or not public.presenca_permite(p_papel, 'liberar_prova') then
    raise exception 'Este perfil nao pode liberar a prova.';
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

revoke all on function public.presenca_permite(text, text) from public, anon, authenticated;
revoke all on function public.presenca_atualizar_config(numeric, integer, boolean, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.presenca_permite(text, text) to service_role;
grant execute on function public.presenca_atualizar_config(numeric, integer, boolean, jsonb, uuid) to service_role;
revoke all on function public.presenca_abrir_encontro(uuid, uuid, date, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.presenca_liberar_prova(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.presenca_abrir_encontro(uuid, uuid, date, uuid, uuid, text) to service_role;
grant execute on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.presenca_liberar_prova(uuid, uuid, text, text) to service_role;
