-- 127_provas_publicas_lideranca_crista.sql
--
-- Novas provas públicas (link + CPF, módulo criado em 123) para a matéria
-- Liderança Cristã — mesma rotina já usada para Escatologia Bíblica
-- (123_provas_publicas_link_cpf.sql): não cria tabela nova nenhuma, só
-- alimenta provas_publicas/provas_publicas_questoes com mais uma matéria.
--
-- Fonte: pasta C:\Projetos\portal-teologico-os-documentos\GABARITO PROVAS\
-- lideranca crista- uma inspiracao divina\ (Testes 1 a 5, lições 1-2, 3-4,
-- 5-6, 7-8, 9-10 — 20 questões Certo/Errado cada, sem Associação de
-- Colunas desta vez) + "Lideranca Crista - GABARITO A5.pdf" (seção
-- "TESTES PARCIAIS", que já traz o gabarito teste a teste, igual ao que
-- ESCATOLOGIA GABARITO.pdf trazia) — gabarito conferido questão a questão
-- contra os PDFs originais dos 5 testes.
--
-- lesson_id: UUID real de produção (toduvwtzklntyptcodkf) da lição
-- "Liderança Cristã" (confirmado por consulta direta, mesmo critério usado
-- em 123 para Escatologia).
insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Liderança Cristã', 'Teste 1 - Lições 1 e 2', 1, 'lideranca-crista-teste-1', '1e4781b3-ff58-4e1c-a476-6c64d881017b'),
  ('Liderança Cristã', 'Teste 2 - Lições 3 e 4', 2, 'lideranca-crista-teste-2', '1e4781b3-ff58-4e1c-a476-6c64d881017b'),
  ('Liderança Cristã', 'Teste 3 - Lições 5 e 6', 3, 'lideranca-crista-teste-3', '1e4781b3-ff58-4e1c-a476-6c64d881017b'),
  ('Liderança Cristã', 'Teste 4 - Lições 7 e 8', 4, 'lideranca-crista-teste-4', '1e4781b3-ff58-4e1c-a476-6c64d881017b'),
  ('Liderança Cristã', 'Teste 5 - Lições 9 e 10', 5, 'lideranca-crista-teste-5', '1e4781b3-ff58-4e1c-a476-6c64d881017b')
on conflict (slug) do nothing;

-- TESTE 1 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'Há diferença entre liderar povo de Deus e pessoas não cristã.', 'C'),
  (2, 'Para se ter sucesso espiritual na liderança, o lider deve ter um projeto pessoal de marketing.', 'E'),
  (3, 'O lider tem que influenciar negativamente as pessoas.', 'E'),
  (4, 'Davi deixou um bom exemplo de liderança para nós.', 'C'),
  (5, 'O líder tem que ter em mente que ele pode não conseguir praticar todas as regras para se tornar um grande líder.', 'C'),
  (6, 'O líder não precisa estabelecer alvos para sua vida pessoal.', 'E'),
  (7, 'Se o lider buscar a Deus, terá orientação para avançar e ter sucesso na liderança.', 'C'),
  (8, 'Quando líder tem convicção de seu papel, ele procura dar o melhor de si mesmo.', 'C'),
  (9, 'O líder deve exercer influência planejada que é o discipulado.', 'C'),
  (10, 'O líder deve subestimar as qualidades do discípulo, pois estão aprendendo.', 'E'),
  (11, 'O lider não precisa ter pensamentos otimistas para liderar.', 'E'),
  (12, 'O líder não precisa demonstrar sinceridade.', 'E'),
  (13, 'O líder que pratica o autoconhecimento sabe pra onde vai e o porquê vai.', 'C'),
  (14, 'É o componente da inteligência emocional que evita que tornemos prisioneiro de nossos sentimentos.', 'C'),
  (15, 'O autocontrole é importante para o líder porque demonstra controle dos sentimentos e impulsos.', 'C'),
  (16, 'O lider tem que ficar atento aos sinais de autocontrole motivacional.', 'E'),
  (17, 'Para identificar um lider motivado, é ver que ele tem alto salário.', 'E'),
  (18, 'A globalização não é importante para o líder.', 'E'),
  (19, 'A destreza social é uma questão de cordialidade com propósito.', 'C'),
  (20, 'A destreza social permite que líderes ponham a inteligência emocional em funcionamento.', 'C')
) as q(ordem, enunciado, resposta)
where p.slug = 'lideranca-crista-teste-1'
on conflict (prova_id, ordem) do nothing;

-- TESTE 2 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'As vezes a chamada para a liderança pode demorar um pouco.', 'C'),
  (2, 'Jesus nos ensina uma inversão na questão da liderança.', 'C'),
  (3, 'A liderança é uma plataforma de lançamento é levar pessoas a serem omissas.', 'E'),
  (4, 'O Senhor te vê, sabe onde você está.', 'C'),
  (5, 'O Senhor chama e capacita, independente de suas limitações.', 'C'),
  (6, 'Não é obrigatório que o lider tenha dons, mas nem todos que tem dons é obrigado a ser lider.', 'E'),
  (7, 'O líder valoriza o caráter e o dom valoriza o carisma.', 'C'),
  (8, 'O lider tem que ter convicção que sem os dons não se pode agradar a Deus.', 'E'),
  (9, 'Ser líder é ser um principe na casa de Deus.', 'E'),
  (10, 'O líder entende que o serviço de mordomo do reino é constante e gera grandes privilégios.', 'E'),
  (11, 'É muito importante o lider conhecer profundamente as pessoas e seus temperamentos.', 'C'),
  (12, 'As pessoas sanguineas, são mais extrovertidas.', 'C'),
  (13, 'O sanguineo muitas vezes repreende as pessoas independente do seu grau hierarquico.', 'C'),
  (14, 'O colérico não é considerado um lider natural, otimista, persistente e firme.', 'E'),
  (15, 'O colérico não demonstra ser tóxico, nem corrói o ambiente e demonstra ser sarcástico.', 'E'),
  (16, 'O apostolo Paulo era uma pessoa colérica.', 'C'),
  (17, 'A pessoa de temperamento melancólico tem total capacidade de viver e experimentar todas as emoções.', 'C'),
  (18, 'O temperamento melancólico não é o mais talentoso, mais perfeccionista por natureza.', 'C'),
  (19, 'O temperamento fleumático é aquele que demonstra uma impressão agradável.', 'E'),
  (20, 'Pelo lado negativos, os fleumáticos são intransigentes, indecisos e pão duro.', 'E')
) as q(ordem, enunciado, resposta)
where p.slug = 'lideranca-crista-teste-2'
on conflict (prova_id, ordem) do nothing;

-- TESTE 3 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'Se você tiver uma boa visão da vida, vai ter ânimo.', 'C'),
  (2, 'Para ser um bom líder, tem que analisar e escolher a pessoa que você quer por perto.', 'C'),
  (3, 'A prudencia é um dom do ser humano.', 'E'),
  (4, 'A prudencia faz você canalizar energia para algo mais intuitivo.', 'E'),
  (5, 'Prudente é aquela pessoa que busca evitar o dano e erro.', 'C'),
  (6, 'A pessoa medrosa, é dominado pelo medo.', 'C'),
  (7, 'A pessoa corajosa, não domina o medo, mas resiste ao medo.', 'E'),
  (8, 'O pavor é um medo incontralovel que inibe o potencial.', 'C'),
  (9, 'Um dos elementos importante para sua liderança é a NOÇÃO DE DEUS.', 'E'),
  (10, 'A mente humana tem dois processos fundamentais.', 'C'),
  (11, 'A noção de Autoridade Divina para Liderar continua sendo uma questão de fé.', 'C'),
  (12, 'A primeira caracteristica de um lider é a obediencia.', 'C'),
  (13, 'A submissão à autoridade espiritual, deve ser com resalvas.', 'E'),
  (14, 'A Provisão tem objetivo de prover suporte, sustentação aos que estão debaixo de sua liderança.', 'C'),
  (15, 'A autoridade espiritual não determina as regras.', 'E'),
  (16, 'E inegociavel a liderança e autoridade espiritual que delega autoridade para outros.', 'C'),
  (17, 'A verdadeira autoridade espiritual, melhora a vida das pessoas.', 'C'),
  (18, 'Espírito forte de independencia faz com que as pessoas não se submetam a ninguem.', 'C'),
  (19, 'Quem se submete a autoridade espiritual dificilmente será reconhecido pelas pessoas.', 'E'),
  (20, 'Josué recebeu um nivel maior de autoridade do que Moises.', 'E')
) as q(ordem, enunciado, resposta)
where p.slug = 'lideranca-crista-teste-3'
on conflict (prova_id, ordem) do nothing;

-- TESTE 4 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'O profeta Daniel foi uma pessoa de vida vitoriosa.', 'C'),
  (2, 'O lider precisa de firmeza e manter sua decisão e atitude.', 'C'),
  (3, 'Nem sempre sua liderança requer atitudes inusitadas.', 'E'),
  (4, 'Daniel era uma pessoa amiga, agradavel, bondosa e misericordiosa.', 'C'),
  (5, 'A fidelidade é a chave pela qual as pessoas vão se aproximar de você.', 'C'),
  (6, 'A fé deve ser aplicada diretamente em cada área da sua vida.', 'C'),
  (7, 'O ânimo produz a mobilização.', 'E'),
  (8, 'A vitória não tem seu custo embutido.', 'E'),
  (9, 'Todo ser humano ja sofreu derrota em sua trajetoria.', 'C'),
  (10, 'A luta nos deixa mais preparado para vida.', 'C'),
  (11, 'O alerta destaca a importância de uma liderança ética.', 'C'),
  (12, 'O lider deve descansar, levar a vida de forma leve.', 'C'),
  (13, 'A vida deve ser suportada e não aproveitada.', 'E'),
  (14, 'Para liderar seres humanos, não se requer habilidades.', 'E'),
  (15, 'Sua liderança não pode ser para oprimir mas, para que você desenvolva as pessoas.', 'C'),
  (16, 'O lider isolado é uma pessoa que nem vê a decadência.', 'C'),
  (17, 'O lider pode liderar sozinho sem ouvir ninguem.', 'E'),
  (18, 'A liderença nao é imposta, mas sim atrativa.', 'C'),
  (19, 'Jesus deve entrar no centro de sua lidernaça.', 'C'),
  (20, 'Uma coisa é você ter ideia do que o povo pensa de voce e outra coisa é o que sei que sou.', 'C')
) as q(ordem, enunciado, resposta)
where p.slug = 'lideranca-crista-teste-4'
on conflict (prova_id, ordem) do nothing;

-- TESTE 5 (20 Certo/Errado)
insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, resposta_correta)
select p.id, q.ordem, 'CERTO_ERRADO', q.enunciado, q.resposta
from public.provas_publicas p
cross join (values
  (1, 'Os líderes devem ser capazes de tomar decisões rápidas e baseadas em fatos.', 'C'),
  (2, 'Crise é uma situação desfavoravel, difícil, ápice de um problema, uma conjutura desfavorável.', 'C'),
  (3, 'Crise é um processo final que o leva a vitória.', 'E'),
  (4, 'A Crise é um ótimo aluno, é um tempo especial para você aprender.', 'E'),
  (5, 'A crise é uma oportunidade para depender de Deus.', 'C'),
  (6, 'A sua liderança não precisa ser dependente de Deus para vencer a crise.', 'E'),
  (7, 'A crise te monstra uma oportunidade de conquista.', 'C'),
  (8, 'Nos momentos de crise, adore ao Senhor certo de que Ele suprirá toda a sua necessidade.', 'C'),
  (9, 'Deus se manifesta na sua liderança quando você colhe.', 'E'),
  (10, 'A crise é um campo fértil para Deus agir.', 'C'),
  (11, 'Se você semear em tempo de crise sua colheita será extraordinária.', 'C'),
  (12, 'Lideres de Excelencia alcançam resultados notáveis em suas posições de liderança.', 'C'),
  (13, 'Deus é a garantia de vitória em sua liderança.', 'C'),
  (14, 'Deus deixa com o homem o que é para o homem fazer.', 'C'),
  (15, 'O lider sabe quem é o senhor, porem não sabe quem é o servo.', 'E'),
  (16, 'Saber quem manda e quem obedece, este é o segredo da liderança em relação a Deus.', 'C'),
  (17, 'Para que sua liderança seja um sucesso obedeça a voz do mestre.', 'C'),
  (18, 'Quando falamos em seguir a visão, queremos dizer que é seguir a visão individual.', 'E'),
  (19, 'Não se deve seguir a visão de ninguem, somente a sua.', 'E'),
  (20, 'Para ser líder não precisa estar sob a liderança de ninguem.', 'E')
) as q(ordem, enunciado, resposta)
where p.slug = 'lideranca-crista-teste-5'
on conflict (prova_id, ordem) do nothing;
