-- ============================================================
-- 136_legado_tabelas_isoladas.sql  (16/10/2026)
-- Migracao do sistema antigo (Django ERP) - FASE 1: area de pouso ISOLADA.
--
-- SEGURANCA (requisito do Joaquim: a migracao nao pode comprometer o sistema):
--  * Tabelas legado_* sao 100% isoladas: SEM foreign key para nenhuma tabela viva
--    (ead_alunos, ead_matriculas, profiles, auth.users...). Nada aqui dispara
--    trigger, e-mail, convite ou cobranca.
--  * RLS ligado e NENHUMA policy: so service_role (server-side) enxerga.
--    anon/authenticated nao leem nem escrevem.
--  * Campos sensiveis LGPD (saude, militar, titulo de eleitor, certidoes,
--    medico, responsavel de estagio) NAO sao carregados. Segredos/sessoes
--    (django_session, oauth2_*) tambem nao.
--  * Idempotente (IF NOT EXISTS). Reversivel: DROP TABLE legado_* .
--  * Todas as colunas ficam como text (dado bruto do CSV); a conversao de
--    tipos so acontece na Fase 2/3, na hora de montar as tabelas reais.
--  * Aplicar primeiro SO no staging (cjxdroyyplpknygtcdgr).
-- ============================================================

create table if not exists public.legado_alunos (
  matricula_antiga   text primary key,          -- aluno.Matricula
  nome               text,
  nome_social        text,
  data_cadastro      text,
  data_nascimento    text,
  nacionalidade      text,
  profissao          text,
  cargo              text,
  sexo               text,
  estado_civil       text,
  telefone           text,
  celular            text,
  email              text,
  logradouro         text,
  num_logradouro     text,
  complemento        text,
  cod_bairro         text,
  cod_municipio      text,
  cep                text,
  rg                 text,
  orgao_expedidor    text,
  cpf                text,
  observacoes        text,
  nome_mae           text,
  nome_pai           text,
  carregado_em       timestamptz not null default now()
);

create table if not exists public.legado_unidades (
  codigo   text primary key,
  nome     text,
  bruto    jsonb
);

create table if not exists public.legado_series (
  codigo   text primary key,                    -- 1=Basico, 5=Medio
  nome     text,
  bruto    jsonb
);

create table if not exists public.legado_disciplinas (
  codigo   text primary key,
  nome     text,
  bruto    jsonb
);

create table if not exists public.legado_turmas (
  codigo        text primary key,
  cod_unidade   text,
  cod_serie     text,
  ano_letivo    text,
  nome          text,
  data_inicial  text,
  data_final    text,
  turno         text,
  observacoes   text,
  status        text
);

create table if not exists public.legado_matriculas (
  codigo            text primary key,           -- aluno_turma.Codigo (= CodMatricula em nota/presenca)
  mat_aluno         text,
  cod_turma         text,
  data_cadastro     text,
  data_matricula    text,
  situacao          text,                       -- codigo numerico
  situacao_antiga   text,                       -- texto: Ativo, Concluido...
  cod_motivo_inativacao text,
  data_inativacao   text,
  observacoes       text
);

create table if not exists public.legado_avaliacoes (
  codigo        text primary key,               -- serie_avaliacao.Codigo
  bruto         jsonb
);

create table if not exists public.legado_notas (
  codigo            text primary key,
  cod_disciplina    text,
  cod_matricula     text,                       -- legado_matriculas.codigo
  cod_serie_avaliacao text,
  valor             text,
  data_cadastro     text
);

create table if not exists public.legado_frequencia (
  codigo        text primary key,
  cod_aula      text,
  cod_matricula text,
  situacao      text                            -- P / F ...
);

create table if not exists public.legado_aulas (
  codigo   text primary key,
  bruto    jsonb
);

-- Indices para a conciliacao (Fase 2)
create index if not exists legado_matriculas_aluno_idx on public.legado_matriculas (mat_aluno);
create index if not exists legado_matriculas_turma_idx on public.legado_matriculas (cod_turma);
create index if not exists legado_notas_matricula_idx  on public.legado_notas (cod_matricula);
create index if not exists legado_freq_matricula_idx   on public.legado_frequencia (cod_matricula);
create index if not exists legado_alunos_cpf_idx       on public.legado_alunos (cpf);

-- RLS ligado e SEM policies = somente service_role acessa.
alter table public.legado_alunos       enable row level security;
alter table public.legado_unidades     enable row level security;
alter table public.legado_series       enable row level security;
alter table public.legado_disciplinas  enable row level security;
alter table public.legado_turmas       enable row level security;
alter table public.legado_matriculas   enable row level security;
alter table public.legado_avaliacoes   enable row level security;
alter table public.legado_notas        enable row level security;
alter table public.legado_frequencia   enable row level security;
alter table public.legado_aulas        enable row level security;

revoke all on public.legado_alunos, public.legado_unidades, public.legado_series,
  public.legado_disciplinas, public.legado_turmas, public.legado_matriculas,
  public.legado_avaliacoes, public.legado_notas, public.legado_frequencia,
  public.legado_aulas from anon, authenticated;
