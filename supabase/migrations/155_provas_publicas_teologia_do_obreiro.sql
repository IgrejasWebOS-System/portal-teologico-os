-- 155_provas_publicas_teologia_do_obreiro.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online de Teologia do Obreiro (M10, Curso Medio), Testes 1 a 4 (20 questoes cada).
--   Teologia do Obreiro: /prova-publica/teologia-do-obreiro-teste-1..4
-- Texto: PDFs "Teologia Obreiro - TESTEn - LICOES x E y.pdf" (curso-medio\M10), lidos pagina a pagina, sem corrigir digitacao do original.
-- Gabarito: planilha "GABARITO GERAIS MEDIO.xlsx", aba M10. Testes 1 a 3 = colunas TESTE 1 a 3. TESTE 4: a unica prova impressa restante (arquivos TESTE4/TESTE5, identicos) bate 20/20
-- com a coluna rotulada TESTE 5 da planilha; mesmo criterio ja aprovado pelo Joaquim em Missiologia (migration 154). A coluna TESTE 4 e ignorada. Conferido por script.
-- Associacao entra como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra). lesson_id: buscado pelo inicio do titulo; null se nao existir.
-- Idempotente. Reversao: delete from provas_publicas where slug like 'teologia-do-obreiro-teste-%' (so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Teologia do Obreiro', 'Teste 1 - Lições 1 e 2', 1, 'teologia-do-obreiro-teste-1', (select id from public.lessons where title ilike 'Teologia do Obreiro%' order by created_at limit 1)),
  ('Teologia do Obreiro', 'Teste 2 - Lições 3 e 4', 2, 'teologia-do-obreiro-teste-2', (select id from public.lessons where title ilike 'Teologia do Obreiro%' order by created_at limit 1)),
  ('Teologia do Obreiro', 'Teste 3 - Lições 5 e 6', 3, 'teologia-do-obreiro-teste-3', (select id from public.lessons where title ilike 'Teologia do Obreiro%' order by created_at limit 1)),
  ('Teologia do Obreiro', 'Teste 4 - Lições 7 e 8', 4, 'teologia-do-obreiro-teste-4', (select id from public.lessons where title ilike 'Teologia do Obreiro%' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('teologia-do-obreiro-teste-1', 1, 'ASSOCIACAO_COLUNAS', 'A pessoa se oferece', '["A - Chamada Divina", "B - Chamada Humana", "C - A Chamada Própria"]'::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 2, 'ASSOCIACAO_COLUNAS', 'É Deus quem chama', '["A - Chamada Divina", "B - Chamada Humana", "C - A Chamada Própria"]'::jsonb, 'A'),
  ('teologia-do-obreiro-teste-1', 3, 'ASSOCIACAO_COLUNAS', 'Convite humano', '["A - Chamada Divina", "B - Chamada Humana", "C - A Chamada Própria"]'::jsonb, 'B'),
  ('teologia-do-obreiro-teste-1', 4, 'CERTO_ERRADO', 'A chamada Divina não é uma incumbência dada por uma convenção ou Igreja.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 5, 'CERTO_ERRADO', 'A chamada para o ministério é definitiva, aquele que é chamado não pode impor condições', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 6, 'CERTO_ERRADO', 'A Chamada é imprescindível porque a igreja é o mistério de Deus.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-1', 7, 'CERTO_ERRADO', 'A Chamada é imprescindível pelas dificuldades encontradas na Obra.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 8, 'CERTO_ERRADO', 'A capacitação vem antes do chamamento.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-1', 9, 'CERTO_ERRADO', 'Devemos buscar a capacitação em Deus.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 10, 'CERTO_ERRADO', 'A confirmação é algo de suma importância para aquele que tem a Chamada.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 11, 'CERTO_ERRADO', 'A delegação de poder dada ao obreiro para exercer sua Chamada parte de Deus', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-1', 12, 'CERTO_ERRADO', 'A vida com Deus só pode ser vivida pelo novo nascimento.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 13, 'CERTO_ERRADO', 'A Regeneração é o ato pelo qual Deus concede nova vida ao pecador penitente.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-1', 14, 'CERTO_ERRADO', 'Antes de ministrar aos outros, o obreiro precisa ser ministrado por Deus.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 15, 'ASSOCIACAO_COLUNAS', 'Deus como Pai', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'A'),
  ('teologia-do-obreiro-teste-1', 16, 'ASSOCIACAO_COLUNAS', 'Totalmente transformados', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 17, 'ASSOCIACAO_COLUNAS', 'Filhos do Rei', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'A'),
  ('teologia-do-obreiro-teste-1', 18, 'ASSOCIACAO_COLUNAS', 'Ato imediato', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'B'),
  ('teologia-do-obreiro-teste-1', 19, 'ASSOCIACAO_COLUNAS', 'Seremos perfeitos', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'C'),
  ('teologia-do-obreiro-teste-1', 20, 'ASSOCIACAO_COLUNAS', 'Nossa posição em Cristo', '["A - Adoção", "B - Santificação", "C - Glorificação"]'::jsonb, 'B'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('teologia-do-obreiro-teste-2', 1, 'CERTO_ERRADO', 'O filho quer seja criança, quer seja jovem, precisa de cuidados paternais', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 2, 'CERTO_ERRADO', 'Governar bem a própria casa é só manter a ordem e a disciplina.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 3, 'CERTO_ERRADO', 'A razão primeira da união entre um homem e uma mulher é a necessidade de procriação', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 4, 'CERTO_ERRADO', 'O obreiro cristão tem o dever de manter um relacionamento sexual correto e saudável com a sua esposa', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 5, 'CERTO_ERRADO', 'Como SACERDOTE do lar o obreiro tem o dever de conduzir seus filhos.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 6, 'CERTO_ERRADO', 'Como profeta do lar, o obreiro deve ensinar a seus filhos os caminhos do temor e da obediência a Deus.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 7, 'CERTO_ERRADO', 'O cabeça como diretor do corpo representa poder.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 8, 'CERTO_ERRADO', 'A despeito dos dissabores, a esposa do obreiro é a sua melhor auxiliar.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 9, 'CERTO_ERRADO', 'O maior sermão que a mulher do obreiro pode e deve pregar, é o sermão da Montanha', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 10, 'CERTO_ERRADO', 'A esposa do Obreiro não lhe cabe tomar decisões por seu marido.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 11, 'CERTO_ERRADO', 'O Obreiro (líder) é apenas um dirigente de culto ou Pregador.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 12, 'CERTO_ERRADO', 'João disse: A seara é grande e os Obreiros são poucos.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 13, 'CERTO_ERRADO', 'O Obreiro que dizima tem autoridade quando for ensinar sobre dízimos.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 14, 'CERTO_ERRADO', 'O Obreiro é um consumidor em potencial como as demais pessoas.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 15, 'CERTO_ERRADO', 'O orçamento doméstico não deve preocupar o Obreiro.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 16, 'CERTO_ERRADO', 'O Obreiro tem que se cuidar para não ter seu ministério censurado.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 17, 'CERTO_ERRADO', 'A Bíblia não condena a poligamia.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-2', 18, 'CERTO_ERRADO', 'O Obreiro deve ser cuidadoso, atento e precavido.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 19, 'CERTO_ERRADO', 'O Obreiro deve evitar hospedar alguém que desconhece.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-2', 20, 'CERTO_ERRADO', 'O bom testemunho do Obreiro é a sua maior pregação.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('teologia-do-obreiro-teste-3', 1, 'CERTO_ERRADO', 'A instituição do diaconato surgiu na Igreja Primitiva por uma necessidade de cunho moral', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 2, 'CERTO_ERRADO', 'A palavra de Deus traduz o termo "diácono" como serviço.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 3, 'CERTO_ERRADO', 'A vocação é uma inclinação para exercer uma determinada profissão.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 4, 'CERTO_ERRADO', 'Ser cheio do Espirito é estar embriagado por Ele.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 5, 'CERTO_ERRADO', 'Sabedoria é algo concedido por Deus, mas não necessário para o ofício do diaconato', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 6, 'CERTO_ERRADO', 'Língua dobre significa retidão.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 7, 'CERTO_ERRADO', 'O diácono deve ser uma pessoa de fé, pois a fé em si já é fruto de prova.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 8, 'CERTO_ERRADO', 'O diácono é o provedor do bem-estar moral da igreja.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 9, 'CERTO_ERRADO', 'O diácono goza da confiança só do pastorado.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 10, 'CERTO_ERRADO', 'O diaconato é uma obra voluntária feita no amor que Deus.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 11, 'CERTO_ERRADO', 'O diaconato é necessário as igrejas que não possuem um departamento de assistência social', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 12, 'CERTO_ERRADO', 'O diácono deve tomar o devido cuidado para não exercer funções episcopais.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 13, 'CERTO_ERRADO', 'Presbítero, o termo deriva de uma palavra grega que significa "um homem idoso"', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 14, 'CERTO_ERRADO', 'O ministro é chamado por Deus a uma posição de responsabilidade mais do que de privilégio', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 15, 'CERTO_ERRADO', 'O Presbítero é um tipo de obreiro que acarreta "ônus" financeiro à Igreja.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 16, 'CERTO_ERRADO', 'A reverência é um comportamento ético e temente que se espera do Presbítero.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 17, 'CERTO_ERRADO', 'A Igreja espera do Presbítero a cordialidade, o respeito, a atenção, a amizade.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 18, 'CERTO_ERRADO', 'A vida de oração não deve ser prioridade para o Presbítero.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-3', 19, 'CERTO_ERRADO', 'O Presbítero que estuda a palavra de Deus tem no Espírito Santo seu mestre.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-3', 20, 'CERTO_ERRADO', 'O Presbítero não precisa ter vida devocional para ter vantagem no ministério.', null::jsonb, 'E'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('teologia-do-obreiro-teste-4', 1, 'CERTO_ERRADO', 'O Obreiro, sem levar em conta o seu treinamento, não tem o privilégio de escolher se irá ou não aconselhar o seu povo', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 2, 'CERTO_ERRADO', 'A personalidade de Jesus não era básica ao seu estilo de ajuda.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 3, 'CERTO_ERRADO', 'O conselheiro sincero é "real", uma pessoa aberta e franca.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 4, 'CERTO_ERRADO', 'Empatia é a capacidade de "pensar com".', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 5, 'CERTO_ERRADO', 'O Rebanho é alimentado pelo ensino da Palavra de Deus.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 6, 'CERTO_ERRADO', 'Dentre os objetivos para o ensino bíblico aos crentes destacamos o de fazê-los guardar a verdade', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 7, 'CERTO_ERRADO', 'A disciplina não é necessária para o bem do culpado.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 8, 'CERTO_ERRADO', 'Saber aplicar a discliplina não faz diferença na vida de um Obreiro.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 9, 'CERTO_ERRADO', 'O justiça do Obreiro é o ingrediente mais importante do seu ensino.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 10, 'CERTO_ERRADO', 'A imoralidade sexual de um líder trará sobre ele vergonha que dificilmente se apagará', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 11, 'CERTO_ERRADO', 'O Obreiro e seus ajudantes devem ter compromisso com a Bíblia.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 12, 'CERTO_ERRADO', 'O Pastor deve esperar perfeição de seus Obreiros.', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 13, 'CERTO_ERRADO', 'O relacionamento humano é das mais obscuras áreas do comportamento.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 14, 'CERTO_ERRADO', 'Felizmente, é cada vez mais comum os cursos de formação de obreiros.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 15, 'CERTO_ERRADO', 'Os homens que recebem a tarefa de lecionar aos candidatos ao ministério, necessitam serem íntegros', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 16, 'CERTO_ERRADO', 'A capacidade intelectual do formador de obreiros influi indiretamente sobre a qualidade do corpo ministerial da igreja', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 17, 'CERTO_ERRADO', 'A primeira pergunta que os líderes eclesiásticos devem fazer, antes da consagração de obreiros, e esta: "Qual cargo será ocupado? "', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 18, 'CERTO_ERRADO', 'A consagração ou o reconhecimento ministerial de indivíduos deve obedecer ao critério Eclesiastico', null::jsonb, 'E'),
  ('teologia-do-obreiro-teste-4', 19, 'CERTO_ERRADO', 'Delegar é a comissão que se outorga a alguém para agir em nome de outrem.', null::jsonb, 'C'),
  ('teologia-do-obreiro-teste-4', 20, 'CERTO_ERRADO', 'A principal função do líder é a formação de novos lideres.', null::jsonb, 'C')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
