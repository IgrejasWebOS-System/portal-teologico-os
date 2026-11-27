-- 152_provas_publicas_hermeneutica.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Medio que ja tem gabarito oficial.
-- Esta e Hermenêutica (M4, Curso Medio). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Hermenêutica: Testes 1 a 4 -> /prova-publica/hermeneutica-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Hermenêutica - TESTEn - LICOES x E y.pdf" (curso-medio\M4), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS MEDIO.xlsx" (aba M4, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original. O Teste Geral (recuperacao) nao entra.
-- Associacao entra como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo inicio do titulo da aula (cada banco tem o seu UUID; o titulo oficial pode ter sufixo); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'hermeneutica-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Hermenêutica', 'Teste 1 - Lições 1 e 2', 1, 'hermeneutica-teste-1', (select id from public.lessons where title ilike 'Hermenêutica%' order by created_at limit 1)),
  ('Hermenêutica', 'Teste 2 - Lições 3 e 4', 2, 'hermeneutica-teste-2', (select id from public.lessons where title ilike 'Hermenêutica%' order by created_at limit 1)),
  ('Hermenêutica', 'Teste 3 - Lições 5 e 6', 3, 'hermeneutica-teste-3', (select id from public.lessons where title ilike 'Hermenêutica%' order by created_at limit 1)),
  ('Hermenêutica', 'Teste 4 - Lições 7 e 8', 4, 'hermeneutica-teste-4', (select id from public.lessons where title ilike 'Hermenêutica%' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('hermeneutica-teste-1', 1, 'CERTO_ERRADO', 'Entende-se por hermenêutica um ramo da filosofia preocupado com a interpretação crítica de textos.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 2, 'CERTO_ERRADO', 'No tempo de Cristo, a interpretação (exegese) judaica podia classificar-se em tres métodos principais.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 3, 'CERTO_ERRADO', 'Historicamente, o alegorismo foi desenvolvido pelos gregos para reduzir a tensão entre sua tradição de mito religioso e sua herança filosófica.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 4, 'CERTO_ERRADO', 'Para os Saduceus apenas a primeira divisão do Cânon Hebraico, isto é, a lei (Torá), tinha autoridade.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 5, 'CERTO_ERRADO', 'Os apóstolos consideraram todo o Novo Testamento como sendo a Palavra de Deus inspirada.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 6, 'CERTO_ERRADO', 'Orígenes, foi o primeiro na história da igreja a apresentar uma teoria de interpretação bíblica.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 7, 'CERTO_ERRADO', 'O método de Orígenes apontava para a necessidade de se procurar pelo menos três níveis de significados na Bíblia.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 8, 'CERTO_ERRADO', 'No decorrer do último período medieval, os cabalistas na Europa e na Palestina continuaram na tradição do primitivo misticismo judaico.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 9, 'CERTO_ERRADO', 'Os judeus portugueses dos séculos doze a quinze que incentivaram o retorno a um método de interpretação histórico-gramatical.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 10, 'CERTO_ERRADO', 'Nicolau de Lyra (1270-1340 d.C.) causou significativo impacto sobre o retorno à interpretação literal.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 11, 'CERTO_ERRADO', 'A Reforma Protestante repercutiu na modernização do processo exegetico do texto bíblico.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 12, 'CERTO_ERRADO', 'Calvino, também, acreditava que a iluminação espiritual é necessária na pregação bíblica.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 13, 'CERTO_ERRADO', 'Confissão de Augsburg foi uma declaração de fé redigida por Carlos V.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 14, 'CERTO_ERRADO', 'Philipp Morris é considerado o líder do reavivamento pietista.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 15, 'CERTO_ERRADO', 'O método histórico-crítico floresceu inicialmente no deísmo.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 16, 'CERTO_ERRADO', 'Criticos chegam a dizer que a Igreja só passou a enxergar a Bíblia corretamente com o advento do método histórico-crítico.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 17, 'CERTO_ERRADO', 'A hermenêutica pós-moderna é caracterizada pelo subjetivismo no processo de interpretação do texto bíblico.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 18, 'CERTO_ERRADO', 'O sucesso das correntes subjetivas é a falta de compromisso com critérios objetivos que orientem e deem consistência ao processo interpretativo.', null::jsonb, 'E'),
  ('hermeneutica-teste-1', 19, 'CERTO_ERRADO', 'Para Gadamer os métodos de interpretação são sempre determinados pela época em que existem.', null::jsonb, 'C'),
  ('hermeneutica-teste-1', 20, 'CERTO_ERRADO', 'Para Ricoeur, a hermenêutica é mais do que ensino da interpretação de textos e de seus métodos interpretativos.', null::jsonb, 'C'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('hermeneutica-teste-2', 1, 'CERTO_ERRADO', 'O símile consiste em uma comparação formal entre dois objetos ou ações.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 2, 'CERTO_ERRADO', 'As Metáforas podem ser extraídas das práticas comuns a vida.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 3, 'CERTO_ERRADO', 'Há duas formas básicas de pleonasmo: o literário e o frutuoso.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 4, 'CERTO_ERRADO', 'A hipérbole da maior impressão, para mais ou para menos, a fim de apresenta-la inerte à imaginação.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 5, 'CERTO_ERRADO', 'Sinédoque é a substituição de uma ideia por outra que lhe é associada.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 6, 'CERTO_ERRADO', 'A prosopopéia ou personificação consiste em atribuir características ou ações próprias de pessoas a seres animados.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 7, 'CERTO_ERRADO', 'Apóstrofe é a interrupção do discurso com o intuito de dirigir-se a uma pessoa ou coisa personificada.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 8, 'CERTO_ERRADO', 'Ironia é a figura de linguagem por meio da qual o que se escreve, ou fala, expressa o contrário do que se deseja dizer.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 9, 'CERTO_ERRADO', 'Eufenismo é a figura de linguagem que sugere com dissimulo e decoro ideias cuja expressão franca e literal soa demasiadamente amáveis.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 10, 'CERTO_ERRADO', 'A alegoria é uma sucessão de metáforas ou uma metáfora estendida, geralmente combinada em forma de canção.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 11, 'CERTO_ERRADO', 'Enigma serve para ocultar alguma verdade dos que não possuem penetração espiritual para perceber sua forma figurada.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 12, 'CERTO_ERRADO', 'Fábula pode ser definida como uma narração imaginária, fictícia ou alegórica que se propõe a encerrar uma lição moral..', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 13, 'CERTO_ERRADO', 'Contexto Inicial é a própria frase ou versículo em que o termo foi usado.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 14, 'CERTO_ERRADO', 'Nem sempre é possível descobrir o autor e seus destinatários por via dos dados internos (Textuais) ou dos externos (Históricos).', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 15, 'CERTO_ERRADO', 'O conhecimento do contexto histórico-cultural nem sempre é decisivo para interpretar corretamente um texto.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 16, 'CERTO_ERRADO', 'Perspectiva numenológica é quando os autores escrevem como se estivessem olhando com os olhos de Deus', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 17, 'CERTO_ERRADO', 'Léxico é o conjunto de palavras usadas em uma língua ou em um texto.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 18, 'CERTO_ERRADO', 'Uma concordância, ou chave bíblica, contêm uma lista de todas as vezes que determinada palavra é usada no dicionário.', null::jsonb, 'E'),
  ('hermeneutica-teste-2', 19, 'CERTO_ERRADO', 'Os conectivos são palavras que ligam orações subordinadas e coordenadas à anterior.', null::jsonb, 'C'),
  ('hermeneutica-teste-2', 20, 'CERTO_ERRADO', 'Elohim é a palavra genérica para Deus.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('hermeneutica-teste-3', 1, 'ASSOCIACAO_COLUNAS', 'Condicionava a vida do homem após a queda.', '["A - Pacto Edênico", "B - Pacto Adâmico", "C - Pacto Mosaico", "D - Pacto Palestiniano", "E - Novo Pacto"]'::jsonb, 'B'),
  ('hermeneutica-teste-3', 2, 'ASSOCIACAO_COLUNAS', 'A lei foi dada.', '["A - Pacto Edênico", "B - Pacto Adâmico", "C - Pacto Mosaico", "D - Pacto Palestiniano", "E - Novo Pacto"]'::jsonb, 'C'),
  ('hermeneutica-teste-3', 3, 'ASSOCIACAO_COLUNAS', 'Condicionava a vida do homem em seu estado de inocência.', '["A - Pacto Edênico", "B - Pacto Adâmico", "C - Pacto Mosaico", "D - Pacto Palestiniano", "E - Novo Pacto"]'::jsonb, 'A'),
  ('hermeneutica-teste-3', 4, 'ASSOCIACAO_COLUNAS', 'A obra sacrifical e sacerdotal de Cristo', '["A - Pacto Edênico", "B - Pacto Adâmico", "C - Pacto Mosaico", "D - Pacto Palestiniano", "E - Novo Pacto"]'::jsonb, 'E'),
  ('hermeneutica-teste-3', 5, 'ASSOCIACAO_COLUNAS', 'A restauração de Israel no tempo devido', '["A - Pacto Edênico", "B - Pacto Adâmico", "C - Pacto Mosaico", "D - Pacto Palestiniano", "E - Novo Pacto"]'::jsonb, 'D'),
  ('hermeneutica-teste-3', 6, 'CERTO_ERRADO', 'A Bíblia, naturalmente, é muito mais heterogênea do que muitas pessoas querem admitir .', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 7, 'CERTO_ERRADO', 'Tradicionalmente, temos cinco gêneros literários.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 8, 'CERTO_ERRADO', 'Os salmos foram escritos tendo como gênero literário a poesia grega.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 9, 'CERTO_ERRADO', 'Paralelismo Climático é o que retoma do membro precedente um termo ou expressão.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 10, 'CERTO_ERRADO', 'A literatura sapiencial é fruto das observações dos sábios.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 11, 'CERTO_ERRADO', 'O Gênero Profético apareceu com mais frequência em momentos de grande perseguição contra os judeus.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 12, 'CERTO_ERRADO', 'Estilo literário é a forma particular que o escritor usa a linguagem escrita para compor suas obras.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 13, 'CERTO_ERRADO', 'Cada autor sagrado tem seu estilo literário individual.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 14, 'CERTO_ERRADO', 'Aforismos é Recurso literário que consiste em uma frase concisa, precisa e carregada de grande força.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 15, 'CERTO_ERRADO', 'Gradação é Recurso literário que consiste em um resumo do conteúdo.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 16, 'CERTO_ERRADO', 'Entre os hebreus não era costume chamar uma pessoa de filho fazendo referência àquilo que a caracterizava de modo especial.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 17, 'CERTO_ERRADO', 'Antropormofismo é literalmente é a forma de homem ou forma humana.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 18, 'CERTO_ERRADO', 'Antropopatismo é literalmente é paixão ou afeto divino.', null::jsonb, 'E'),
  ('hermeneutica-teste-3', 19, 'CERTO_ERRADO', 'No hebraico, língua em que foi escrito o Antigo Testamento, o termo "sem" é, repetidas vezes, achado em paralelismo com memória, lembrança, renome.', null::jsonb, 'C'),
  ('hermeneutica-teste-3', 20, 'CERTO_ERRADO', 'Mudar o nome de alguém significa assinalar lhe uma nova função, um novo destino de vida.', null::jsonb, 'C'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('hermeneutica-teste-4', 1, 'ASSOCIACAO_COLUNAS', 'Comentários exegéticos.', '["A - Análise Histórico-Cultural e Contextual", "B - Análise Léxico-Sintática", "C - Análise Teológica", "D - Análise Literária"]'::jsonb, 'B'),
  ('hermeneutica-teste-4', 2, 'ASSOCIACAO_COLUNAS', 'Só um ponto central.', '["A - Análise Histórico-Cultural e Contextual", "B - Análise Léxico-Sintática", "C - Análise Teológica", "D - Análise Literária"]'::jsonb, 'D'),
  ('hermeneutica-teste-4', 3, 'ASSOCIACAO_COLUNAS', 'À luz do lugar e da época.', '["A - Análise Histórico-Cultural e Contextual", "B - Análise Léxico-Sintática", "C - Análise Teológica", "D - Análise Literária"]'::jsonb, 'A'),
  ('hermeneutica-teste-4', 4, 'ASSOCIACAO_COLUNAS', 'Definir as expressões.', '["A - Análise Histórico-Cultural e Contextual", "B - Análise Léxico-Sintática", "C - Análise Teológica", "D - Análise Literária"]'::jsonb, 'C'),
  ('hermeneutica-teste-4', 5, 'CERTO_ERRADO', 'Parábola leva a ideia de colocar uma coisa ao lado de outra com o objetivo de comparar.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 6, 'CERTO_ERRADO', 'Muitas das parábolas de Jesus dizem respeito ao juízo final.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 7, 'CERTO_ERRADO', 'A tipologia baseia-se na suposição de que não há um padrão na obra de Deus através da história da salvação.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 8, 'CERTO_ERRADO', 'Os Antítipos no Novo Testamento apresentam verdade mais plenamente cumprida do que no Antigo.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 9, 'CERTO_ERRADO', 'O símbolo é uma figura, objeto, número ou emblema, cuja imagem representa, de modo sensível, uma verdade moral, ou religiosa.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 10, 'CERTO_ERRADO', 'De acordo com o contexto o fogo pode simbolizar a presença do Senhor.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 11, 'CERTO_ERRADO', 'Os milagres de Cristo revestem-se de um decidido fator tipológico.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 12, 'CERTO_ERRADO', 'Profeta é um porta-voz de Deus que declara a vontade de Deus ao povo.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 13, 'CERTO_ERRADO', 'Cumprimento evolutivo, refere-se à concretização de uma profecia específica, abrangente em diversas fases progressivas.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 14, 'CERTO_ERRADO', 'Princípios religiosos devem constantemente ser adaptados para enfrentar desafios culturais', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 15, 'CERTO_ERRADO', 'Paulo se sentiu constrangido em fazer uso da contextualização como ferramenta de evangelização.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 16, 'CERTO_ERRADO', 'A igreja primitiva seguiu o padrão judaico da contextualização da Torá.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 17, 'CERTO_ERRADO', 'Verdades bíblicas não são absolutas e não devem permanecer invioláveis em qualquer comunicação transcultural.', null::jsonb, 'E'),
  ('hermeneutica-teste-4', 18, 'CERTO_ERRADO', 'Os textos têm somente um significado, mas podem ter muitas aplicações.', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 19, 'CERTO_ERRADO', 'O significado de um mandamento comportamental na Bíblia não pode ser averiguado à parte do contexto desse mandamento', null::jsonb, 'C'),
  ('hermeneutica-teste-4', 20, 'CERTO_ERRADO', 'Se um princípio é transcultural, estude a natureza da aplicação comportamental em nossa cultura.', null::jsonb, 'C')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
