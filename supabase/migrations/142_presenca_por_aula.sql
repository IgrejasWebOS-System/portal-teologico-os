-- ============================================================
-- 142_presenca_por_aula.sql  (20/10/2026, pedido do Joaquim)
-- A presenca passa a ser por AULA (materia), nao por calendario da turma:
--   * as aulas sao rotativas e o aluno pode assistir em periodos/turmas diferentes;
--   * a presenca conta POR ALUNO E AULA: se perdeu a aula 03 na turma A e assistiu na
--     turma B, a aula 03 conta como assistida para a matricula dele na turma A;
--   * frequencia = aulas assistidas / (aulas ja aplicadas na turma dele + aulas que ele
--     assistiu em qualquer turma do mesmo curso). Assim ninguem aparece "abaixo do
--     minimo" so porque a turma ainda nao chegou em todas as aulas.
--   * presenca_marcar aceita aluno de OUTRA turma do mesmo curso (visitante).
-- Nao altera tabelas; so substitui duas funcoes. Idempotente. Staging primeiro.
-- ============================================================

create or replace function public.presenca_marcar(
  p_encontro uuid, p_matricula uuid, p_situacao text, p_ator uuid, p_papel text, p_motivo text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  cfg public.presenca_config;
  e public.aula_encontros;
  m public.ead_matriculas;
  v_existe boolean;
  v_mesmo_curso boolean;
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
  if not found then
    raise exception 'Esta matricula nao existe.';
  end if;
  -- da turma do encontro OU de outra turma do mesmo curso (aluno visitante)
  select exists (
    select 1
      from public.course_editions ce_m
      join public.course_editions ce_e on ce_e.course_id = ce_m.course_id
     where ce_m.id = m.course_edition_id and ce_e.id = e.course_edition_id
  ) into v_mesmo_curso;
  if not coalesce(v_mesmo_curso, false) then
    raise exception 'Esta matricula nao pertence ao curso desta aula.';
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

create or replace function public.presenca_frequencia_matricula(p_matricula uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare
  cfg public.presenca_config;
  m public.ead_matriculas;
  ce public.course_editions;
  v_total integer; v_aplicadas integer; v_presentes integer; v_base integer;
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

  select count(*) into v_total from public.lessons where course_id = ce.course_id;

  with aplicadas as (
    select distinct e.lesson_id
      from public.aula_encontros e
     where e.course_edition_id = m.course_edition_id
       and e.status = 'FECHADA' and e.data >= cfg.data_inicio_controle
  ), assistidas as (
    select distinct e.lesson_id
      from public.aula_presencas p
      join public.aula_encontros e on e.id = p.encontro_id
      join public.ead_matriculas pm on pm.id = p.matricula_id
      join public.course_editions pce on pce.id = e.course_edition_id
     where pm.aluno_id = m.aluno_id
       and pce.course_id = ce.course_id
       and e.status = 'FECHADA' and e.data >= cfg.data_inicio_controle
       and p.situacao in ('PRESENTE','JUSTIFICADA')
  )
  select (select count(*) from aplicadas),
         (select count(*) from assistidas),
         (select count(*) from (select lesson_id from aplicadas union select lesson_id from assistidas) u)
    into v_aplicadas, v_presentes, v_base;

  v_liberacao := exists (select 1 from public.presenca_liberacoes where matricula_id = p_matricula);

  if v_base = 0 then
    return jsonb_build_object('aplicavel', true, 'previstas', v_total, 'encontros_fechados', 0, 'presentes', 0, 'base', 0,
                              'frequencia', null, 'minima', cfg.frequencia_minima, 'bloqueio_ativo', cfg.bloqueio_prova_ativo,
                              'liberacao_secretaria', v_liberacao, 'liberada', true, 'motivo', 'SEM_AULAS_NO_PERIODO');
  end if;

  v_freq := round(v_presentes::numeric * 100 / v_base, 2);
  v_lib := (not cfg.bloqueio_prova_ativo) or v_liberacao or v_freq >= cfg.frequencia_minima;

  return jsonb_build_object('aplicavel', true, 'previstas', v_total, 'encontros_fechados', v_aplicadas,
                            'presentes', v_presentes, 'base', v_base, 'frequencia', v_freq,
                            'minima', cfg.frequencia_minima, 'bloqueio_ativo', cfg.bloqueio_prova_ativo,
                            'liberacao_secretaria', v_liberacao, 'liberada', v_lib,
                            'motivo', case when v_lib then 'OK' else 'FREQUENCIA_INSUFICIENTE' end);
end
$fn$;

revoke all on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.presenca_frequencia_matricula(uuid) from public, anon, authenticated;
grant execute on function public.presenca_marcar(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.presenca_frequencia_matricula(uuid) to service_role;
