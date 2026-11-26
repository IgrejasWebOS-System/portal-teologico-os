-- 148_provas_publicas_doutrina_de_deus.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Basico que faltam.
-- Esta e Doutrina de Deus (B1, Curso Basico). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Doutrina de Deus: Testes 1 a 4 -> /prova-publica/doutrina-de-deus-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Doutrina de Deus - TESTEn - LICOES x E y.pdf" (curso-basico\B1), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS BASICO.xlsx" (aba B1, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original (unica excecao, autorizada pelo Joaquim: Panorama do AT, Teste 1 q.5, o PDF imprime "os[e" e foi gravado como "Jose", resposta E da planilha). O Teste Geral (recuperacao) nao entra,
-- como em Escatologia/Etica/Bibliologia.
-- Associacao e multipla escolha entram como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo titulo da materia (cada banco tem o seu UUID); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'doutrina-de-deus-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Doutrina de Deus', 'Teste 1 - Lições 1 e 2', 1, 'doutrina-de-deus-teste-1', (select id from public.lessons where title = 'Doutrina de Deus' order by created_at limit 1)),
  ('Doutrina de Deus', 'Teste 2 - Lições 3 e 4', 2, 'doutrina-de-deus-teste-2', (select id from public.lessons where title = 'Doutrina de Deus' order by created_at limit 1)),
  ('Doutrina de Deus', 'Teste 3 - Lições 5 e 6', 3, 'doutrina-de-deus-teste-3', (select id from public.lessons where title = 'Doutrina de Deus' order by created_at limit 1)),
  ('Doutrina de Deus', 'Teste 4 - Lições 7 e 8', 4, 'doutrina-de-deus-teste-4', (select id from public.lessons where title = 'Doutrina de Deus' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('doutrina-de-deus-teste-1', 1, 'CERTO_ERRADO', 'Vê-se Deus em quase todas as páginas da Escritura Sagrada, porem Ele não se revela em palavras e atos.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 2, 'CERTO_ERRADO', 'Deus faz todas coisas segundo o conselho da sua vontade', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 3, 'CERTO_ERRADO', 'O Argumento Historico ou Etnologico é parte constitutiva da natureza do homem.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 4, 'CERTO_ERRADO', 'O Argumento Moral a vida é regulada por conceitos do bem e do mal.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 5, 'CERTO_ERRADO', 'A teologia reformada sustenta que Deus não pode ser conhecido.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 6, 'CERTO_ERRADO', 'A revelação geral encontrada na bíblia se trata da revelação na natureza que nos cerca.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 7, 'CERTO_ERRADO', 'JEOVÁ SAMÁ significa o "Senhor dos Exercitos".', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 8, 'CERTO_ERRADO', 'JEOVÁ MIKADISQUIM significa o "Senhor justiça nossa"', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 9, 'CERTO_ERRADO', 'Os nomes hebraicos do Antigo Testamento Adonai e YHWH se referem ao Senhor.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 10, 'CERTO_ERRADO', 'ABBA é uma palavra aramaica e significa "pai"', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 11, 'CERTO_ERRADO', 'Deus, sendo espírito, é incorpóreo, invisível, sem substância material, sem partes físicas e, portanto, é livre de todas as limitações temporais.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 12, 'CERTO_ERRADO', 'Teofania então é manifestação de Deus em forma tridimensional.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 13, 'CERTO_ERRADO', 'Os dois fatores da vida em geral: força e retidão.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 14, 'CERTO_ERRADO', 'Vida pode ser considerada como aquela forma de existência, animada em distinção da inanimada.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 15, 'CERTO_ERRADO', 'Nem tudo o que existe depende de Deus.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 16, 'CERTO_ERRADO', 'Somente Deus tem uma vida que se gera e sustenta a si própria.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 17, 'CERTO_ERRADO', 'Imensidade transcendem todas as limitações espaciais.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 18, 'CERTO_ERRADO', 'Infinidade é a perfeição de Deus pela qual Ele é isento de toda e qualquer limitação.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-1', 19, 'CERTO_ERRADO', 'A imutabilidade implica inatividade ou imobilidade.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-1', 20, 'CERTO_ERRADO', 'Deus é capaz de irrestrita simpatia e sofrimento e de grande indignação contra a iniquidade.', null::jsonb, 'E'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('doutrina-de-deus-teste-2', 1, 'CERTO_ERRADO', 'A palavra "onisciência'' significa todo conhecimento.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 2, 'CERTO_ERRADO', 'A onisciencia de Deus inclui tudo, Seu conhecimento é limitado/', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 3, 'CERTO_ERRADO', 'A sabedoria de Deus é aquela perfeição de Deus por meio da qual Ele aplica Seu conhecimento para alcançar Seus fins conforme a maneira que mais lhe glorifica.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 4, 'CERTO_ERRADO', 'A sabedoria de Deus nem sempre esta presente na Obra da Criação.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 5, 'CERTO_ERRADO', 'A palavra "onipotente" significa que Deus tem todo o poder.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 6, 'CERTO_ERRADO', 'O universo, conforme o conhecemos, é a suprema evidência da onipotência de Deus.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 7, 'CERTO_ERRADO', 'A palavra "onipresença" significa que Deus está presente em todos os lugares.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 8, 'CERTO_ERRADO', 'Deus esta misticamente na ordem natural.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 9, 'CERTO_ERRADO', 'A "soberania" de Deus indica o total domínio do Senhor sobre toda a sua vasta criação..', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 10, 'CERTO_ERRADO', 'A liberdade de expressão do homem só vai até onde deus lhe permitir.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 11, 'CERTO_ERRADO', 'A primeira ideia da santidade de Deus na bíblia é de majestade.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 12, 'CERTO_ERRADO', 'A ideia fundamental da santidade moral de Deus também é de separação.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 13, 'CERTO_ERRADO', 'A Santidade de Deus é manifesta no Seu ódio contra o pecado.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 14, 'CERTO_ERRADO', 'A santidade de Deus se manifesta em Seu ódio contra o pecado e em Seu deleite na retidão.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 15, 'CERTO_ERRADO', 'A Santidade de Deus gera Amor e Temor.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 16, 'CERTO_ERRADO', 'A Santidade de Deus exalta Sua Graça e Amor.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 17, 'CERTO_ERRADO', 'Deus é veraz em três sentidos: físico, ético e lógico.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-2', 18, 'CERTO_ERRADO', 'Deus no sentido ético e. como tal, revela-se como realmente é, de modo que a sua revelação é absolutamente confiável.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 19, 'CERTO_ERRADO', 'Deus em sua fidelidade cuida em suprir todas as nossas necessidades espirituais.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-2', 20, 'CERTO_ERRADO', 'As ideias básicas da fidelidade de Deus são que o Senhor não é arbitrário e nem displicente.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('doutrina-de-deus-teste-3', 1, 'CERTO_ERRADO', 'Justiça e retidão são simplesmente a santidade exercida para com as criaturas.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 2, 'CERTO_ERRADO', 'Deus é perfeição quase absoluta e felicidade perfeita em Si mesmo.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-3', 3, 'CERTO_ERRADO', 'A misericórdia é o ato de tratar um ofensor com maior rigor do que ele merece.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-3', 4, 'CERTO_ERRADO', 'A longanimidade é o aspecto da bondade ou amor de Deus em virtude da qual Ele tolera os rebeldes e maus, a despeito da sua prolongada desobediência.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 5, 'CERTO_ERRADO', 'Sem a graça, não existiríamos, não seriamos nada e não faríamos nada.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 6, 'CERTO_ERRADO', 'A palavra grega "charís" possuí vários significados como benevolencia.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 7, 'ASSOCIACAO_COLUNAS', 'benignidade', '["A - A misericórdia pode indicar", "B - A misericórdia de Deus é oferecida"]'::jsonb, 'A'),
  ('doutrina-de-deus-teste-3', 8, 'ASSOCIACAO_COLUNAS', 'gratuitamente', '["A - A misericórdia pode indicar", "B - A misericórdia de Deus é oferecida"]'::jsonb, 'B'),
  ('doutrina-de-deus-teste-3', 9, 'ASSOCIACAO_COLUNAS', 'benevolência', '["A - A misericórdia pode indicar", "B - A misericórdia de Deus é oferecida"]'::jsonb, 'A'),
  ('doutrina-de-deus-teste-3', 10, 'ASSOCIACAO_COLUNAS', 'favor', '["A - A misericórdia pode indicar", "B - A misericórdia de Deus é oferecida"]'::jsonb, 'A'),
  ('doutrina-de-deus-teste-3', 11, 'CERTO_ERRADO', 'O amor de Deus é sua obrigação pelo bem estar de suas criaturas e o deleite que Ele tem nisso.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-3', 12, 'CERTO_ERRADO', 'Por meio do seu amor Deus procura despertar amor correspondente por parte do homem.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 13, 'CERTO_ERRADO', 'Deus ama Aa raça humana como objeto originalmente impar e eterno.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-3', 14, 'CERTO_ERRADO', 'Devido aos nossos pecados erámos inimigos de Deus.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 15, 'CERTO_ERRADO', 'O Amor de Deus é manifesto no falar e disciplinar os seus filhos.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-3', 16, 'CERTO_ERRADO', 'Quando o amor de Deus se concentra sobre uma pessoa em aflição, é o amor da compaixão.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 17, 'ASSOCIACAO_COLUNAS', 'Deus ama como objeto originalmente impar e eterno.', '["A - PELA FÉ", "B - OS PECADORES", "C - SEU FILHO JESUS", "D - RAÇA HUMANA"]'::jsonb, 'C'),
  ('doutrina-de-deus-teste-3', 18, 'ASSOCIACAO_COLUNAS', 'Deus ama aqueles que estão unidos a seu filho.', '["A - PELA FÉ", "B - OS PECADORES", "C - SEU FILHO JESUS", "D - RAÇA HUMANA"]'::jsonb, 'A'),
  ('doutrina-de-deus-teste-3', 19, 'ASSOCIACAO_COLUNAS', 'Deus ama e a cada componente.', '["A - PELA FÉ", "B - OS PECADORES", "C - SEU FILHO JESUS", "D - RAÇA HUMANA"]'::jsonb, 'D'),
  ('doutrina-de-deus-teste-3', 20, 'ASSOCIACAO_COLUNAS', 'Deus ama a todos aqueles que estão mortos no pecado.', '["A - PELA FÉ", "B - OS PECADORES", "C - SEU FILHO JESUS", "D - RAÇA HUMANA"]'::jsonb, 'B'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('doutrina-de-deus-teste-4', 1, 'CERTO_ERRADO', 'O Pai é Deus, o Filho é Deus. e o Espirito Santo é Deus. No entanto, não há três Deuses, mas um Deus.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 2, 'CERTO_ERRADO', 'Adoramos um Deus em unicidade.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-4', 3, 'CERTO_ERRADO', 'Os verbos, os pronomes pessoais e os pronomes possessivos no plural indicam que mais de uma pessoa, portanto a Trindade se fizeram presentes em ação', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 4, 'CERTO_ERRADO', 'O Senhor, isto é o Pai ungiu Seu Filho com o Espírito Santo para o exercício de seu ministério.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 5, 'CERTO_ERRADO', 'A personalidade e a divindade de cada uma das Pessoas da trindade são reconhecidas na benção apostólica.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 6, 'CERTO_ERRADO', 'Todo crente é batizado em nome de Jesus.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-4', 7, 'CERTO_ERRADO', 'O pai é toda a plenitude da Divindade invisível, o Filho é toda a plenitude da Divindade manifestada, e o Espírito Santo é toda a plenitude da Divindade a agir diretamente sobre a criatura.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 8, 'CERTO_ERRADO', 'Quando se trata da Trindade, não são três Deuses e sim três pessoas distintas que formam um só Ser, essência e substância divina.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 9, 'CERTO_ERRADO', 'Deus não foi motivado por nada externo na criação dos céus e da terra.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 10, 'CERTO_ERRADO', 'Deus por sua própria vontade não só criou todas as coisas, mas tambem as deixou por sua própria vontade.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-4', 11, 'CERTO_ERRADO', 'A vontade de Deus para com o pecador que ele se arrependa e se converta e seja salvo.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 12, 'CERTO_ERRADO', 'Quanto ao crente em particular, a vontade de Deus é a sua perdição.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-4', 13, 'CERTO_ERRADO', 'A santificação não nos ajuda na questão de descobrir a vontade divina.', null::jsonb, 'E'),
  ('doutrina-de-deus-teste-4', 14, 'CERTO_ERRADO', 'Sempre que o amor for real e vital, o Senhor nos orientará.', null::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 15, 'ASSOCIACAO_COLUNAS', 'Deus na sua soberana vontade chamou Abrão para dele fazer', '["A - pura graça", "B - governador", "C - a nação de Israel", "D – preserva"]'::jsonb, 'C'),
  ('doutrina-de-deus-teste-4', 16, 'ASSOCIACAO_COLUNAS', 'O ato divino da seleção de Jacó foi um ato de', '["A - pura graça", "B - governador", "C - a nação de Israel", "D – preserva"]'::jsonb, 'A'),
  ('doutrina-de-deus-teste-4', 17, 'ASSOCIACAO_COLUNAS', 'Deus na sua soberana vontade quis e fez de José um.', '["A - pura graça", "B - governador", "C - a nação de Israel", "D – preserva"]'::jsonb, 'B'),
  ('doutrina-de-deus-teste-4', 18, 'ASSOCIACAO_COLUNAS', 'Israel apesar de rejeitar ao Messias, Deus na sua vontade os', '["A - pura graça", "B - governador", "C - a nação de Israel", "D – preserva"]'::jsonb, 'D'),
  ('doutrina-de-deus-teste-4', 19, 'ASSOCIACAO_COLUNAS', 'A vontade soberana de Deus é a sua vontade diretiva, ou seja, é aquilo que Ele determinou e que se cumprirá na sua', '["a. integridade", "b. parcialidade", "c. vontade", "d. Nenhuma das alternativas é correta"]'::jsonb, 'd'),
  ('doutrina-de-deus-teste-4', 20, 'ASSOCIACAO_COLUNAS', 'A vontade moral de Deus pode ser', '["a. aceita pelos homens", "b. desobedecida pelos homens", "c. reconhecida pelos homens", "d. Todas as alternativas estão corretas"]'::jsonb, 'b')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
