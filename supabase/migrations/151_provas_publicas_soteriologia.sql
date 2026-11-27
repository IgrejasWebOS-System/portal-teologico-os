-- 151_provas_publicas_soteriologia.sql
-- 26/11/2026, pedido do Joaquim: publicar as provas online das materias do Curso Medio que ja tem gabarito oficial.
-- Esta e Soteriologia (M3, Curso Medio). Mesma rotina de 123/127/144/147 (docs/PROCEDIMENTO-PROVAS-PUBLICAS.md):
-- alimenta provas_publicas / provas_publicas_questoes (link publico + CPF, prova FIXA). Nao cria tabela, nao apaga nada.
--   Soteriologia: Testes 1 a 4 -> /prova-publica/soteriologia-teste-1..4
-- 4 testes x 20 questoes. Texto: PDFs "Soteriologia - TESTEn - LICOES x E y.pdf" (curso-medio\M3), lidos pagina a pagina.
-- Gabarito: planilha "GABARITO GERAIS MEDIO.xlsx" (aba M3, Testes 1 a 4), conferido contra este arquivo por script (80/80 iguais).
-- O enunciado segue o PDF impresso, sem corrigir digitacao do original. O Teste Geral (recuperacao) nao entra.
-- Associacao entra como ASSOCIACAO_COLUNAS (lista suspensa; resposta so a letra).
-- lesson_id: buscado pelo inicio do titulo da aula (cada banco tem o seu UUID; o titulo oficial pode ter sufixo); fica null se nao existir.
-- Idempotente (on conflict do nothing). Reversao: delete from provas_publicas where slug like 'soteriologia-teste-%'
-- (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Soteriologia', 'Teste 1 - Lições 1 e 2', 1, 'soteriologia-teste-1', (select id from public.lessons where title ilike 'Soteriologia%' order by created_at limit 1)),
  ('Soteriologia', 'Teste 2 - Lições 3 e 4', 2, 'soteriologia-teste-2', (select id from public.lessons where title ilike 'Soteriologia%' order by created_at limit 1)),
  ('Soteriologia', 'Teste 3 - Lições 5 e 6', 3, 'soteriologia-teste-3', (select id from public.lessons where title ilike 'Soteriologia%' order by created_at limit 1)),
  ('Soteriologia', 'Teste 4 - Lições 7 e 8', 4, 'soteriologia-teste-4', (select id from public.lessons where title ilike 'Soteriologia%' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  -- ===== Teste 1 - Licoes 1 e 2 =====
  ('soteriologia-teste-1', 1, 'CERTO_ERRADO', 'O Dia da Expiação era o segundo dia mais sagrado dos dias religiosos do calendário judaico.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 2, 'CERTO_ERRADO', 'O Dia da Expiação no Antigo Testamento era uma rápida cerimônia, que acontecia duas vezes por ano.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 3, 'CERTO_ERRADO', 'O Sumo Sacerdote era o principal dos sacerdotes judaicos.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 4, 'CERTO_ERRADO', 'Um dos resquisitos básicos ao sacerdócio é que ele deveria ser escolhido dentre os homens.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 5, 'CERTO_ERRADO', 'No primeiro dia do sexto mês, as trombetas eram tocadas para anunciar o começo de um novo ano.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 6, 'CERTO_ERRADO', 'A expiação era feita primeiramente pelos sacerdotes, visto que os mediadores entre Deus e Seu povo tinham de estar cerimonialmente puros', null::jsonb, 'C'),
  ('soteriologia-teste-1', 7, 'CERTO_ERRADO', 'O ato do Sacerdote despir-se de suas vestes magníficas era um gesto de humilhação.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 8, 'CERTO_ERRADO', 'O objetivo final do grande plano de salvação é a glória do homem.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 9, 'CERTO_ERRADO', 'A saída do Sumo Sacerdote do lugar Santíssimo provava que o sacrifício fora aceito por Deus.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 10, 'CERTO_ERRADO', 'O humilde tabernáculo terrestre é um contraste com o Santuário Celestial no qual Cristo ofereceu o Seu sacrifício.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 11, 'CERTO_ERRADO', 'O sacrifício de Cristo não apenas encobriu o pecado da vista de Deus, mas removeu-o para sempre.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 12, 'CERTO_ERRADO', 'É da morte de Cristo que tratam muitos tipos de profecias no Novo Testamento.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 13, 'CERTO_ERRADO', 'A morte de Jesus ocupa lugar proeminente no Novo Testamento.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 14, 'CERTO_ERRADO', 'Paulo diz que o Evangelho consiste da morte de Cristo por nossos pecados, Seu sepultamento e ressurreição.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 15, 'CERTO_ERRADO', 'Do ponto de vista de Deus, a morte de Cristo é uma necessidade absoluta, se é para o homem ser salvo.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 16, 'CERTO_ERRADO', 'A teoria da Expiação do acidente vê um grande significado na morte de Jesus.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 17, 'CERTO_ERRADO', 'A teoria da Expiação da influência moral é que ela reduz a expiação a uma peça teatral da paixão.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 18, 'CERTO_ERRADO', 'A teoria da Expiação do resgate pago a Satanás ensina que Cristo morreu para pagar o resgate a Satanás e comprar a liberdade da raça humana.', null::jsonb, 'C'),
  ('soteriologia-teste-1', 19, 'CERTO_ERRADO', 'A teoria da Expiação da satisfação ou teoria comercial defende que o objetivo da Expiação era restituir a Gloria de Deus violada pelo pecado.', null::jsonb, 'E'),
  ('soteriologia-teste-1', 20, 'CERTO_ERRADO', 'A Teoria da Expiação da substituição penal é também conhecida como teoria da Expiação vicária.', null::jsonb, 'C'),

  -- ===== Teste 2 - Licoes 3 e 4 =====
  ('soteriologia-teste-2', 1, 'CERTO_ERRADO', 'Uma das coisas que torna a necessidade da expiação evidente é a sindrome do pecado.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 2, 'CERTO_ERRADO', 'No Antigo Testamento, a expiação é usualmente declarada como algo obtido por meio dos sacrifícios.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 3, 'CERTO_ERRADO', 'O Velho Testamento põe em destaque a essência do sacrifício de Jesus.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 4, 'CERTO_ERRADO', 'A Bíblia ensina que os sofrimentos e a morte de Cristo foram vicários, e vicários no sentido estrito da palavra.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 5, 'CERTO_ERRADO', 'Através de seu sacrifício, Cristo satisfez tanto a justiça como a lei de Deus.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 6, 'CERTO_ERRADO', 'O eterno Filho de Deus se fez carne, condenou o pecado na carne e experimentou a própria morte.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 7, 'CERTO_ERRADO', 'Os reformados advogam que Cristo morreu só pelos eleitos; enquanto os arminianos ensinam que Cristo morreu por todos.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 8, 'CERTO_ERRADO', 'Para Calvino, a teologia da glória é a antítese da teologia da cruz.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 9, 'CERTO_ERRADO', 'Na Teologia da Cruz, apenas a fé reconhece que a revelação oculta na cruz é uma revelação de Deus.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 10, 'CERTO_ERRADO', 'Na Teologia da Cruz, Deus não é conhecido através do sofrimento.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 11, 'CERTO_ERRADO', 'Na Justificação um pecador arrependido e crente é livrado da penalidade da Lei.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 12, 'CERTO_ERRADO', 'O pecador não merece nada às mãos de Deus, exceto condenação. Logo, a justificação é inteiramente de graça.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 13, 'CERTO_ERRADO', 'A justificação toma o sangue de Cristo para constituir o seu fundamento.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 14, 'CERTO_ERRADO', 'Cristo foi feito legalmente responsável pelos pecados do crente, e sofreu o justo castigo que a este correspondia.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 15, 'CERTO_ERRADO', 'A fé em Cristo é o meio de justificação.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 16, 'CERTO_ERRADO', 'A fé, em si mesma, não salva o pecador; porém o leva a Cristo, o qual é quem, de fato, salva.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 17, 'CERTO_ERRADO', 'Cristo morreu como substituto do crente; daí o crente é para a Lei como um já morto.', null::jsonb, 'C'),
  ('soteriologia-teste-2', 18, 'CERTO_ERRADO', 'Cristo tomou nosso lugar; portanto, quando cremos nEle, tomamos Seu lugar como um servo.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 19, 'CERTO_ERRADO', 'Imputar algo a uma pessoa significa tirar algo de sua conta.', null::jsonb, 'E'),
  ('soteriologia-teste-2', 20, 'CERTO_ERRADO', 'A base da justificação é A OBRA DE CRISTO, e O MEIO da justificação é a FÉ EM CRISTO.', null::jsonb, 'C'),

  -- ===== Teste 3 - Licoes 5 e 6 =====
  ('soteriologia-teste-3', 1, 'CERTO_ERRADO', 'No Novo Testamento, o termo "adoção" (huiothesia) é rigorosamente uma ideia paulina.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 2, 'CERTO_ERRADO', 'A adoção é um dom gratuito oferecido às pessoas que não o merecem; ela vem exclusivamente da graça de Deus.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 3, 'CERTO_ERRADO', 'Paulo ao empregar o termo "adoção" (Ef 1.5), tinha em mente o que conhecia do processo legal de adoção.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 4, 'CERTO_ERRADO', 'Deus ama tanto aqueles que resolvem segui-Lo que Se digna de chamá-los de Seus servos.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 5, 'CERTO_ERRADO', 'Cristo é e sempre foi o Filho de Deus pela natureza do Seu próprio Ser.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 6, 'CERTO_ERRADO', 'A percepção plena da filiação aguarda a vinda de Cristo.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 7, 'CERTO_ERRADO', 'A Bíblia nos ensina a servir a Deus, mas em atitude de respeito e reverência, e não de angústia e medo.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 8, 'CERTO_ERRADO', 'Deus, como todo bom Pai, dará ao crente tudo quanto ele deseja.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 9, 'CERTO_ERRADO', 'O Espírito Santo, dirige e testifica em no cristão que ele é realmente filho de Deus.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 10, 'CERTO_ERRADO', 'O filho de Deus deve sempre lembrar-se da dignidade que seu novo título e posição encerra.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 11, 'CERTO_ERRADO', 'O novo nascimento e a regeneração espiritual representam fases sucessivas na experiência espiritual.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 12, 'CERTO_ERRADO', 'A união com Cristo dá ao crente a posição legal e os direitos de Cristo.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 13, 'CERTO_ERRADO', 'Jesus deixou claro que a regeneração é um ensino presente no Novo Testamento.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 14, 'CERTO_ERRADO', 'O novo nascimento é o nascimento de uma nova vida no espírito.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 15, 'CERTO_ERRADO', 'A regeneração é uma mudança ocorrida na substância da natureza humana.', null::jsonb, 'E'),
  ('soteriologia-teste-3', 16, 'CERTO_ERRADO', 'A regeneração consiste na implantação do princípio de nova vida espiritual ao homem.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 17, 'CERTO_ERRADO', 'A transformação sobrenatural, concedendo a nova vida ao homem, é uma benção que só Deus pode operar.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 18, 'CERTO_ERRADO', 'Por nova vida, referimo-nos ao fato de que o homem que estava morto espiritualmente, agora está ressurreto no seu espírito e pode entrar em comunhão com o Espírito Santo.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 19, 'CERTO_ERRADO', 'Antes da queda, o corpo de Adão não era pecaminoso, nem eram pecaminosos seus apetites naturais.', null::jsonb, 'C'),
  ('soteriologia-teste-3', 20, 'CERTO_ERRADO', 'O abuso ou o descuido do corpo físico por sermos crentes é uma crença totalmente bíblica.', null::jsonb, 'E'),

  -- ===== Teste 4 - Licoes 7 e 8 =====
  ('soteriologia-teste-4', 1, 'CERTO_ERRADO', 'Santificação é o processo pelo qual Deus transforma as pessoas pecaminosas em santos.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 2, 'CERTO_ERRADO', 'A santificação tem dois aspectos, um inferior, e outro superior.', null::jsonb, 'E'),
  ('soteriologia-teste-4', 3, 'CERTO_ERRADO', 'O caráter sobrenatural da santificação é visto como fruto da união vital com Jesus Cristo.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 4, 'CERTO_ERRADO', 'A Santificação afeta o homem todo: Corpo, alma e espírito; intelecto, afetos e vontade.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 5, 'CERTO_ERRADO', 'O Velho Testamento diz que somos feitos santos e agradáveis a Deus por aquilo que outra pessoa, ou seja, Cristo fez.', null::jsonb, 'E'),
  ('soteriologia-teste-4', 6, 'CERTO_ERRADO', 'Ninguém pode servir ao Deus vivo de modo aceitável enquanto sua consciência está contaminada pela culpa.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 7, 'CERTO_ERRADO', 'A santificação inicial é algo que Deus nos concede a partir do momento em que colocamos nossa fé em Cristo.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 8, 'CERTO_ERRADO', 'A Bíblia insiste que, ainda que as pessoas sejam santificadas elas ainda precisam continuar constantemente a purificar-se.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 9, 'CERTO_ERRADO', 'O método divino para a santificação progressiva envolve em primeiro quebrar o domínio avassalador do pecado na vida do homem.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 10, 'CERTO_ERRADO', 'A santificação do crente será concluída na sua morte.', null::jsonb, 'E'),
  ('soteriologia-teste-4', 11, 'CERTO_ERRADO', 'A glorificação é o ato culminante da obra redentora de Deus no homem.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 12, 'CERTO_ERRADO', 'A glorificação é a etapa inicial de nossa salvação. Sem ela a obra da redenção não estará completa.', null::jsonb, 'E'),
  ('soteriologia-teste-4', 13, 'CERTO_ERRADO', 'Apenas os redimidos pela obra de Cristo é que serão glorificados.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 14, 'CERTO_ERRADO', 'O Tribunal de Cristo é para julgar as obras e os atos dos crentes, recompensando-os, ou não.', null::jsonb, 'C'),
  ('soteriologia-teste-4', 15, 'ASSOCIACAO_COLUNAS', 'Ouro', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'D'),
  ('soteriologia-teste-4', 16, 'ASSOCIACAO_COLUNAS', 'Prata', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'B'),
  ('soteriologia-teste-4', 17, 'ASSOCIACAO_COLUNAS', 'Pedras preciosas', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'F'),
  ('soteriologia-teste-4', 18, 'ASSOCIACAO_COLUNAS', 'Madeira', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'A'),
  ('soteriologia-teste-4', 19, 'ASSOCIACAO_COLUNAS', 'Feno', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'C'),
  ('soteriologia-teste-4', 20, 'ASSOCIACAO_COLUNAS', 'Palha', '["A - Coisas humanas", "B - Redenção", "C - Obras aparentes", "D - Procede de Deus", "E - Obras sem firmeza", "F - Espirito Santo"]'::jsonb, 'E')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
