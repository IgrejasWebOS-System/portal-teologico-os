-- 154_provas_publicas_missiologia_teste4.sql
-- 26/11/2026, pedido do Joaquim: completar Missiologia (M9, Curso Medio) com o Teste 4 - Licoes 7 e 8.
-- Testes 1 a 3 ja existem (migration 144). Aqui entra so o Teste 4: /prova-publica/missiologia-teste-4 (20 questoes C/E).
-- Texto: PDF "Missiologia - TESTE4 - LICOES 7 E 8.pdf" (curso-medio\M9), lido pagina a pagina, sem corrigir digitacao do original.
-- Gabarito: planilha "GABARITO GERAIS MEDIO.xlsx", aba M9. DECISAO DO JOAQUIM: a planilha traz colunas TESTE 4 e TESTE 5, mas nao existe Teste 5;
-- a prova impressa do Teste 4 bate 20/20 com a coluna rotulada TESTE 5, entao esta e a coluna usada (a coluna TESTE 4 e ignorada). Conferido por script.
-- lesson_id: buscado pelo titulo 'Missiologia'. Idempotente (on conflict do nothing).
-- Reversao: delete from provas_publicas where slug = 'missiologia-teste-4' (questoes saem em cascata; so antes de qualquer aluno responder).

insert into public.provas_publicas (materia, titulo, numero_teste, slug, lesson_id) values
  ('Missiologia', 'Teste 4 - Lições 7 e 8', 4, 'missiologia-teste-4', (select id from public.lessons where title = 'Missiologia' order by created_at limit 1))
on conflict (slug) do nothing;

insert into public.provas_publicas_questoes (prova_id, ordem, formato, enunciado, opcoes, resposta_correta)
select p.id, d.ordem, d.formato, d.enunciado, d.opcoes, d.resposta_correta
from (values
  ('missiologia-teste-4', 1, 'CERTO_ERRADO', 'Os fiéis desempenham um papel crucial em diferentes estágios e aspectos de uma missão.', null::jsonb, 'C'),
  ('missiologia-teste-4', 2, 'CERTO_ERRADO', 'Os fiéis podem fornecer um suporte significativo em missões, mas não devem se envolver ativamente.', null::jsonb, 'E'),
  ('missiologia-teste-4', 3, 'CERTO_ERRADO', 'Hoje é muito difícil encontrar fieis, falando mal da sua congregação e de seus lideres.', null::jsonb, 'E'),
  ('missiologia-teste-4', 4, 'CERTO_ERRADO', 'A igreja local pode fornecer um suporte espiritual contínuo por meio de orações, aconselhamento e encorajamento.', null::jsonb, 'C'),
  ('missiologia-teste-4', 5, 'CERTO_ERRADO', 'Quando a igreja local apoia missões, isso serve como um testemunho tangível do compromisso da igreja com a Grande Comissão.', null::jsonb, 'C'),
  ('missiologia-teste-4', 6, 'CERTO_ERRADO', 'Organizar uma missão não envolve planejamento logístico, como transporte, acomodação e alimentação.', null::jsonb, 'E'),
  ('missiologia-teste-4', 7, 'CERTO_ERRADO', 'Não é interessante para o missionário trabalhar em equipe, nem desenvolver parcerias.', null::jsonb, 'E'),
  ('missiologia-teste-4', 8, 'CERTO_ERRADO', 'So podemos dar o feedback orientado para o desenvolvimento após observar o erro.', null::jsonb, 'E'),
  ('missiologia-teste-4', 9, 'CERTO_ERRADO', 'Mentorar é o processo em que alguém mais experiente orienta e direciona a alguém mais jovem e inexperiente.', null::jsonb, 'C'),
  ('missiologia-teste-4', 10, 'CERTO_ERRADO', 'Ouvir atentamente as preocupações, dúvidas e sucessos dos novos missionários, é dever de um bom mentor.', null::jsonb, 'C'),
  ('missiologia-teste-4', 11, 'CERTO_ERRADO', 'O discipulado não colabora na criação de um impacto duradouro em missões.', null::jsonb, 'E'),
  ('missiologia-teste-4', 12, 'CERTO_ERRADO', 'Quando o discipulado é bem aplicado, ele terá efeitos duradouros e expansivos.', null::jsonb, 'C'),
  ('missiologia-teste-4', 13, 'CERTO_ERRADO', 'O evangelismo precisa ter um impacto duradouro, pois ele é como uma lavoura onde exige o plantio, a rega e a colheita.', null::jsonb, 'C'),
  ('missiologia-teste-4', 14, 'CERTO_ERRADO', 'Modelagem de valor é viver de acordo com aquilo que falamos, e pregamos.', null::jsonb, 'C'),
  ('missiologia-teste-4', 15, 'CERTO_ERRADO', 'Modelar o comportamento do indivíduo é tarefa do Espirito Santo.', null::jsonb, 'E'),
  ('missiologia-teste-4', 16, 'CERTO_ERRADO', 'É fundamental investir no discipulado do novo convertido.', null::jsonb, 'C'),
  ('missiologia-teste-4', 17, 'CERTO_ERRADO', 'Jesus Cristo não foi um discipulador, afinal ele é o Messias o Filho de Deus o Ungido.', null::jsonb, 'E'),
  ('missiologia-teste-4', 18, 'CERTO_ERRADO', 'As transformações podem abranger várias áreas da vida, mas, não incluem o comportamento, valores, relacionamentos e perspectivas.', null::jsonb, 'E'),
  ('missiologia-teste-4', 19, 'CERTO_ERRADO', 'O discipulado eficaz, gera testemunhos magníficos no meio da congregação.', null::jsonb, 'C'),
  ('missiologia-teste-4', 20, 'CERTO_ERRADO', 'O evangelismo trata especificamente de números e resultados visíveis.', null::jsonb, 'E')
) as d(slug, ordem, formato, enunciado, opcoes, resposta_correta)
join public.provas_publicas p on p.slug = d.slug
on conflict (prova_id, ordem) do nothing;
