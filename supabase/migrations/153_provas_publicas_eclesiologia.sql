-- 153_provas_publicas_eclesiologia.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Medio que ja tem gabarito oficial.
-- Esta e Eclesiologia (M5, Curso Medio). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Eclesiologia: Testes 1 a 4 -> /prova-publica/eclesiologia-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Eclesiologia - TESTEn - LICOES x E y.pdf" (curso-medio\M5), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS MEDIO.xlsx" (aba M5, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original. O Teste Geral (recuperacao) nao entra.
-- Associacao entra como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo inicio do titulo da aula (cada banco tem o seu UUID; o titulo oficial pode ter sufixo); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'eclesiologia-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Eclesiologia', 'Teste 1 - Lições 1 e 2', 1, 'eclesiologia-teste-1', (select id from public.lessons where title ilike 'Eclesiologia%' order by created_at limit 1)),
  ('Eclesiologia', 'Teste 2 - Lições 3 e 4', 2, 'eclesiologia-teste-2', (select id from public.lessons where title ilike 'Eclesiologia%' order by created_at limit 1)),
  ('Eclesiologia', 'Teste 3 - Lições 5 e 6', 3, 'eclesiologia-teste-3', (select id from public.lessons where title ilike 'Eclesiologia%' order by created_at limit 1)),
  ('Eclesiologia', 'Teste 4 - Lições 7 e 8', 4, 'eclesiologia-teste-4', (select id from public.lessons where title ilike 'Eclesiologia%' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('eclesiologia-teste-1', 1, 'CERTO_ERRADO', 'A igreja é um grupo de pessoas convocados por Deus que deixaram à vida pecaminosa que levavam e se reúnem agora para adorá-Lo.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 2, 'CERTO_ERRADO', 'Igreja triunfante é aquela que ainda milita na terra e luta contra a carne, o mundo e o Diabo.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 3, 'CERTO_ERRADO', 'A Igreja é fruto da ação ativa e direta de Jesus.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 4, 'CERTO_ERRADO', 'A Igreja pertence a Jesus somente, isso porque Ele a edificou, a escolheu e a resgatou com seu próprio amor.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 5, 'CERTO_ERRADO', 'O governo que a Igreja exerce sobre seus membros é de natureza espiritual.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 6, 'CERTO_ERRADO', 'A Igreja deve sua existência ao fato de homem a ter escolhido.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 7, 'CERTO_ERRADO', 'A Igreja é descrita no Credo Apostólico como a "Comunhão dos Santos".', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 8, 'CERTO_ERRADO', 'A Igreja santa vive na realização do ideal de santidade.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 9, 'CERTO_ERRADO', 'A Igreja pertence a Cristo, porque Ele a recebeu com seu próprio sangue.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 10, 'CERTO_ERRADO', 'Ao sermos escolhidos, resgatados e edificados como Igreja em Cristo, tornamo-nos propriedade de Deus.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 11, 'CERTO_ERRADO', 'Cristo é o Cabeça da Igreja e a Igreja é Seu corpo.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 12, 'CERTO_ERRADO', 'A relação entre a Igreja e Cristo é de fato muito íntima; trata-se de uma espécie de união mecânica.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 13, 'CERTO_ERRADO', 'Como "noiva de Cristo", a Igreja não tem que "crescer na graça e no conhecimento do Senhor".', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 14, 'CERTO_ERRADO', 'Só conseguiremos produzir frutos, estando unidos a Cristo e vivendo em comunhão com Ele.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 15, 'CERTO_ERRADO', 'A nossa união com Cristo faz com que sejamos membros do Seu corpo, mas não membros uns dos outros.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 16, 'CERTO_ERRADO', 'Uma das maneiras de nos edificarmos é por meio da prática dos dons espirituais.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 17, 'CERTO_ERRADO', 'O termo "cristão" foi usado como apelido para descrever os membros da primeira igreja gentílica.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 18, 'CERTO_ERRADO', 'Peregrino é aquele que permanece por pouco tempo, em um lugar.', null::jsonb, 'C'),
  ('eclesiologia-teste-1', 19, 'CERTO_ERRADO', 'A Igreja aqui na terra deve ser vista primeiramente como uma associação.', null::jsonb, 'E'),
  ('eclesiologia-teste-1', 20, 'CERTO_ERRADO', 'O governo de Cristo sobre a Igreja tem como base o poder ou a demonstração de força.', null::jsonb, 'E'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('eclesiologia-teste-2', 1, 'CERTO_ERRADO', 'A Igreja, enquanto estiver aqui na Terra, é chamada por Deus a adorá-Lo.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 2, 'CERTO_ERRADO', 'Durante a adoração, o foco é a nossa colocação diante da presença do Deus Santo.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 3, 'CERTO_ERRADO', 'Através da oração, a Igreja representa a história sagrada e comemora os eventos salvíficos da história.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 4, 'CERTO_ERRADO', 'A Palavra nos dá o conhecimento de Deus e é a fonte da nossa direção que vem de Deus.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 5, 'CERTO_ERRADO', 'As duas ordenanças deixadas por Jesus à Sua Igreja são: o casamento e a celebração da Ceia do Senhor.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 6, 'CERTO_ERRADO', 'O objetivo do Governo eclesial é trazer ordem e disciplina na igreja local.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 7, 'CERTO_ERRADO', 'A unidade cristã deve ser baseada na biodiversidade.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 8, 'CERTO_ERRADO', 'A proclamação autêntica do Evangelho é outra marca indespensável para plantar e fazer crescer uma igreja saudável!.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 9, 'CERTO_ERRADO', 'O serviço cristão deve penetrar em todas as camadas da sociedade.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 10, 'CERTO_ERRADO', 'Os mártires da Igreja foram testemunhas fiéis de Jesus em palavras e atitudes.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 11, 'CERTO_ERRADO', 'Crescimento Espiritual é a dimensão mais desejada e explorada pelos evangélicos!.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 12, 'CERTO_ERRADO', 'A força motriz para o crescimento numérico da igreja local é a oração.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 13, 'CERTO_ERRADO', 'Crescimento orgânico tem a ver com desenvolvimento interno da igreja como organismo, comunidade e grupo social.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 14, 'CERTO_ERRADO', 'A dimensão orgânica aprecia e avalia questões de formação e mordomia, comunhão, relacionamentos e celebração.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 15, 'CERTO_ERRADO', 'Nem sempre novos líderes são necessários em todas as áreas da igreja, a todo tempo, em todo lugar.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 16, 'CERTO_ERRADO', 'A igreja local tem a necessidade de compreender e ampliar sua convicção sobre a fé cristã.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 17, 'CERTO_ERRADO', 'O crescimento conceitual é avaliado pela capacidade ideológica da igreja em relação às doutrinas essenciais da fé.', null::jsonb, 'E'),
  ('eclesiologia-teste-2', 18, 'CERTO_ERRADO', 'O crescimento diaconal compreende as esferas de ação da igreja no serviço ao próximo.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 19, 'CERTO_ERRADO', 'A dimensão diaconal se relaciona com o aspecto ético da igreja e sua missão integral.', null::jsonb, 'C'),
  ('eclesiologia-teste-2', 20, 'CERTO_ERRADO', 'A igreja deve entender que sua missão envolve a sensibilidade aos problemas dos outros.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('eclesiologia-teste-3', 1, 'ASSOCIACAO_COLUNAS', 'uma dupla missão.', '["A - A missão para com Deus", "B - A missão para consigo mesma", "C - A missão para com o mundo"]'::jsonb, 'C'),
  ('eclesiologia-teste-3', 2, 'ASSOCIACAO_COLUNAS', 'é adorar a Deus.', '["A - A missão para com Deus", "B - A missão para consigo mesma", "C - A missão para com o mundo"]'::jsonb, 'A'),
  ('eclesiologia-teste-3', 3, 'ASSOCIACAO_COLUNAS', 'edificação dos próprios membros.', '["A - A missão para com Deus", "B - A missão para consigo mesma", "C - A missão para com o mundo"]'::jsonb, 'B'),
  ('eclesiologia-teste-3', 4, 'CERTO_ERRADO', 'A igreja local experimenta crescimento biológico; por conversão, e por associação.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 5, 'CERTO_ERRADO', 'Só quando temos a certeza nítida do chamamento divino conseguiremos suportar as dificuldades do ministério.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 6, 'CERTO_ERRADO', 'Os pastores não são responsáveis pela guarda do rebanho e pela instrução das ovelhas de Cristo.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 7, 'CERTO_ERRADO', 'A libertinagem é o ensinamento de que a fé salvífica em Cristo é compatível com a prática da imoralidade.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 8, 'CERTO_ERRADO', 'O legalismo se constitui num acréscimo à obra meritória de Jesus.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 9, 'CERTO_ERRADO', 'Jesus deixou bem claro que para pertencer e ver o Reino é necessário ser batizado.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 10, 'CERTO_ERRADO', 'A pregação é o ápice do ministério da Igreja e a maior necessidade deste mundo.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 11, 'CERTO_ERRADO', 'A igreja-institucional define-se como lugar de comunhão, apoio, pertencimento, familiaridade, fraternidade.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 12, 'CERTO_ERRADO', 'A igreja-proclamadora preocupa-se com a evangelização das regiões mais carentes da cidade e o alcance dos povos não alcançados.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 13, 'CERTO_ERRADO', 'Onde um grupo se reúne em torno da pessoa de Cristo, sua Palavra, em oração, ali Deus está.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 14, 'CERTO_ERRADO', 'Uma característica da Igreja é o fato de que esta ouve a Palavra e responde em fé à sua mensagem.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 15, 'CERTO_ERRADO', 'A Igreja em relação a si própria, tem como missão edificar seus membros e discipliná-los com amor e segundo as orientações bíblicas.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 16, 'CERTO_ERRADO', 'A Igreja com respeito a Deus, sua missão consiste em adorá-Lo, dar-Lhe glória e temê-Lo', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 17, 'CERTO_ERRADO', 'A igreja evangélica brasileira esta blindada para as novidades no mercado da fé.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 18, 'CERTO_ERRADO', 'Nem sempre uma heresia é a negação exaustiva da verdade.', null::jsonb, 'C'),
  ('eclesiologia-teste-3', 19, 'CERTO_ERRADO', 'O evangelho que se prega hoje em várias vertentes evangélicas brasileiras está conforme aquele registrado nas páginas do Novo Testamento.', null::jsonb, 'E'),
  ('eclesiologia-teste-3', 20, 'CERTO_ERRADO', 'Uma das maiores necessidades dos evangélicos brasileiros é o discernimento bíblico e doutrinário.', null::jsonb, 'C'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('eclesiologia-teste-4', 1, 'ASSOCIACAO_COLUNAS', 'Gnosticismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'C'),
  ('eclesiologia-teste-4', 2, 'ASSOCIACAO_COLUNAS', 'Docetismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'A'),
  ('eclesiologia-teste-4', 3, 'ASSOCIACAO_COLUNAS', 'Apolinarismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'B'),
  ('eclesiologia-teste-4', 4, 'ASSOCIACAO_COLUNAS', 'Eutiquianismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'E'),
  ('eclesiologia-teste-4', 5, 'ASSOCIACAO_COLUNAS', 'Ebionismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'D'),
  ('eclesiologia-teste-4', 6, 'ASSOCIACAO_COLUNAS', 'Adocionismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'G'),
  ('eclesiologia-teste-4', 7, 'ASSOCIACAO_COLUNAS', 'Arianismo', '["A - significa aparência", "B - Cristo era divino, mas não humano", "C - defende um forte dualismo espírito/matéria", "D - significa \"pobre\"", "E - negava a humanidade de Cristo", "F - Cristo era apenas uma criatura", "G - simplesmente um homem virtuoso"]'::jsonb, 'F'),
  ('eclesiologia-teste-4', 8, 'CERTO_ERRADO', 'Ideologia é o conjunto de ideias que orienta as ações de uma pessoa ou grupo.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 9, 'CERTO_ERRADO', 'Para o pós-modernismo, a verdade é simplesmente "o que funciona para você".', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 10, 'CERTO_ERRADO', 'O Pluralismo Religioso é a crença de que toda religião é falsa.', null::jsonb, 'E'),
  ('eclesiologia-teste-4', 11, 'CERTO_ERRADO', 'Os pós-modernistas rejeitam não somente as leis objetivas de moral, como as leis morais interiores gravadas por Deus em nossos corações.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 12, 'CERTO_ERRADO', 'Para o pós-modernista, todas as religiões têm que abandonar a sua arrogância teológica.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 13, 'CERTO_ERRADO', 'Para o pós-modernista a verdade é alguma coisa absoluta, na mente de quem interpreta um texto, mas não no texto propriamente.', null::jsonb, 'E'),
  ('eclesiologia-teste-4', 14, 'CERTO_ERRADO', 'O relativismo cognitivo afirma que toda verdade é absoluta.', null::jsonb, 'E'),
  ('eclesiologia-teste-4', 15, 'CERTO_ERRADO', 'De todas as ideologias, o pós-modernismo é a mais danosa e a única da qual não há como esconder-se.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 16, 'CERTO_ERRADO', 'Por verdade objetiva, queremos dizer um código de leis sob o qual o ser humano tem que pautar a sua vida.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 17, 'CERTO_ERRADO', 'O silêncio e hipocrisia podem minar a verdade, e o cristianismo pode vir a cair no descrédito.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 18, 'CERTO_ERRADO', 'Heresia no sentido básico do termo é "imposição".', null::jsonb, 'E'),
  ('eclesiologia-teste-4', 19, 'CERTO_ERRADO', 'A concepção monarquianista negava a eternidade do Filho de Deus e o subordinava ao Pai.', null::jsonb, 'C'),
  ('eclesiologia-teste-4', 20, 'CERTO_ERRADO', 'Arianismo afirmava que o Filho é criatura do Pai, a primeira e a mais digna de todas.', null::jsonb, 'C')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
