-- 097_teste_licao_certo_errado.sql
-- Testes de Certo/Errado por par de lições dentro de uma matéria (ex:
-- a "Prova Pneumatologia" impressa do CETADP, com 4 testes de 20
-- questões cada, um por par de lições — "Teste 1: Lições 1 e 2" etc).
-- Reaproveita o motor de avaliacoes/avaliacao_questoes (mesma correção
-- automática do Simulado/Prova), só adiciona uma granularidade mais
-- fina (lesson_id + numero_teste, em vez de só course_id) e um
-- formato fixo de 2 opções (Certo/Errado).
--
-- gabarito_provisorio: enquanto o CETADP não repassa o gabarito real
-- de cada teste impresso, o banco é populado com uma resposta
-- provisória só pra validar a estrutura/tela ponta a ponta — a nota
-- gerada NÃO tem valor de avaliação real. A flag é copiada pra
-- avaliacoes no momento em que o aluno inicia o teste, pra o
-- resultado mostrar o aviso mesmo que o banco seja corrigido depois.

alter table avaliacoes
  add column if not exists lesson_id uuid references lessons(id) on delete set null,
  add column if not exists numero_teste int,
  add column if not exists gabarito_provisorio boolean not null default false;

alter table avaliacoes drop constraint if exists avaliacoes_tipo_check;
alter table avaliacoes add constraint avaliacoes_tipo_check
  check (tipo = any (array['SIMULADO', 'PROVA', 'TESTE_LICAO']));

create table if not exists avaliacoes_teste_licao_banco (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  numero_teste int not null check (numero_teste > 0),
  licoes_label text not null,
  ordem int not null,
  enunciado text not null,
  -- 0 = Certo, 1 = Errado
  resposta_correta_index int not null check (resposta_correta_index in (0, 1)),
  gabarito_provisorio boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lesson_id, numero_teste, ordem)
);

alter table avaliacoes_teste_licao_banco enable row level security;

-- Mesmo padrão de avaliacoes_banco_questoes: só staff mexe no banco de
-- questões. O aluno nunca lê esta tabela diretamente — a geração do
-- teste usa o client admin (service_role), igual gerarQuestoes().
create policy avaliacoes_teste_licao_banco_staff on avaliacoes_teste_licao_banco
  for all to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN'])
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN'])
    )
  );
