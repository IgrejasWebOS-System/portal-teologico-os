-- ============================================================
-- legado_migrar_ano.sql - migra UM ano do sistema antigo para as tabelas vivas.
-- NAO e migration (nao entra na pasta migrations): e script de execucao controlada.
--
-- COMO USAR
--   1) Ajuste v_ano e v_commit abaixo.
--   2) v_commit := false  => DRY-RUN: faz tudo e DESFAZ no fim (raise exception com os numeros).
--      v_commit := true   => grava de verdade (atomico: se algo falhar, nada fica).
--   3) Rodar primeiro no STAGING. Em producao: so depois de backup e do "pode" do Joaquim.
--   Pre-requisito: migrations 136 a 139 aplicadas e CSVs carregados nas tabelas legado_*.
--
-- REGRAS (decididas com o Joaquim):
--   * Alunos antigos SEM acesso: nao cria usuario, nao envia convite/e-mail.
--     email vazio -> legado+<matricula>@sem-email.invalid ; status do aluno = INATIVO.
--   * Aluno que ja existe no portal (mesmo CPF, so digitos) NAO e duplicado nem sobrescrito;
--     a matricula antiga e anexada ao cadastro existente.
--   * Numeracao: aluno CETADP-LEG-<5 dig>, matricula CETADP-LEG-<ano>-<6 dig do codigo antigo>.
--   * Status: Concluido(4) -> APROVADO ; Ativo(1) com nota -> APROVADO ; demais -> CANCELADO.
--     Mais de uma APROVADA no mesmo curso (2022-2024): a mais recente fica APROVADA, as
--     anteriores viram CANCELADO ("duplicidade legado"). Se o portal ja tem matricula
--     EM_ANDAMENTO/APROVADA no curso -> CANCELADO ("duplicidade portal").
--   * Somente unidades com situacao MAPEADO em legado_mapa_unidades.
--   * SETOR + IGREJA (17/10/2026): a igreja da turma e resolvida por NOME normalizado
--     (PQ->PARQUE, JD->JARDIM, N->NOVA, sem UF/acentos) dentro do setor mapeado e gravada em
--     legado_mapa_turmas. So linhas com confirmado=true sao usadas (acertos exatos/unicos,
--     inclusive quando a igreja esta em outro setor do portal, entram automaticamente;
--     ambiguos/sem match ficam para revisao e caem no nivel do setor).
--     Alias de grafia: BORGUESI -> BORGHESI.
--     Aluno e turma recebem unit_id (IGREJA), church_id e sector_id (estrutura antiga usada
--     pelas telas de Alunos/Professores).
--   * Notas/frequencia NAO entram nas tabelas vivas (ficam arquivadas em legado_*).
--   * Tudo que e criado e registrado em legado_mig_* (auditoria + reversao).
-- ============================================================

create or replace function pg_temp.legado_date(t text) returns date
language plpgsql as $f$
begin
  if t is null or t !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  return substring(t from 1 for 10)::date;
exception when others then
  return null;
end
$f$;

-- nomes normalizados em conjunto de palavras (sem acento, sem UF, abreviacoes expandidas)
create or replace function pg_temp.nrm(t text) returns text[]
language sql immutable as $f$
  select coalesce(array_agg(distinct x) filter (where x <> ''), '{}')
  from (
    select case w when 'PQ' then 'PARQUE' when 'JD' then 'JARDIM' when 'JDM' then 'JARDIM'
                  when 'N' then 'NOVA' when 'STA' then 'SANTA' when 'STO' then 'SANTO'
                  when 'BORGUESI' then 'BORGHESI'  -- grafia antiga (Joaquim, 17/10/2026): o portal e BORGHESI
                  else w end as x
    from unnest(string_to_array(trim(regexp_replace(
           upper(translate(coalesce(t,''),
             'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
             'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
           '[^A-Z0-9]+', ' ', 'g')), ' ')) as w
  ) q
  where x not in ('SP','MG','BA','PR','RS','MS','PB','PE','AL','AC','SC','RJ','GO',
                  'IGREJA','AD','SETOR','REGIONAL','DE','DO','DA','DOS','DAS','SUB','E')
$f$;

do $mig$
declare
  v_ano     text    := '2022';   -- <<< ANO A MIGRAR
  v_commit  boolean := false;    -- <<< false = dry-run (desfaz) | true = grava
  v_basico  uuid;
  v_medio   uuid;
  n_alunos_novos int; n_alunos_exist int; n_editions int; n_matr int;
  n_aprov int; n_canc int; n_dup_leg int; n_dup_portal int;
  n_turmas int; n_turmas_igreja int;
  v_msg text;
begin
  select id into v_basico from public.courses
   where title ilike '%b_sico%' and title ilike '%teol%'
   order by (title ilike '%seed%') asc limit 1;
  select id into v_medio from public.courses
   where title ilike '%m_dio%' and title ilike '%teol%'
   order by (title ilike '%seed%') asc limit 1;
  if v_basico is null or v_medio is null then
    raise exception 'Cursos Basico/Medio nao encontrados em public.courses';
  end if;

  -- 1) Todas as matriculas legadas 2022-2024 com status calculado e regra de duplicidade
  create temp table pm on commit drop as
  with base as (
    select m.codigo, m.mat_aluno, t.codigo as cod_turma, t.cod_serie, t.ano_letivo,
           m.situacao, m.data_matricula, m.data_cadastro, t.data_final, t.nome as turma_nome,
           mu.situacao as un_sit, mu.tipo_legado, mu.portal_unit_nome as setor_nome,
           mu.nome_legado as unidade_nome,
           exists (select 1 from public.legado_notas n where n.cod_matricula = m.codigo) as tem_nota
    from public.legado_matriculas m
    join public.legado_turmas t on t.codigo = m.cod_turma
    left join public.legado_mapa_unidades mu on mu.cod_legado = t.cod_unidade
    where t.ano_letivo in ('2022','2023','2024')
  ), st as (
    select *, case when situacao = '4' then 'APROVADO'
                   when situacao = '1' and tem_nota then 'APROVADO'
                   else 'CANCELADO' end as status_regra
    from base
  ), rk as (
    select *, row_number() over (
        partition by mat_aluno, cod_serie, (status_regra = 'APROVADO')
        order by ano_letivo desc, codigo::int desc) as rn
    from st
  )
  select *,
    case when status_regra = 'APROVADO' and rn > 1 then 'CANCELADO' else status_regra end as status_final,
    (status_regra = 'APROVADO' and rn > 1) as dup_legado,
    false as dup_portal
  from rk;

  create temp table esc on commit drop as
  select * from pm where ano_letivo = v_ano and un_sit = 'MAPEADO';

  -- 2) Mapa turma -> igreja (decisao automatica para as turmas do escopo que ainda nao tem linha)
  insert into public.legado_mapa_turmas
    (cod_turma, ano, nome_turma, setor_legado_nome, igreja_nome, igreja_setor_nome, metodo, candidatas, confirmado)
  with t as (
    select distinct e.cod_turma, btrim(e.turma_nome) as nome, e.setor_nome, e.tipo_legado,
           regexp_replace(e.unidade_nome, '(?i)^(SETOR|REGIONAL)\s*0*\d+(\.\d+)?\s*[-–]?\s*', '') as sufixo
    from esc e
    where e.cod_turma not in (select cod_turma from public.legado_mapa_turmas)
  ), cand as (
    select t.cod_turma, c.name as igreja, s.name as setor_portal,
           (s.name = t.setor_nome) as mesmo,
           ( (cardinality(pg_temp.nrm(t.nome)) > 0 and (pg_temp.nrm(t.nome) <@ pg_temp.nrm(c.name) or pg_temp.nrm(c.name) <@ pg_temp.nrm(t.nome)))
          or (cardinality(pg_temp.nrm(t.sufixo)) > 0 and (pg_temp.nrm(t.sufixo) <@ pg_temp.nrm(c.name) or pg_temp.nrm(c.name) <@ pg_temp.nrm(t.sufixo))) ) as parecido,
           ( (pg_temp.nrm(t.nome) <@ pg_temp.nrm(c.name) and pg_temp.nrm(c.name) <@ pg_temp.nrm(t.nome) and cardinality(pg_temp.nrm(t.nome)) > 0)
          or (pg_temp.nrm(t.sufixo) <@ pg_temp.nrm(c.name) and pg_temp.nrm(c.name) <@ pg_temp.nrm(t.sufixo) and cardinality(pg_temp.nrm(t.sufixo)) > 0) ) as igual
    from t
    join public.units c on c.type = 'IGREJA'
    join public.units s on s.id = c.parent_id
    where t.tipo_legado in ('SETOR','REGIONAL')
  ), agg as (
    select cod_turma,
      count(*) filter (where parecido and mesmo)                  as n_mesmo,
      count(*) filter (where igual and mesmo)                     as n_igual_mesmo,
      count(*) filter (where igual and not mesmo)                 as n_igual_outro,
      min(igreja) filter (where igual and mesmo)                  as ig_igual_mesmo,
      min(setor_portal) filter (where igual and mesmo)            as st_igual_mesmo,
      min(igreja) filter (where parecido and mesmo)               as ig_par_mesmo,
      min(setor_portal) filter (where parecido and mesmo)         as st_par_mesmo,
      min(igreja) filter (where igual and not mesmo)              as ig_igual_outro,
      min(setor_portal) filter (where igual and not mesmo)        as st_igual_outro,
      string_agg(igreja || ' (' || setor_portal || ')', ' | ' order by igreja)
        filter (where parecido) as todas
    from cand group by cod_turma
  )
  select t.cod_turma, v_ano, t.nome, t.setor_nome,
    case when t.tipo_legado = 'SEDE' then null
         when a.n_igual_mesmo = 1 then a.ig_igual_mesmo
         when a.n_igual_mesmo = 0 and a.n_mesmo = 1 then a.ig_par_mesmo
         when a.n_mesmo = 0 and a.n_igual_outro = 1 then a.ig_igual_outro end,
    case when t.tipo_legado = 'SEDE' then null
         when a.n_igual_mesmo = 1 then a.st_igual_mesmo
         when a.n_igual_mesmo = 0 and a.n_mesmo = 1 then a.st_par_mesmo
         when a.n_mesmo = 0 and a.n_igual_outro = 1 then a.st_igual_outro end,
    case when t.tipo_legado = 'SEDE' then 'SEDE'
         when a.n_igual_mesmo = 1 then 'EXATO_MESMO_SETOR'
         when a.n_igual_mesmo = 0 and a.n_mesmo = 1 then 'SUBCONJUNTO_MESMO_SETOR'
         when a.n_mesmo = 0 and a.n_igual_outro = 1 then 'OUTRO_SETOR_EXATO'
         when coalesce(a.n_mesmo,0) > 1 or coalesce(a.n_igual_outro,0) > 1 or coalesce(a.n_igual_mesmo,0) > 1 then 'AMBIGUO'
         else 'SEM_MATCH' end,
    a.todas,
    -- 17/10/2026 (Joaquim): "o portal e o que vale" -> igreja com nome exato e unica em OUTRO setor
    -- (o portal reorganizou setores) tambem e aplicada automaticamente.
    (t.tipo_legado = 'SEDE' or a.n_igual_mesmo = 1 or (a.n_igual_mesmo = 0 and a.n_mesmo = 1)
       or (a.n_mesmo = 0 and a.n_igual_outro = 1))
  from t left join agg a on a.cod_turma = t.cod_turma;

  -- 2b) unidade/igreja/setor efetivos por turma do escopo (usa so decisoes confirmadas)
  create temp table tm on commit drop as
  select d.cod_turma,
         coalesce(ig.id, su.id) as unit_id,
         case when su.type = 'SEDE'
              then (select c.id from public.churches c where c.is_sede order by c.name limit 1)
              else (select c.id from public.churches c where c.unit_id = ig.id limit 1) end as church_id,
         (select s.id from public.sectors s where s.unit_id = coalesce(igs.id, su.id) limit 1) as sector_id,
         ig.name as igreja_nome
  from (select distinct e.cod_turma, e.setor_nome from esc e) d
  left join public.legado_mapa_turmas lm
         on lm.cod_turma = d.cod_turma and lm.confirmado and lm.igreja_nome is not null
  left join public.units igs on igs.type = 'SETOR' and igs.name = lm.igreja_setor_nome
  left join public.units ig  on ig.type = 'IGREJA' and ig.name = lm.igreja_nome and ig.parent_id = igs.id
  left join public.units su  on su.type in ('SETOR','SEDE') and su.name = d.setor_nome;

  select count(*), count(*) filter (where igreja_nome is not null) into n_turmas, n_turmas_igreja from tm;

  -- 3) Alunos do escopo (unidade/igreja/setor da turma mais recente)
  create temp table pa on commit drop as
  select a.matricula_antiga, a.nome, a.cpf,
         regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') as cpf_dig,
         a.email, a.telefone, a.celular, a.data_nascimento, a.sexo, a.estado_civil,
         a.profissao, a.nome_mae, a.nome_pai, a.cep, a.logradouro, a.num_logradouro,
         a.complemento, a.nacionalidade, a.rg,
         (select tm.unit_id from esc e2 join tm on tm.cod_turma = e2.cod_turma
           where e2.mat_aluno = a.matricula_antiga order by e2.ano_letivo desc, e2.codigo::int desc limit 1) as unit_id,
         (select tm.church_id from esc e2 join tm on tm.cod_turma = e2.cod_turma
           where e2.mat_aluno = a.matricula_antiga order by e2.ano_letivo desc, e2.codigo::int desc limit 1) as church_id,
         (select tm.sector_id from esc e2 join tm on tm.cod_turma = e2.cod_turma
           where e2.mat_aluno = a.matricula_antiga order by e2.ano_letivo desc, e2.codigo::int desc limit 1) as sector_id
  from public.legado_alunos a
  where a.matricula_antiga in (select mat_aluno from esc);

  create temp table pa_map (matricula_antiga text primary key, aluno_id uuid, criado boolean) on commit drop;

  -- 3a) ja existentes no portal (mesmo CPF so digitos): anexar, nao duplicar
  insert into pa_map
  select p.matricula_antiga, e.id, false
  from pa p join public.ead_alunos e
    on p.cpf_dig ~ '^\d{11}$' and regexp_replace(coalesce(e.cpf,''), '\D', '', 'g') = p.cpf_dig;
  get diagnostics n_alunos_exist = row_count;

  -- 3b) ja migrados antes (re-execucao idempotente)
  insert into pa_map
  select l.matricula_antiga, l.ead_aluno_id, l.criado_pela_migracao
  from public.legado_mig_alunos l
  where l.matricula_antiga in (select matricula_antiga from pa)
    and l.matricula_antiga not in (select matricula_antiga from pa_map);

  -- 3c) novos alunos (SEM acesso)
  with ins as (
    insert into public.ead_alunos
      (nome_completo, cpf, email, telefone, matricula, status, rg, data_nascimento, genero,
       estado_civil, profissao, nome_mae, nome_pai, cep, endereco, endereco_numero,
       endereco_complemento, nacionalidade, consentimento_lgpd_aceito, unit_id, church_id, sector_id)
    select btrim(p.nome),
           case when p.cpf_dig ~ '^\d{11}$' then p.cpf end,
           coalesce(nullif(btrim(p.email), ''), 'legado+' || p.matricula_antiga || '@sem-email.invalid'),
           coalesce(p.celular, p.telefone),
           'CETADP-LEG-' || lpad(p.matricula_antiga, 5, '0'),
           'INATIVO', p.rg,
           case when pg_temp.legado_date(p.data_nascimento) between date '1900-01-01' and current_date
                then pg_temp.legado_date(p.data_nascimento) end,
           case upper(coalesce(p.sexo,'')) when 'M' then 'MASCULINO' when 'F' then 'FEMININO' end,
           p.estado_civil, p.profissao, p.nome_mae, p.nome_pai, p.cep, p.logradouro, p.num_logradouro,
           p.complemento, coalesce(p.nacionalidade, 'Brasileira'), false,
           p.unit_id, p.church_id, p.sector_id
    from pa p
    where p.matricula_antiga not in (select matricula_antiga from pa_map)
    returning id, matricula
  )
  insert into pa_map
  select substring(i.matricula from 'CETADP-LEG-0*(\d+)$'), i.id, true from ins i;
  get diagnostics n_alunos_novos = row_count;

  insert into public.legado_mig_alunos (matricula_antiga, ead_aluno_id, criado_pela_migracao)
  select matricula_antiga, aluno_id, criado from pa_map
  on conflict (matricula_antiga) do nothing;

  -- 4) Edicoes (turmas) do escopo: nome da turma + marcador (LEG-cod); unidade = igreja quando resolvida
  insert into public.course_editions (course_id, nome, ano, data_inicio, data_fim, status, unit_id)
  select case t.cod_serie when '1' then v_basico else v_medio end,
         case when btrim(coalesce(t.nome,'')) ~ '^[\. ]*$'
              then coalesce(tm.igreja_nome, btrim(mu.nome_legado))
              else btrim(t.nome) end || ' (LEG-' || t.codigo || ')',
         t.ano_letivo::int, pg_temp.legado_date(t.data_inicial), pg_temp.legado_date(t.data_final),
         'ENCERRADA', tm.unit_id
  from public.legado_turmas t
  join public.legado_mapa_unidades mu on mu.cod_legado = t.cod_unidade
  join tm on tm.cod_turma = t.codigo
  where t.codigo not in (select cod_turma_legado from public.legado_mig_editions);
  get diagnostics n_editions = row_count;

  insert into public.legado_mig_editions (cod_turma_legado, course_edition_id)
  select substring(ce.nome from 'LEG-(\d+)\)$'), ce.id
  from public.course_editions ce
  where ce.nome ~ ' \(LEG-\d+\)$'
  on conflict (cod_turma_legado) do nothing;

  -- 5) Duplicidade com o portal: rebaixar para CANCELADO
  update esc e set dup_portal = true, status_final = 'CANCELADO'
  from pa_map m
  where m.matricula_antiga = e.mat_aluno and e.status_final = 'APROVADO'
    and exists (select 1 from public.ead_matriculas x
                where x.aluno_id = m.aluno_id
                  and x.course_id = case e.cod_serie when '1' then v_basico else v_medio end
                  and x.status in ('EM_ANDAMENTO','APROVADO'));

  -- 6) Matriculas
  -- O trigger check_matricula_unica do portal NAO olha o status da linha nova: ele bloquearia ate
  -- uma matricula CANCELADA se o aluno ja tem EM_ANDAMENTO/APROVADA no mesmo curso. A unicidade
  -- de APROVADA/EM_ANDAMENTO e garantida por este script (regras de duplicidade acima), entao o
  -- trigger fica desligado SO dentro desta transacao e e religado antes do fim (rollback tambem religa).
  alter table public.ead_matriculas disable trigger trg_ead_matriculas_unica;

  with ins as (
    insert into public.ead_matriculas
      (aluno_id, course_id, curso_nome_snapshot, matricula, status, origem,
       data_matricula, data_conclusao, course_edition_id, created_at)
    select m.aluno_id,
           case e.cod_serie when '1' then v_basico else v_medio end,
           (select c.title from public.courses c where c.id = case e.cod_serie when '1' then v_basico else v_medio end),
           'CETADP-LEG-' || e.ano_letivo || '-' || lpad(e.codigo, 6, '0'),
           e.status_final, 'MATRICULA_DIRETA',
           coalesce(pg_temp.legado_date(e.data_matricula), pg_temp.legado_date(e.data_cadastro),
                    make_date(e.ano_letivo::int, 1, 1)),
           case when e.status_final = 'APROVADO'
                then coalesce(pg_temp.legado_date(e.data_final), make_date(e.ano_letivo::int, 12, 31)) end,
           (select l.course_edition_id from public.legado_mig_editions l where l.cod_turma_legado = e.cod_turma),
           -- created_at = data historica (senao os KPIs "novas matriculas do mes" contam o legado como recente)
           coalesce(pg_temp.legado_date(e.data_matricula), pg_temp.legado_date(e.data_cadastro),
                    make_date(e.ano_letivo::int, 1, 1))
    from esc e join pa_map m on m.matricula_antiga = e.mat_aluno
    where e.codigo not in (select cod_matricula_legado from public.legado_mig_matriculas)
    returning id, matricula, status
  )
  insert into public.legado_mig_matriculas
    (cod_matricula_legado, ead_matricula_id, ead_aluno_id, numero_matricula, ano, status_final, regra, observacao)
  select e.codigo, i.id, m.aluno_id, i.matricula, e.ano_letivo, i.status,
         case when e.status_regra = 'APROVADO' and e.situacao = '4' then 'Concluido->APROVADO'
              when e.status_regra = 'APROVADO' then 'Ativo com nota->APROVADO'
              else 'Situacao ' || e.situacao || '->CANCELADO' end,
         case when e.dup_legado then 'duplicidade legado: existe matricula APROVADA mais recente no mesmo curso'
              when e.dup_portal then 'duplicidade portal: aluno ja tem matricula ativa/aprovada neste curso'
              when e.status_regra = 'CANCELADO' and e.situacao = '1' then 'sem conclusao (Ativo sem nota)'
              end
  from ins i
  join esc e on 'CETADP-LEG-' || e.ano_letivo || '-' || lpad(e.codigo, 6, '0') = i.matricula
  join pa_map m on m.matricula_antiga = e.mat_aluno;
  get diagnostics n_matr = row_count;

  alter table public.ead_matriculas enable trigger trg_ead_matriculas_unica;

  -- alunos criados pela migracao: created_at = primeira matricula historica (nao "hoje")
  update public.ead_alunos a set created_at = coalesce(
    (select min(m.data_matricula) from public.ead_matriculas m where m.aluno_id = a.id), a.created_at)
  where a.id in (select aluno_id from pa_map where criado);

  select count(*) filter (where status_final = 'APROVADO'),
         count(*) filter (where status_final = 'CANCELADO'),
         count(*) filter (where dup_legado),
         count(*) filter (where dup_portal)
    into n_aprov, n_canc, n_dup_leg, n_dup_portal
  from esc;

  v_msg := format('ano=%s alunos_novos=%s alunos_ja_no_portal=%s turmas=%s turmas_com_igreja=%s editions=%s matriculas=%s aprovadas=%s canceladas=%s dup_legado=%s dup_portal=%s',
                  v_ano, n_alunos_novos, n_alunos_exist, n_turmas, n_turmas_igreja, n_editions, n_matr, n_aprov, n_canc, n_dup_leg, n_dup_portal);

  if not v_commit then
    raise exception 'DRY-RUN (nada gravado): %', v_msg;
  end if;
  raise notice 'GRAVADO: %', v_msg;
end
$mig$;
