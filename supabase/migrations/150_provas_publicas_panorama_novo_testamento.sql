-- 150_provas_publicas_panorama_novo_testamento.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Basico que faltam.
-- Esta e Panorama do Novo Testamento (B6, Curso Basico). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Panorama do Novo Testamento: Testes 1 a 4 -> /prova-publica/panorama-novo-testamento-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Panorama do Novo Testamento - TESTEn - LICOES x E y.pdf" (curso-basico\B6), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS BASICO.xlsx" (aba B6, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original (unica excecao, autorizada pelo Joaquim: Panorama do AT, Teste 1 q.5, o PDF imprime "os[e" e foi gravado como "Jose", resposta E da planilha). O Teste Geral (recuperacao) nao entra,
-- como em Escatologia/Etica/Bibliologia.
-- Associacao e multipla escolha entram como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo titulo da materia (cada banco tem o seu UUID); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'panorama-novo-testamento-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Panorama do Novo Testamento', 'Teste 1 - Lições 1 e 2', 1, 'panorama-novo-testamento-teste-1', (select id from public.lessons where title = 'Panorama do Novo Testamento' order by created_at limit 1)),
  ('Panorama do Novo Testamento', 'Teste 2 - Lições 3 e 4', 2, 'panorama-novo-testamento-teste-2', (select id from public.lessons where title = 'Panorama do Novo Testamento' order by created_at limit 1)),
  ('Panorama do Novo Testamento', 'Teste 3 - Lições 5 e 6', 3, 'panorama-novo-testamento-teste-3', (select id from public.lessons where title = 'Panorama do Novo Testamento' order by created_at limit 1)),
  ('Panorama do Novo Testamento', 'Teste 4 - Lições 7 e 8', 4, 'panorama-novo-testamento-teste-4', (select id from public.lessons where title = 'Panorama do Novo Testamento' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('panorama-novo-testamento-teste-1', 1, 'CERTO_ERRADO', 'Através dos Evangelhos as comunidades cristãs primitivas tinham a possibilidade de ler sobre a vida de Jesus na terra.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 2, 'CERTO_ERRADO', 'Embora os Evangelhos sejam incompletos como uma história, são completos como uma manifestação.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 3, 'CERTO_ERRADO', 'Do ponto de vista cronológico, Mateus foi o primeiro livro do Novo Testamento.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 4, 'CERTO_ERRADO', 'Os dois grandes temas de Mateus são: o caráter messiânico de Jesus e a presença do Reino de Deus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 5, 'CERTO_ERRADO', 'Mateus cap.13 traz as parábolas do reino dos homens.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 6, 'CERTO_ERRADO', 'O sermão da montanha de Mateus 5-7 revela os princípios fundamentais do reino (dos céus).', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 7, 'CERTO_ERRADO', 'Podemos concluir historicamente que, após a morte de Paulo, Marcos passou a trabalhar com Pedro.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 8, 'CERTO_ERRADO', 'Paulo menciona Marcos como seu medico.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 9, 'CERTO_ERRADO', 'Este Evangelho (Marcos) é conhecido como “o Evangelho da Adoração”.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 10, 'CERTO_ERRADO', 'Jesus em seu sermão escatológico em Mc 13, faz a seguinte observação, “é necessário que antes o evangelho seja pregado a todas as nações”.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 11, 'CERTO_ERRADO', 'Marcos apresenta Jesus como o Filho de Deus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 12, 'CERTO_ERRADO', 'Em Lucas, o Messias de Deus veio até o seu povo, Israel, sem a prometida inclusão dos gentios.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 13, 'CERTO_ERRADO', 'Segundo os relatos bíblicos, Lucas foi companheiro de Paulo durante boa parte do ministério do apóstolo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 14, 'CERTO_ERRADO', 'Lucas gosta de mostrar simpatia de Cristo com as mulheres e crianças.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 15, 'CERTO_ERRADO', 'Lucas registra vários fatos e personagens omitidos pelos demais evangelistas.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 16, 'CERTO_ERRADO', 'O Evangelho segundo João se destaca por duas ênfases especiais: a devocional e a escatológica.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 17, 'CERTO_ERRADO', 'A apresentação que João faz de quem Jesus é está no cerne de tudo que é distintivo no seu evangelho.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 18, 'CERTO_ERRADO', 'Lucas escreveu os Atos dos Apóstolos como “segunda parte da obra, a primeira parte é conhecida como o Evangelho Segundo Lucas”.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-1', 19, 'CERTO_ERRADO', 'Lucas nos dá a certeza de que a salvação está alicerçada firmemente nos atos de Deus na história.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-1', 20, 'CERTO_ERRADO', 'No livro de Atos, Lucas enfatiza as obras do Espírito Santo nas pessoas e nas congregações.', null::jsonb, 'C'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('panorama-novo-testamento-teste-2', 1, 'CERTO_ERRADO', 'A carta aos Romanos apresenta de maneira superficial e sistemática a doutrina da justificação pela fé.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 2, 'CERTO_ERRADO', 'A Lei pune a pecaminosidade do homem, portanto, “por obras de lei, nenhuma carne será declarada justa”.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 3, 'CERTO_ERRADO', 'Os principais personagens de Romanos são Paulo e Febe.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 4, 'CERTO_ERRADO', 'Dentre as contribuições da carta aos Romanos esta a doutrina da justificação pela fé.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 5, 'CERTO_ERRADO', 'Paulo se posiciona contra os coríntios em questão após questão, em geral ligadas ao comportamento deles.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 6, 'CERTO_ERRADO', '1 Coríntios é uma resposta às indagações de Leo.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 7, 'CERTO_ERRADO', 'O apóstolo Paulo é grato de ter batizado a todos os coríntios.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 8, 'CERTO_ERRADO', '1 Corintios ensina que mesmo que o cônjuge da pessoa seja descrente, o crente não deve separar-se.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 9, 'CERTO_ERRADO', 'Encontramos em 1 Corintios que não podemos participar da mesa de Deus e da mesa dos demônios.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 10, 'CERTO_ERRADO', 'Paulo congratula os coríntios, pois, quando se reúnem, não existem divisões entre eles.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 11, 'CERTO_ERRADO', 'Paulo expressa seu alívio e alegria que a igreja de Corinto tinha recebido a sua primeira carta de uma maneira positiva.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 12, 'CERTO_ERRADO', 'Paulo não tinha inimigos dentro da igreja de Corinto.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 13, 'CERTO_ERRADO', 'A saudação final de 2 Corintios consiste numa exortação para o aperfeiçoamento da igreja em face a tantos problemas.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 14, 'CERTO_ERRADO', 'Paulo mostra em Galatas que a liberdade em Cristo não nos isenta da santificação na vida cristã.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 15, 'CERTO_ERRADO', 'A carta aos Gálatas é um lembrete constante de quão importante é entender as implicações da fé cristã para a vida cristã.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 16, 'CERTO_ERRADO', 'A carta aos Efésios descreve a disciplina necessária para se transformar em verdadeiros servos de Deus.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 17, 'CERTO_ERRADO', 'Paulo visitou Éfeso no retorno de sua segunda viagem missionária, deixando ali o casal Abner e Abigail.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 18, 'CERTO_ERRADO', 'Foi em Filipos que Lídia, o carcereiro e suas famílias foram convertidos a Cristo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-2', 19, 'CERTO_ERRADO', 'A Cidade de Filipos era um Importante polo da Macedônia, e se destacava pela extração de minério e prata.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-2', 20, 'CERTO_ERRADO', 'Uma das aplicações de Filipenses é a necessidade dos cristãos permanecerem unidos em humildade.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('panorama-novo-testamento-teste-3', 1, 'CERTO_ERRADO', 'O tema de Colossenses é a suficiência de nosso Senhor, Jesus Cristo, em satisfazer nossas necessidades em todas as áreas.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 2, 'CERTO_ERRADO', 'Os gentios persas de Colossos descendiam de religiosos caracterizados pela natureza mística.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 3, 'CERTO_ERRADO', 'A igreja em Tessalônica era exemplar. Entretanto, era imatura, porque houve pouco tempo de contato pessoal com Paulo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 4, 'CERTO_ERRADO', 'Paulo escreveu para os cristãos da igreja em Tessalônica para confirmar a segunda vinda de Cristo e exorta-los por sua fidelidade.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 5, 'CERTO_ERRADO', 'A igreja em Tessalônica era identificada como povo que vivia cristianismo autêntico, pois imitava o Senhor Jesus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 6, 'CERTO_ERRADO', 'As Epistolas Pastorais foram escritas para assinalar a conduta própria daqueles que vivem na casa de Deus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 7, 'CERTO_ERRADO', 'O interesse principal das Epistolas Pastorais está em que nelas achamos um quadro da Igreja nascente como em nenhum outro lugar.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 8, 'CERTO_ERRADO', '1 Timoteo é uma carta de exortação de Paulo a seu jovem colaborador que enfrentava problemas.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 9, 'CERTO_ERRADO', 'Timóteo foi provavelmente convertido na ocasião da segunda viagem missionária de Paulo, quando visitou Listra.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 10, 'CERTO_ERRADO', 'Em 1 Timoteo Paulo avisa do perigo de erros e falsos ensinos, e anima o jovem pastor a continuar na verdade, e a viver uma vida santa.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 11, 'CERTO_ERRADO', 'A primeira carta de Paulo a Timóteo resulta em um manual de instruções sobre liderança, administração e como pastorear a igreja local.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 12, 'CERTO_ERRADO', 'Tito foi deixado em Creta para liderar a Igreja que João havia estabelecido em uma de suas viagens missionárias.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 13, 'CERTO_ERRADO', 'A obra da redenção é belamente expressa por Paulo em Tito.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 14, 'CERTO_ERRADO', 'Filemom é a mais breve e provavelmente a mais íntima de todas as epístolas do apóstolo Paulo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-3', 15, 'CERTO_ERRADO', 'A carta a Filemom lida com a prática religiosa.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 16, 'CERTO_ERRADO', 'O amor que o crente encontra em Cristo é lindamente retratado por analogia em Filemom.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-3', 17, 'ASSOCIACAO_COLUNAS', 'A igreja de Tessalônica ainda tinha alguns equívocos sobre o', '["a. Milenio", "b. Pecado", "c. Dia do Senhor", "d. Nenhuma das alternativas é correta"]'::jsonb, 'c'),
  ('panorama-novo-testamento-teste-3', 18, 'ASSOCIACAO_COLUNAS', 'Faz parte do esboço de 2 Tessalonicenses', '["a. Encorajamento", "b. Esclarecimento", "c. Exortação", "d. Todas as alternativas estão corretas"]'::jsonb, 'd'),
  ('panorama-novo-testamento-teste-3', 19, 'ASSOCIACAO_COLUNAS', 'O que vemos de Paulo em 2 Timoteo', '["a. a grandeza", "b. a coragem", "c. a esperança", "d. Todas as alternativas estão corretas"]'::jsonb, 'd'),
  ('panorama-novo-testamento-teste-3', 20, 'ASSOCIACAO_COLUNAS', 'A maior preocupação de Paulo em 2 Timoteo era que conservassem a mensagem de salvação em Cristo', '["a. única", "b. verdadeira", "c. pura", "d. Todas as alternativas estão corretas"]'::jsonb, 'c'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('panorama-novo-testamento-teste-4', 1, 'CERTO_ERRADO', 'As Epistolas Gerais são mais abrangentes e a maioria delas não possui destinatários específicos.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 2, 'CERTO_ERRADO', 'As Epistolas Gerais tratam de questões que foram comuns aos crentes daquela época.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 3, 'CERTO_ERRADO', 'Hebreus é um conjunto comparativo entre o testamento da Lei e o testamento de Cristo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 4, 'CERTO_ERRADO', 'A epístola aos Hebreus é direcionada a um grupo de hebreus convertidos que passavam por perseguições por causa da Lei.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 5, 'CERTO_ERRADO', 'Tiago consiste em uma série de ensaios morais, enfatizando a perseverança no sofrimento e a vida cristã responsável.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 6, 'CERTO_ERRADO', 'A carta de Tiago se dirige aos cristãos gentios dispersos entre todas as nações.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 7, 'CERTO_ERRADO', 'Em 1 Pedro o apóstolo identifica os cristãos como herdeiros das promessas do Antigo Testamento.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 8, 'CERTO_ERRADO', '1 Pedro deixa claro que uma vida marcada por sofrimento também é fruto da graça de Deus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 9, 'CERTO_ERRADO', 'A segunda epístola de Pedro ensina a viver em santidade, sob a perspectiva da justiça do Senhor Jesus Cristo.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 10, 'CERTO_ERRADO', '2 Pedro aconselha os cristãos de sua época a que fossem diligentes e santos, apelando para os ensinamentos de João.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 11, 'CERTO_ERRADO', 'As epistolas de João foram escritas para reafirmar a confiança dos crentes em Cristo e no Espírito Santo.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 12, 'CERTO_ERRADO', 'A carta de 2 João é um apelo urgente para que os leitores da carta demonstrassem o seu amor por Deus e seu Filho Jesus.', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 13, 'CERTO_ERRADO', 'A epístola de Judas é um grito de advertência contra a apostasia futura.', null::jsonb, 'E'),
  ('panorama-novo-testamento-teste-4', 14, 'CERTO_ERRADO', 'Propósito do Apocalipse é a Revelação de Jesus Cristo que foi dada a João por Deus “para mostrar aos seus servos o que em breve há de acontecer.”', null::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 15, 'ASSOCIACAO_COLUNAS', 'Egoísta e Ambicioso', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'C'),
  ('panorama-novo-testamento-teste-4', 16, 'ASSOCIACAO_COLUNAS', 'Cristão fiel', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'B'),
  ('panorama-novo-testamento-teste-4', 17, 'ASSOCIACAO_COLUNAS', 'Debilitado fisicamente', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'A'),
  ('panorama-novo-testamento-teste-4', 18, 'ASSOCIACAO_COLUNAS', 'Testemunho real', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'B'),
  ('panorama-novo-testamento-teste-4', 19, 'ASSOCIACAO_COLUNAS', 'Amado de verdade', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'A'),
  ('panorama-novo-testamento-teste-4', 20, 'ASSOCIACAO_COLUNAS', 'Difamava e fazia fofoca', '["A - Gaio", "B - Demétrio", "C – Diótrefes"]'::jsonb, 'C')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
