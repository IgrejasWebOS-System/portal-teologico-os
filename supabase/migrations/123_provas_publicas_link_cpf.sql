-- 123_provas_publicas_link_cpf.sql
--
-- Módulo "Prova pública por link + CPF" — 01/10/2026, pedido do Joaquim.
-- Caso específico: aluno que ainda não tem matrícula no sistema recebe um
-- link público (sem login), informa CPF + nome completo, faz uma prova
-- FIXA (sempre as mesmas perguntas, na mesma ordem do PDF original -- não
-- é sorteio de pool como em avaliacoes_banco_questoes_licao). A resposta
-- fica guardada aqui até que o cadastro oficial do aluno (ead_alunos) seja
-- criado com o mesmo CPF -- aí o vínculo acontece sozinho (trigger),
-- sem revisão da secretaria (decisão confirmada com o Joaquim).
--
-- Não mexe em avaliacoes / avaliacoes_banco_questoes_licao -- é um módulo
-- isolado, paralelo ao fluxo de teste logado no portal, que continua
-- existindo normalmente.
--
-- RLS: habilitado, sem nenhuma policy para anon/authenticated -- todo
-- acesso (ler prova, gravar resposta, consultar resultado) passa pelo
-- cliente admin (service_role) dentro de Server Actions, mesmo padrão já
-- usado em /inscricao e no mutirão (108_mutirao_cadastro_professor_aluno.sql).

create table if not exists public.provas_publicas (
  id uuid primary key default gen_random_uuid(),
  materia text not null,
  titulo text not null,
  numero_teste int not null,
  slug text not null unique,
  lesson_id uuid references public.lessons(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.provas_publicas is
  'Provas "sempre as mesmas" aplicadas por link público sem login (CPF + nome). Caso específico -- não substitui avaliacoes/avaliacoes_banco_questoes_licao.';
comment on column public.provas_publicas.slug is
  'Usado na URL pública /prova-publica/<slug>. Estável -- nunca reutilizar depois de divulgado.';

create table if not exists public.provas_publicas_questoes (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references public.provas_publicas(id) on delete cascade,
  ordem int not null,
  formato text not null check (formato in ('CERTO_ERRADO', 'ASSOCIACAO_COLUNAS')),
  enunciado text not null,
  opcoes jsonb,
  resposta_correta text not null,
  unique (prova_id, ordem)
);

comment on column public.provas_publicas_questoes.opcoes is
  'Só usado em ASSOCIACAO_COLUNAS -- lista compartilhada da Coluna B do bloco (ex.: ["A - Hades","B - Tártaro"]). Null em CERTO_ERRADO, mesma convenção de avaliacoes_banco_questoes_licao.';
comment on column public.provas_publicas_questoes.resposta_correta is
  'CERTO_ERRADO: "C" ou "E". ASSOCIACAO_COLUNAS: a letra da Coluna B que é o par correto.';

create table if not exists public.provas_publicas_respostas (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references public.provas_publicas(id) on delete cascade,
  cpf text not null,
  nome_completo text not null,
  respostas jsonb not null,
  acertos int not null,
  total int not null,
  nota numeric not null,
  enviado_em timestamptz not null default now(),
  ead_aluno_id uuid references public.ead_alunos(id) on delete set null,
  vinculado_em timestamptz
);

comment on column public.provas_publicas_respostas.cpf is
  'Só dígitos (sem pontuação) -- normalizado no envio, pra bater com o CPF normalizado de ead_alunos.cpf na reconciliação automática (trigger abaixo).';
comment on column public.provas_publicas_respostas.ead_aluno_id is
  'Preenchido automaticamente quando um ead_alunos com o mesmo CPF existe ou é criado depois -- vínculo automático, sem revisão da secretaria (decisão do Joaquim, 01/10/2026).';

create index if not exists provas_publicas_respostas_cpf_pendente_idx
  on public.provas_publicas_respostas (cpf)
  where ead_aluno_id is null;

alter table public.provas_publicas enable row level security;
alter table public.provas_publicas_questoes enable row level security;
alter table public.provas_publicas_respostas enable row level security;

-- ============================================================
-- Reconciliação automática por CPF: quando o cadastro oficial do aluno é
-- criado (ou tem o CPF preenchido/corrigido depois), liga sozinho
-- qualquer prova pública pendente com o mesmo CPF.
-- ============================================================
create or replace function public.vincular_provas_publicas_por_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cpf_normalizado text;
begin
  cpf_normalizado := regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g');
  if cpf_normalizado = '' then
    return new;
  end if;

  update public.provas_publicas_respostas
  set ead_aluno_id = new.id,
      vinculado_em = now()
  where cpf = cpf_normalizado
    and ead_aluno_id is null;

  return new;
end;
$$;

drop trigger if exists trg_vincular_provas_publicas_insert on public.ead_alunos;
create trigger trg_vincular_provas_publicas_insert
  after insert on public.ead_alunos
  for each row execute function public.vincular_provas_publicas_por_cpf();

drop trigger if exists trg_vincular_provas_publicas_update on public.ead_alunos;
create trigger trg_vincular_provas_publicas_update
  after update of cpf on public.ead_alunos
  for each row execute function public.vincular_provas_publicas_por_cpf();

-- ============================================================
-- SEED: Escatologia Bíblica, Testes 1 a 4 — gabarito conferido questão a
-- questão contra os PDFs originais (TESTE1-LICAO 1 E 2 ... TESTE4-LICAO 7
-- E 8) e o ESCATOLOGIA GABARITO.pdf (seção "TESTES PARCIAIS").
-- Links distintos por teste, datas (02/10, 05/10, 12/10, 19/10) são só
-- informativas -- não bloqueiam o link (decisão do Joaquim, 01/10/2026).
-- ============================================================
insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Escatologia Bíblica', 'Teste 1 - Lições 1 e 2', 1, 'escatologia-teste-1', 'd6f9047b-4d77-4a31-add2-bf546c529191'),
  ('Escatologia Bíblica', 'Teste 2 - Lições 3 e 4', 2, 'escatologia-teste-2', 'd6f9047b-4d77-4a31-add2-bf546c529191'),
  ('Escatologia Bíblica', 'Teste 3 - Lições 5 e 6', 3, 'escatologia-teste-3', 'd6f9047b-4d77-4a31-add2-bf546c529191'),
  ('Escatologia Bíblica', 'Teste 4 - Lições 7 e 8', 4, 'escatologia-teste-4', 'd6f9047b-4d77-4a31-add2-bf546c529191')
on conflict (slug) do nothing;

-- TESTE 1 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'No sentido de separação, a morte ocorre quando há o desenlace, a separação da parte física, da parte espiritual.', 'C'),
  (2, 'A morte é a pena do pecado, e como tal não deve ser temida.', 'E'),
  (3, 'A decadência física e a dissolução final não são inescapáveis.', 'E'),
  (4, 'Para aqueles que rejeitam a Salvação em Cristo, a morte é o que de mais pavoroso pode existir.', 'C'),
  (5, 'Deus cuida de um modo especial de seus servos na hora da morte.', 'C'),
  (6, 'A morte moral consistiu na perda da consciência moral com a qual o homem foi criado.', 'E'),
  (7, 'Jesus experimentou a morte espiritual.', 'C'),
  (8, 'A morte espiritual é o estado natural de todos os homens.', 'C'),
  (9, 'A morte eterna podemos defini-la como a separação eterna de Deus para com o homem.', 'C'),
  (10, 'Cristo e a Lei são os meios para se escapar da morte eterna.', 'E'),
  (11, 'A primeira fase da vinda de Jesus compreende a Manifestação de Cristo em Glória.', 'E'),
  (12, 'A Segunda Vinda de Cristo é um só evento; porém dividido em três fases.', 'E'),
  (13, 'A promessa de Jesus em Jo 14.3 "...virei outra vez, e os levarei para mim mesmo, para que onde eu estiver estejais vós também" refere-se ao arrebatamento.', 'C'),
  (14, 'A Escritura deixa claro que a vinda de Cristo é sempre acompanhada por sinais.', 'C'),
  (15, 'Guerra e rumores de guerra são sinais biológicos da vinda de Jesus.', 'E'),
  (16, 'Entendemos como sinal cósmico os terremotos cada vez mais frequentes e severos.', 'C'),
  (17, 'No sinal espiritual temos presenciado um grande número de pessoas que procuram Deus só para satisfazerem seus desejos egoístas.', 'C'),
  (18, 'Smith, o fundador da igreja dos Mórmons, profetizou que a vinda do Senhor para o ano de 1899.', 'E'),
  (19, 'Charles Russel, o fundador das Testemunhas de Jeová disse que Cristo voltaria à terra e começaria reinar em 1914.', 'C'),
  (20, 'O Neomodernismo ensina que não haverá arrebatamento da Igreja.', 'C')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-1'
on conflict (prova_id, ordem) do nothing;

-- TESTE 2 (16 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'Nossa concepção acerca do Arrebatamento é o "Pós-Tribulacional".', 'E'),
  (2, 'A esfera de ação do arrebatamento serão nos ares.', 'C'),
  (3, 'O consolo do arrebatamento acha-se principalmente na tríplice reunião que será efetuada por ocasião da volta de Jesus.', 'C'),
  (4, 'No Arrebatamento os crentes que estiverem vivos não serão reunidos àqueles que já tiveram partido desta existência.', 'E'),
  (5, 'A volta do Senhor constitui um poderoso incentivo para o cultivo de cada uma das ações cristãs e para realização de toda boa obra.', 'C'),
  (6, 'Na primeira fase da vinda de Jesus Ele virá para os seus.', 'C'),
  (7, 'Ressurreição relativa fala das pessoas que morreram, mas que, pelo poder de Deus, tornaram à vida; ficando, todavia, sujeitos à morte novamente.', 'C'),
  (8, 'A Primeira Ressurreição é também chamada de ressurreição dentre os mortos e é a ressurreição de todos os mortos.', 'E'),
  (9, 'Os rabiscos da colheita serão todos os gentios salvos e martirizados durante a Grande Tribulação.', 'C'),
  (10, 'Na Manifestação de Cristo em Glória, Jesus virá acompanhado dos seus santos e anjos.', 'C'),
  (11, 'Para a Igreja, Jesus virá como Seu Messias e libertador.', 'E'),
  (12, 'Para as nações em geral, Jesus virá como o Rei dos reis e Senhor dos senhores.', 'C'),
  (13, 'Belém significa "casa de pão".', 'C'),
  (14, 'A Manifestação de Jesus em Glória ocorrerá no meio da Grande Tribulação.', 'E'),
  (15, 'Um dos propósitos da Vinda de Jesus é revelar-se a Israel como Messias, a quem um dia traspassaram.', 'C'),
  (16, 'Na vinda de Jesus, Israel e Judá serão unidos em um só reino debaixo de um só Rei.', 'C')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-2'
on conflict (prova_id, ordem) do nothing;

-- TESTE 2 (4 Associação de Colunas)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, q.ordem, 'ASSOCIACAO_COLUNAS', q.enunciado,
  '["A - Ocorrências no céu", "B - Ocorrências na terra"]'::jsonb, q.resposta
from public.provas_publicas p
cross join (values
  (17, 'Ressurreição dos mortos', 'B'),
  (18, 'Ele virá acompanhado de seus anjos', 'A'),
  (19, 'A trombeta de Deus soará', 'A'),
  (20, 'Transformação dos vivos', 'B')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-2'
on conflict (prova_id, ordem) do nothing;

-- TESTE 3 (16 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'O milênio é o maravilhoso reinado de Cristo na terra por mil anos.', 'C'),
  (2, 'O Milênio será o último dos grandes períodos proféticos, antes de raiar a eternidade.', 'E'),
  (3, 'Um dos propósitos do Milênio é estabelecer a paz na terra, eliminando toda rebelião contra Deus.', 'C'),
  (4, 'Os salvos não terão uma participação ativa durante o reinado de Cristo.', 'E'),
  (5, 'O cristão reinará com Cristo sobre os homens durante o Milênio, e sobre os anjos na eternidade.', 'C'),
  (6, 'Israel terá um papel fundamental durante o Milênio.', 'C'),
  (7, 'De Belém sairão tanto as diretrizes religiosas, como as leis civis para o mundo durante o Milênio.', 'E'),
  (8, 'Durante o Milênio, haverá a plenitude do derramamento do Espírito Santo.', 'C'),
  (9, 'No Juízo dos pecados da humanidade o homem é julgado como pecador.', 'C'),
  (10, 'Deus como Mediador pagou o preço de nossa condenação, através do sangue que Cristo derramou na cruz do Calvário.', 'E'),
  (11, 'Somos julgados como filhos de Deus nesta vida.', 'C'),
  (12, 'O julgamento das obras do crente terá um caráter mais quantitativo do que qualitativo.', 'E'),
  (13, 'Na Tribulação o Anticristo assumirá o controle mundial.', 'C'),
  (14, 'A base do julgamento das nações viventes será a forma com que trataram os irmãos de Jesus (Judeus).', 'C'),
  (15, 'O Juízo do Diabo e dos seus anjos caídos marca o ponto final da carreira de liberdade de ação deles.', 'C'),
  (16, 'Na sentença de cada condenado no Juízo final não haverá diferentes graus de castigos.', 'E')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-3'
on conflict (prova_id, ordem) do nothing;

-- TESTE 3 (4 Associação de Colunas)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, q.ordem, 'ASSOCIACAO_COLUNAS', q.enunciado,
  '["A - A ferocidade da natureza", "B - mudanças atmosféricas", "C - prosperidade geral", "D - plano político"]'::jsonb, q.resposta
from public.provas_publicas p
cross join (values
  (17, 'Os povos viverão felizes.', 'D'),
  (18, 'Todos possuirão casa própria.', 'C'),
  (19, 'O leão comerá palha com o boi.', 'A'),
  (20, 'Melhor nutrição.', 'B')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-3'
on conflict (prova_id, ordem) do nothing;

-- TESTE 4 (16 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'Gehenna é a palavra grega usada para descrever a condição final dos pecadores condenados.', 'C'),
  (2, 'O raciocínio humano, como a Palavra de Deus, declara abundantemente a existência real da habitação eterna dos ímpios.', 'C'),
  (3, 'A teoria da aniquilação ensina que Deus salvará os ímpios.', 'E'),
  (4, 'As Escrituras apresentam a alma como sujeita a morte no sentido de se tornar extinta ou passar a um estado de existência inconsciente.', 'E'),
  (5, 'Céu é o lugar da habitação de Deus, bem como daqueles intimamente associados com Ele.', 'C'),
  (6, 'Cristo transferiu os salvos que se encontravam no Hades para as regiões celestiais.', 'C'),
  (7, 'Depois da morte física, o crente vai aguardar no Paraíso para depois ir onde se acha Jesus.', 'E'),
  (8, 'Depois da morte física, os justos não estão inconscientes, porém gozam plenamente de todas as faculdades pessoais.', 'C'),
  (9, 'No céu os mistérios do Universo serão desvendados.', 'C'),
  (10, 'O céu será lugar de inatividade, onde os seres poderão passar o tempo tocando harpa.', 'E'),
  (11, 'Deus criou o homem mas não colocou nele o instinto da existência do céu.', 'E'),
  (12, 'O céu é um lugar justo, pois o Justo salvador é o dono do céu.', 'C'),
  (13, 'Não seremos hóspedes no céu, nem inquilinos; mas seremos donos.', 'C'),
  (14, 'No Estado intermediário os salvos estão no Tribunal de Cristo aguardando o momento da ressurreição.', 'E'),
  (15, 'Por ocasião do arrebatamento da Igreja, os que morreram em Cristo serão ressuscitados.', 'C'),
  (16, 'No final do milênio, o Diabo será solto, e conseguirá enganar a muitos e promoverá uma guerra contra o próprio Jesus.', 'C')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-4'
on conflict (prova_id, ordem) do nothing;

-- TESTE 4 (4 Associação de Colunas)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, q.ordem, 'ASSOCIACAO_COLUNAS', q.enunciado,
  '["A - Hades", "B - Tártaro", "C - Sheol", "D - Gehenna"]'::jsonb, q.resposta
from public.provas_publicas p
cross join (values
  (17, 'O mundo dos mortos.', 'C'),
  (18, 'Correspondente a Sheol.', 'A'),
  (19, 'Um lugar de suplício eterno.', 'D'),
  (20, 'O mais profundo abismo.', 'B')
) as q(ordem, enunciado, resposta)
where p.slug = 'escatologia-teste-4'
on conflict (prova_id, ordem) do nothing;
