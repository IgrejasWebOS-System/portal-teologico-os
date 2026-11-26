-- 147_provas_publicas_bibliologia.sql
-- 26/11/2026, pedido do Joaquim: fazer as provas que faltam, uma materia por vez (Basico primeiro),
-- validar em staging e so depois subir para producao. Esta e a Bibliologia (B10, Curso Basico).
-- Mesma rotina de 123 (Escatologia), 127 (Lideranca Crista) e 144 (Missiologia/Etica): alimenta
-- provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Bibliologia: Testes 1 a 4 -> /prova-publica/bibliologia-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Bibliologia - TESTEn - LICOES x E y.pdf" (curso-basico\B10 Bibliologia),
-- conferido pagina a pagina contra a imagem. Gabarito: "BIBLIOLOGIA - GABARITO TESTE.pdf" (secao TESTES PARCIAIS).
-- O enunciado segue o PDF impresso (sem corrigir digitacao do original); unica correcao: Teste 1 q.6, "imutave"
-- esta cortado na margem do PDF e foi gravado como "imutavel".
-- Questoes de "Associe as Colunas" entram como ASSOCIACAO_COLUNAS (lista suspensa com as opcoes da coluna B).
-- lesson_id: buscado pelo titulo da materia (cada banco tem o seu UUID); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like
-- 'bibliologia-teste-%' (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Bibliologia', 'Teste 1 - Lições 1 e 2', 1, 'bibliologia-teste-1', (select id from public.lessons where title = 'Bibliologia' order by created_at limit 1)),
  ('Bibliologia', 'Teste 2 - Lições 3 e 4', 2, 'bibliologia-teste-2', (select id from public.lessons where title = 'Bibliologia' order by created_at limit 1)),
  ('Bibliologia', 'Teste 3 - Lições 5 e 6', 3, 'bibliologia-teste-3', (select id from public.lessons where title = 'Bibliologia' order by created_at limit 1)),
  ('Bibliologia', 'Teste 4 - Lições 7 e 8', 4, 'bibliologia-teste-4', (select id from public.lessons where title = 'Bibliologia' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('bibliologia-teste-1', 1, 'CERTO_ERRADO', 'Atribui-se a João Calvino a disseminação do uso do vocábulo “Bíblia” para se referir à Palavra de Deus', null::jsonb, 'E'),
  ('bibliologia-teste-1', 2, 'CERTO_ERRADO', 'Deus revela-Se também através da Palavra Escrita.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 3, 'CERTO_ERRADO', 'A Bíblia é absolutamente necessaria para alcançarmos a vida eterna.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 4, 'CERTO_ERRADO', 'Conforme escreveu Paulo a Timóteo somente as Escrituras são aptas para o aperfeiçoamento do salvo diante de Deus', null::jsonb, 'C'),
  ('bibliologia-teste-1', 5, 'CERTO_ERRADO', 'Os Dez Mandamentos, foram formulados pelos homens na tentativa de aprimorar a sociedade', null::jsonb, 'E'),
  ('bibliologia-teste-1', 6, 'CERTO_ERRADO', 'A Palavra de Deus se faz necessária à humanidade, pois sua lei moral é parcial e imutável', null::jsonb, 'E'),
  ('bibliologia-teste-1', 7, 'CERTO_ERRADO', 'A história não é cíclica: é circular; não se repete.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 8, 'CERTO_ERRADO', 'Na Bíblia vemos que a história da humanidade e seus acontecimentos mais relevantes jamais foram obras do acaso.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 9, 'CERTO_ERRADO', 'Sem a existência da Bíblia a literatura humana não seria tão rica e expressiva.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 10, 'CERTO_ERRADO', 'A Bíblia é, portanto, um dos o livro contemporâneo de toda a humanidade, em todas as eras', null::jsonb, 'E'),
  ('bibliologia-teste-1', 11, 'CERTO_ERRADO', 'O Liberalismo Teológico é uma corrente teológica que nasceu na França.', null::jsonb, 'E'),
  ('bibliologia-teste-1', 12, 'CERTO_ERRADO', 'O racionalismo é uma teoria filosófica que dá a prioridade ao metodo.', null::jsonb, 'E'),
  ('bibliologia-teste-1', 13, 'CERTO_ERRADO', 'Os teólogos adeptos do racionalismo professavam sua fé na razão.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 14, 'CERTO_ERRADO', 'Emil Brunner, aliás, chegou a alcunhar a Palavra de Deus de “papa de papel”.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 15, 'CERTO_ERRADO', 'Os cristãos primitivos tinham os patriarcas hebreus como oráculos de Deus.', null::jsonb, 'E'),
  ('bibliologia-teste-1', 16, 'CERTO_ERRADO', 'Marcião de Sinope propôs seu sistema teológico chamado marcionismo.', null::jsonb, 'C'),
  ('bibliologia-teste-1', 17, 'ASSOCIACAO_COLUNAS', 'A Bíblia é a Palavra de Deus', '["A – Neo-Ortodoxa", "B – Conservadora"]'::jsonb, 'B'),
  ('bibliologia-teste-1', 18, 'ASSOCIACAO_COLUNAS', 'Ao ler a Bíblia, tem um encontro pessoal com o Senhor.', '["A – Neo-Ortodoxa", "B – Conservadora"]'::jsonb, 'A'),
  ('bibliologia-teste-1', 19, 'ASSOCIACAO_COLUNAS', 'Barth', '["A – Neo-Ortodoxa", "B – Conservadora"]'::jsonb, 'A'),
  ('bibliologia-teste-1', 20, 'ASSOCIACAO_COLUNAS', 'A Bíblia é soberana', '["A – Neo-Ortodoxa", "B – Conservadora"]'::jsonb, 'B'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('bibliologia-teste-2', 1, 'CERTO_ERRADO', 'A Bíblia Sagrada é um livro de dupla autoria.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 2, 'CERTO_ERRADO', 'O Espírito Santo inspirou e capacitou cerca de quarenta diferentes autores da Bíblia.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 3, 'CERTO_ERRADO', 'A canonicidade dos livros da Bíblia repousa sobre o assentimento intelectual dos pais da igreja', null::jsonb, 'E'),
  ('bibliologia-teste-2', 4, 'CERTO_ERRADO', 'A canonização significa “tornar divino”.', null::jsonb, 'E'),
  ('bibliologia-teste-2', 5, 'CERTO_ERRADO', 'O cânon da Bíblia, como nós o temos, é a única e infalível regra de fé e prática que deve ser adotada pela igreja por se tratar da Palavra de Deus.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 6, 'CERTO_ERRADO', 'O Cânon Bíblico não foi estabelecido por homens tementes a Deus e zelosos por Sua Palavra', null::jsonb, 'E'),
  ('bibliologia-teste-2', 7, 'CERTO_ERRADO', 'Os livros do Antigo Testamento sempre estiveram em disputa na antiga comunidade de Israel', null::jsonb, 'E'),
  ('bibliologia-teste-2', 8, 'CERTO_ERRADO', 'A palavra “inspiração” literalmente, significa: “aquilo que é dado pelo sopro de Deus”.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 9, 'CERTO_ERRADO', 'A palavra “inspirar” é “introduzir ar nos pulmões”.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 10, 'CERTO_ERRADO', 'Revelação é a ação de Deus pela qual Ele dá a conhecer ao escritor coisas já conhecidas', null::jsonb, 'E'),
  ('bibliologia-teste-2', 11, 'CERTO_ERRADO', 'O capítulo 15 de 1 Coríntios fala a respeito da ressurreição de Cristo.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 12, 'CERTO_ERRADO', 'Toda a Bíblia foi inspirada por Deus, e toda ela foi dada por revelação.', null::jsonb, 'E'),
  ('bibliologia-teste-2', 13, 'CERTO_ERRADO', 'A Bíblia é o único livro capaz de regenerar o individuo.', null::jsonb, 'C'),
  ('bibliologia-teste-2', 14, 'CERTO_ERRADO', 'Sem a Bíblia Sagrada, estaria a humanidade mergulhada em densas trevas espirituais e morais', null::jsonb, 'C'),
  ('bibliologia-teste-2', 15, 'ASSOCIACAO_COLUNAS', 'Partes da Bíblia são inspiradas, outras não.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'C'),
  ('bibliologia-teste-2', 16, 'ASSOCIACAO_COLUNAS', 'Escrita por genios.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'A'),
  ('bibliologia-teste-2', 17, 'ASSOCIACAO_COLUNAS', 'A inspiração é a mesma de quando oramos.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'B'),
  ('bibliologia-teste-2', 18, 'ASSOCIACAO_COLUNAS', 'Inspirou as ideias e não as palavras.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'E'),
  ('bibliologia-teste-2', 19, 'ASSOCIACAO_COLUNAS', 'Toda a Bíblia foi inspirada.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'F'),
  ('bibliologia-teste-2', 20, 'ASSOCIACAO_COLUNAS', 'Ditados mecanicamente.', '["A – Inspiração Natural Humana", "B - Inspiração Divina Comum", "C - Inspiração Parcial", "D – Ditado Verbal", "E - Inspiração das Ideias", "F - Inspiração Plenária"]'::jsonb, 'D'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('bibliologia-teste-3', 1, 'CERTO_ERRADO', 'A palavra “inerrância” significa, literalmente, que não comete erros; infalível.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 2, 'CERTO_ERRADO', 'Teologicamente a inerrância bíblica é a doutrina segundo a qual as Sagradas Escrituras contêm alguns erros', null::jsonb, 'E'),
  ('bibliologia-teste-3', 3, 'CERTO_ERRADO', 'Os filosofos seculares comecaram a por duvidas sobre a integridade da Bíblia a partir do iluminismo', null::jsonb, 'C'),
  ('bibliologia-teste-3', 4, 'CERTO_ERRADO', 'A discussão sobre a inerrância da Bíblia se acirrou com a teologia convencional.', null::jsonb, 'E'),
  ('bibliologia-teste-3', 5, 'CERTO_ERRADO', 'Os cinco primeiros artigos da Declaração de Chicago sintetizam a fé ortodoxa concernente à inerrância da Bíblia Sagrada.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 6, 'CERTO_ERRADO', 'Sendo total e plenariamente dadas pelo próprio Deus, as Escrituras estão isentas de erros', null::jsonb, 'C'),
  ('bibliologia-teste-3', 7, 'CERTO_ERRADO', 'A Bíblia Sagrada, como a inspirada e inerrante Palavra de Deus, vai de encontro à verdadeira filosofia', null::jsonb, 'E'),
  ('bibliologia-teste-3', 8, 'CERTO_ERRADO', 'A arqueologia vem sendo largamente utilizada para deturpar quão firme é a doutrina da inerrância bíblica', null::jsonb, 'E'),
  ('bibliologia-teste-3', 9, 'CERTO_ERRADO', 'A Bíblia é historicamente precisa.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 10, 'CERTO_ERRADO', 'Nenhuma profecia da Escritura é de particular interpretação.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 11, 'CERTO_ERRADO', 'Gegraptai - Esta alocução significa, literalmente, “está consumado”.', null::jsonb, 'E'),
  ('bibliologia-teste-3', 12, 'CERTO_ERRADO', 'Graphe - Este vocábulo é usado no Novo Testamento dando a Escritura importância normativa', null::jsonb, 'C'),
  ('bibliologia-teste-3', 13, 'CERTO_ERRADO', 'Martinho Lutero mostrou-se firme quanto à inerrância bíblica.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 14, 'CERTO_ERRADO', 'Tomás de Aquino disse em relação a Bíblia: “Creio firmemente que nenhum daqueles autores errou em qualquer aspecto quando escreveu”.', null::jsonb, 'E'),
  ('bibliologia-teste-3', 15, 'CERTO_ERRADO', 'A infabilidade é a qualidade, ou virtude, do que é infalível; é algo que jamais poderá falhar.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 16, 'CERTO_ERRADO', 'No Brasil, não se lançam suspeições sobre a infalibilidade das Sagradas Escrituras.', null::jsonb, 'E'),
  ('bibliologia-teste-3', 17, 'CERTO_ERRADO', 'A Bíblia, não é clara e cristalinamente simples.', null::jsonb, 'E'),
  ('bibliologia-teste-3', 18, 'CERTO_ERRADO', 'A clareza das Escrituras é uma das doutrinas mais admiráveis da Palavra do Senhor', null::jsonb, 'C'),
  ('bibliologia-teste-3', 19, 'CERTO_ERRADO', 'A clareza da Bíblia é uma de suas principais características através da qual se torna ela plenamente inteligível aos que se dispõe a examina-la com um coração reto.', null::jsonb, 'C'),
  ('bibliologia-teste-3', 20, 'CERTO_ERRADO', 'A Bíblia testemunha quanto a sua pureza.', null::jsonb, 'E'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('bibliologia-teste-4', 1, 'CERTO_ERRADO', 'A Bíblia não conhece limites; é suprema em matéria de fé e prática.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 2, 'CERTO_ERRADO', 'A autoridade da Biblia advém-lhe do fato de ela ser a inspirada, inerrante e infalível Palavra de Deus', null::jsonb, 'C'),
  ('bibliologia-teste-4', 3, 'CERTO_ERRADO', 'A Reforma Protestante resgatou, no seio da cristandade a liberdade de expressão.', null::jsonb, 'E'),
  ('bibliologia-teste-4', 4, 'CERTO_ERRADO', 'Os reformadores recolocaram as Sagradas Escrituras no lugar onde elas sempre deveriam estar, no púlpito da igreja', null::jsonb, 'E'),
  ('bibliologia-teste-4', 5, 'CERTO_ERRADO', 'A Bíblia é a palavra final em matéria de fé e prática.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 6, 'CERTO_ERRADO', 'Completude é qualidade, estado ou propriedade do que é completo, perfeito, acabado.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 7, 'CERTO_ERRADO', 'A Bíblia, pois, necessita de acréscimos.', null::jsonb, 'E'),
  ('bibliologia-teste-4', 8, 'CERTO_ERRADO', 'Afirma o apóstolo João que consideremos anátema a quem anunciar outro Evangelho.', null::jsonb, 'E'),
  ('bibliologia-teste-4', 9, 'CERTO_ERRADO', 'Hank Hanegraaff, utilizou a palavra site, em inglês, mostra como devemos interpretar as Sagradas Escrituras.', null::jsonb, 'E'),
  ('bibliologia-teste-4', 10, 'CERTO_ERRADO', 'Na interpretação da Bíblia, podemos contar com iluminação do Espirito Santo.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 11, 'CERTO_ERRADO', 'Na interpretação da Bíblia, levemos em consideração que foi ela escrita de conformidade com as regras gramaticais.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 12, 'CERTO_ERRADO', 'Na Bíblia seus escritores não expressaram a sua forma de escrever, sua gramática, seu estilo e características literárias', null::jsonb, 'E'),
  ('bibliologia-teste-4', 13, 'CERTO_ERRADO', 'É de suma importância ao leitor das Escrituras conhecerem as regras básicas da gramática e da sintaxe.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 14, 'CERTO_ERRADO', 'A Bíblia foi escrita num contexto histórico-cultural específico.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 15, 'CERTO_ERRADO', 'Os escritores bíblicos viveram em épocas e condições diferentes.', null::jsonb, 'C'),
  ('bibliologia-teste-4', 16, 'ASSOCIACAO_COLUNAS', 'Legislador', '["A - Salomão", "B - Daniel", "C - Samuel", "D - Lucas", "E - Moisés"]'::jsonb, 'E'),
  ('bibliologia-teste-4', 17, 'ASSOCIACAO_COLUNAS', 'Profetas', '["A - Salomão", "B - Daniel", "C - Samuel", "D - Lucas", "E - Moisés"]'::jsonb, 'C'),
  ('bibliologia-teste-4', 18, 'ASSOCIACAO_COLUNAS', 'Reis', '["A - Salomão", "B - Daniel", "C - Samuel", "D - Lucas", "E - Moisés"]'::jsonb, 'A'),
  ('bibliologia-teste-4', 19, 'ASSOCIACAO_COLUNAS', 'Estadista', '["A - Salomão", "B - Daniel", "C - Samuel", "D - Lucas", "E - Moisés"]'::jsonb, 'B'),
  ('bibliologia-teste-4', 20, 'ASSOCIACAO_COLUNAS', 'Médico', '["A - Salomão", "B - Daniel", "C - Samuel", "D - Lucas", "E - Moisés"]'::jsonb, 'D')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
