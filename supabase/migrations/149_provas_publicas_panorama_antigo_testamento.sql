-- 149_provas_publicas_panorama_antigo_testamento.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Basico que faltam.
-- Esta e Panorama do Antigo Testamento (B5, Curso Basico). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Panorama do Antigo Testamento: Testes 1 a 4 -> /prova-publica/panorama-antigo-testamento-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Panorama do Antigo Testamento - TESTEn - LICOES x E y.pdf" (curso-basico\B5), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS BASICO.xlsx" (aba B5, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original (unica excecao, autorizada pelo Joaquim: Panorama do AT, Teste 1 q.5, o PDF imprime "os[e" e foi gravado como "Jose", resposta E da planilha). O Teste Geral (recuperacao) nao entra,
-- como em Escatologia/Etica/Bibliologia.
-- Associacao e multipla escolha entram como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo titulo da materia (cada banco tem o seu UUID); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'panorama-antigo-testamento-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Panorama do Antigo Testamento', 'Teste 1 - Lições 1 e 2', 1, 'panorama-antigo-testamento-teste-1', (select id from public.lessons where title = 'Panorama do Antigo Testamento' order by created_at limit 1)),
  ('Panorama do Antigo Testamento', 'Teste 2 - Lições 3 e 4', 2, 'panorama-antigo-testamento-teste-2', (select id from public.lessons where title = 'Panorama do Antigo Testamento' order by created_at limit 1)),
  ('Panorama do Antigo Testamento', 'Teste 3 - Lições 5 e 6', 3, 'panorama-antigo-testamento-teste-3', (select id from public.lessons where title = 'Panorama do Antigo Testamento' order by created_at limit 1)),
  ('Panorama do Antigo Testamento', 'Teste 4 - Lições 7 e 8', 4, 'panorama-antigo-testamento-teste-4', (select id from public.lessons where title = 'Panorama do Antigo Testamento' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('panorama-antigo-testamento-teste-1', 1, 'CERTO_ERRADO', 'O livro de Genesis mostra como Deus se relaciona com o homem.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 2, 'CERTO_ERRADO', 'O livro de Genesis se divide em tres sessões.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 3, 'CERTO_ERRADO', 'O nome Israel significa Deus é amor.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 4, 'CERTO_ERRADO', 'Gênesis considera o homem e a mulher em uma particular relação com Deus.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 5, 'CERTO_ERRADO', 'Deus chamou a José para livrar seu povo da escravidão do Egito.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 6, 'CERTO_ERRADO', 'Gosen foi o local do assentamento de Jaco no Egito.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 7, 'CERTO_ERRADO', 'O cântico de Miriã, expressa a sua gratidão a Deus pela milagrosa libertação de Israel.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 8, 'CERTO_ERRADO', 'Deus estabeleceu uma aliança com seu povo no Monte das Oliveiras.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 9, 'CERTO_ERRADO', 'A partir do Decálogo, toda a Lei tinha evidente preocupação em defender o direito dos mais abastados.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 10, 'CERTO_ERRADO', 'Deus mesmo deu a conhecer ao seu povo, na lei proclamada no Sinai, o que dele exigia e esperava que cumprisse pontualmente.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 11, 'CERTO_ERRADO', 'Levitico se trata de um texto destinado de modo particular aos levitas.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 12, 'CERTO_ERRADO', 'Levitico é um livro profético.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 13, 'CERTO_ERRADO', 'Os dois últimos capítulos de Levitico incluem, respectivamente, uma série de bênçãos e maldições.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 14, 'CERTO_ERRADO', 'O livro de Números descreve Moisés como uma pessoa mansa.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 15, 'CERTO_ERRADO', 'Uma das características de Números é a presença no livro de dois recenseamentos do povo de Israel.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 16, 'CERTO_ERRADO', 'A conduta dos israelitas é descrita em Números com traços bastante positivos.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-1', 17, 'CERTO_ERRADO', 'O livro de Deuteronomio é chamado de 2ª. Lei.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 18, 'CERTO_ERRADO', 'A chegada dos israelitas às terras de Moabe é o fato que, praticamente, marcou o final da caminhada iniciada no Egito.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 19, 'CERTO_ERRADO', 'Em Deuteronomio Moisés instrui os israelitas acerca da conduta que deviam observar para serem realmente o povo de Deus.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-1', 20, 'CERTO_ERRADO', 'Deuteronomio expressa o que Deus quer de seu povo escolhido de forma liberal.', null::jsonb, 'E'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('panorama-antigo-testamento-teste-2', 1, 'CERTO_ERRADO', 'Canaã é o sinal da infidelidade de Deus à sua palavra.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 2, 'CERTO_ERRADO', 'Na entrada de Canaã e na possessão do país, os Israelitas veem o cumprimento da promessa de Deus a Abraão, Isaque e Jacó.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 3, 'CERTO_ERRADO', 'O primeiro dos Juízes foi Josué e o último foi Samuel, o sacerdote e profeta.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 4, 'CERTO_ERRADO', 'O livro de Juizes nos mostra que entre todos os povos vizinhos, foram, provavelmente, os amalequitas que representaram para Israel a mais grave ameaça.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 5, 'CERTO_ERRADO', 'Noemi, procedente de Belém de Judá, havia emigrado com o seu marido e os seus dois filhos para terras moabitas.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 6, 'CERTO_ERRADO', 'O livro de Rute oferece um horizonte aberto à amizade e ao relacionamento pacífico com o forasteiro.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 7, 'CERTO_ERRADO', 'O livro de Samuel remete o leitor a “violenta e agitada época dos “Juízes” de Israel.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 8, 'CERTO_ERRADO', 'Saul, o primeiro rei de Israel, padeceu de um forte desequilíbrio emocional.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 9, 'CERTO_ERRADO', 'No livro de 2 Samuel, Davi lamenta a morte de Saul e de Jônatas.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 10, 'CERTO_ERRADO', 'Os últimos capitulos do livro de 2Sm descrevem um censo nacional ordenado por Davi.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 11, 'CERTO_ERRADO', 'Em 1 e 2 Reis o autor narra a última parte da história de Davi.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 12, 'CERTO_ERRADO', 'Pressionado por Bate-Seba, a sua esposa, Davi decide que se unja e se proclame rei o seu filho Absalão.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 13, 'CERTO_ERRADO', 'Em 1 e 2 Cronicas se reproduz a maior parte dos acontecimentos narrados nos livros de Samuel e Reis.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 14, 'CERTO_ERRADO', 'Em 2 Cronicas depois de uma breve descrição do exílio na Babilônia, é mencionado o decreto de Ciro, que autorizou o regresso dos judeus a Jerusalém.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 15, 'CERTO_ERRADO', 'No livro de Esdras, Nabucodonosor promulgou um decreto, pelo qual os judeus exilados na Babilônia ficavam livres para regressar à sua pátria.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 16, 'CERTO_ERRADO', 'Esdras foi escrito em aramaico e em hebraico.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 17, 'CERTO_ERRADO', 'O livro de Neemias contém as memórias de Neemias acerca da missão que lhe fora oficialmente encomendada pelo rei persa Artaxerxes IV.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-2', 18, 'CERTO_ERRADO', 'Nos últimos capitulos de Neemias, o livro inclui uma informação detalhada sobre o pessoal do Templo.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 19, 'CERTO_ERRADO', 'O nome de Deus nunca é mencionado explicitamente no livro de Ester.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-2', 20, 'CERTO_ERRADO', 'Os fatos narrados no livro de Ester podem ser interpretados como uma instrução acerca do poder de Deus.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('panorama-antigo-testamento-teste-3', 1, 'CERTO_ERRADO', 'Os livros poéticos e de sabedoria não representam uma parte expressiva da revelação de Deus no Velho Testamento.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 2, 'CERTO_ERRADO', 'Os dezessete livros históricos se relacionam com a raça Hebrea e os cinco poéticos se relacionam com o coração humano (universal).', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 3, 'CERTO_ERRADO', 'Os cinco livros poéticos são experienciais.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 4, 'CERTO_ERRADO', 'O livro de Jó é o segundo dos cinco livros chamados, com absoluta propriedade, de poéticos e sapienciais.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 5, 'CERTO_ERRADO', 'O autor do livro de Jó, expoente da literatura universal, se revela um consumado estilista.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 6, 'CERTO_ERRADO', 'Apesar de todas as desgraças Jó, confia em Deus e o bendiz.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 7, 'CERTO_ERRADO', 'Os três amigos que discursam com Jó são: Ananias, Misael, e Azarias.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 8, 'CERTO_ERRADO', 'Jó se lamenta da sua desgraça em termos que revelam uma amargura profunda.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 9, 'CERTO_ERRADO', 'A resposta dos amigos de Jó se repetem e é: a desgraça é o castigo do pecado.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 10, 'CERTO_ERRADO', 'Na conclusão do livro de Jó, o Senhor repreende os visitantes, elogia a fidelidade de Jó e lhe devolve com acréscimos aquilo que havia perdido.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 11, 'CERTO_ERRADO', 'O adorador, nos Salmos, toma a palavra para dirigir-se a Deus e repartir as experiências e as aspirações mais profundas da alma.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 12, 'CERTO_ERRADO', 'O nosso Senhor Jesus Cristo não utilizou os Salmos durante o seu ministério.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 13, 'CERTO_ERRADO', 'O estilo da poesia hebraica se assemelha ao estilo da poesia na nossa língua.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 14, 'CERTO_ERRADO', 'O genero poético hebraico utilizado nos Salmos é o paralelismo.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 15, 'CERTO_ERRADO', 'Proverbios, atraves de máximas, refrães, ditos e poemas, transmitem a antiga herança de sabedoria de Israel.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 16, 'CERTO_ERRADO', 'A sabedoria de Provérbios se centra acima de tudo nos âmbitos da vida que são regulados por ordenanças.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 17, 'CERTO_ERRADO', 'Consideramos que Roboão, filho de Davi foi o autor de Eclesiastes.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-3', 18, 'CERTO_ERRADO', 'Em Eclesiastes o Pregador se interroga pelo sentido da vida.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 19, 'CERTO_ERRADO', 'Cântico dos Cânticos é um poema distribuído em estrofes.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-3', 20, 'CERTO_ERRADO', 'Ao longo da história, o sentido das metáforas propostas pelo Cântico dos Cânticos tem sido aceito.', null::jsonb, 'E'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('panorama-antigo-testamento-teste-4', 1, 'CERTO_ERRADO', 'Os profetas apresentam-se a si mesmos como enviados de Deus e investidos de autoridade para proclamar a sua palavra.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 2, 'CERTO_ERRADO', 'Jesus deu testemunho de que o profeta tem honra na sua própria terra.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 3, 'CERTO_ERRADO', 'O livro de Isaías é uma coletânea de mensagens, com dados históricos e recursos literários.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 4, 'CERTO_ERRADO', 'Jeremias na convicção da sua chamada, enquanto cumpria o seu ministério só recebeu honra e reconhecimento.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 5, 'CERTO_ERRADO', 'Cada capítulo do livro de Lamentações tem um assunto principal e descreve uma forma diferente de ver a avaliar a situação.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 6, 'CERTO_ERRADO', 'Ezequiel ministrou à geração de sua época, uma geração extremamente pecaminosa e completamente sem esperança.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 7, 'CERTO_ERRADO', 'O Livro de Daniel registra as ações, profecias e visões do profeta Ezequiel.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 8, 'CERTO_ERRADO', 'Assim como Sadraque, Mesaque e Abede-nego, devemos sempre defender o rei.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 9, 'CERTO_ERRADO', 'Oseias escreveu seu livro para lembrar aos israelitas e a nós de que o nosso Deus é um Deus amoroso.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 10, 'CERTO_ERRADO', 'O livro de Joel é destacado por dois grandes eventos. Um deles é a invasão de gafanhotos e o outro é a ausência do Espírito.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 11, 'CERTO_ERRADO', 'No profeta Amos, Deus exige justiça para o inocente e misericórdia para com o pobre.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 12, 'CERTO_ERRADO', 'A mensagem de Obadias é definitiva e certa: o reino de Edom será reconstruído completamente.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 13, 'CERTO_ERRADO', 'No livro de Jonas Deus demonstra compaixão por um dos inimigos odiados de Israel.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 14, 'CERTO_ERRADO', 'Miqueias enfatiza a ameaça de juízo divino pelo rompimento da aliança com Deus.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 15, 'CERTO_ERRADO', 'Naum é uma profecia do amor de Deus para com Nínive.', null::jsonb, 'E'),
  ('panorama-antigo-testamento-teste-4', 16, 'CERTO_ERRADO', 'Habacuque fala de sus indignação diante da aparente tolerância de Deus com a injustiça.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 17, 'CERTO_ERRADO', 'Sofonias anuncia o juízo inevitável sobre o povo de Deus e as nações.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 18, 'CERTO_ERRADO', 'O Livro de Ageu é um lembrete dos problemas que o povo de Deus enfrentou naquele momento, e como Deus supriu suas necessidades.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 19, 'CERTO_ERRADO', 'Zacarias enfatizou que Deus tem usado Seus profetas para ensinar, advertir e corrigir o seu povo.', null::jsonb, 'C'),
  ('panorama-antigo-testamento-teste-4', 20, 'CERTO_ERRADO', 'Malaquias mostra que a ofensa dos sacerdotes a Deus foi a interrupção do culto e dos sacrifícios.', null::jsonb, 'E')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
