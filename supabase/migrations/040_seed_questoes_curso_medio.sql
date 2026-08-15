-- 040_seed_questoes_curso_medio.sql
-- Banco de questoes (avaliacoes_banco_questoes) do Curso Teologico Medio
-- estava vazio (so o Basico tinha 12 questoes, da migration 025). Sem
-- isso, simulados e provas do curso Medio nao podem ser gerados.
-- 12 questoes de exemplo, mesmo formato da 025.
--
-- course_id buscado dinamicamente pelo titulo (nao fixo) — mesmo motivo
-- da correcao aplicada na migration 014: o UUID do curso "Curso
-- Teologico Medio" e gerado pela migration 006 (e renomeado pela 008)
-- toda vez que essas migrations rodam, entao varia por ambiente
-- (producao, branch, staging, restore). Um UUID fixo aqui quebrava a
-- aplicacao das migrations em qualquer ambiente novo.

insert into avaliacoes_banco_questoes (course_id, enunciado, opcoes, resposta_correta_index)
select (select id from courses where title = 'Curso Teológico Médio' limit 1), enunciado, opcoes, resposta_correta_index
from (values
('A homiletica e a disciplina que estuda:', '["A arte de pregar", "A administracao eclesiastica", "A musica liturgica", "O direito canonico"]'::jsonb, 0),
('A hermeneutica biblica trata principalmente de:', '["Musica sacra", "Interpretacao dos textos", "Organizacao eclesiastica", "Financas da igreja"]'::jsonb, 1),
('A soteriologia e o estudo de qual doutrina?', '["Doutrina da salvacao", "Doutrina dos anjos", "Doutrina da criacao", "Doutrina do batismo apenas"]'::jsonb, 0),
('A eclesiologia trata do estudo de:', '["A igreja", "O fim dos tempos", "Os milagres", "A trindade"]'::jsonb, 0),
('A apologetica crista tem como principal objetivo:', '["Defender racionalmente a fe crista", "Organizar a liturgia", "Administrar o dizimo", "Ensinar canto coral"]'::jsonb, 0),
('A missiologia e o estudo relacionado a:', '["As missoes e a evangelizacao", "A arquitetura de templos", "A contabilidade eclesiastica", "O direito civil"]'::jsonb, 0),
('Qual destas e uma caracteristica esperada da lideranca crista biblica?', '["Servir com humildade", "Buscar autopromocao", "Evitar prestar contas", "Concentrar todo poder decisorio"]'::jsonb, 0),
('A educacao crista na igreja local tem como um de seus focos:', '["A formacao doutrinaria e discipulado dos membros", "Apenas atividades recreativas", "Somente eventos sociais", "Exclusivamente questoes administrativas"]'::jsonb, 0),
('A teologia do obreiro trata principalmente de:', '["O carater e a vocacao de quem serve na obra", "A arquitetura do templo", "O calendario liturgico", "A gestao financeira da igreja"]'::jsonb, 0),
('No contexto da familia crista, a Biblia enfatiza principalmente:', '["Amor, respeito e responsabilidade mutua", "Hierarquia sem dialogo", "Ausencia de papeis definidos", "Independencia total entre os membros"]'::jsonb, 0),
('Um principio basico da hermeneutica e interpretar um texto biblico considerando:', '["O contexto historico e literario", "Apenas a traducao mais recente", "Somente a opiniao pessoal do leitor", "Unicamente o titulo do livro"]'::jsonb, 0),
('A lideranca crista biblica se distingue de modelos puramente seculares principalmente por:', '["Ter Cristo como modelo de servo-lideranca", "Focar exclusivamente em resultados financeiros", "Ignorar o carater do lider", "Depender apenas de carisma pessoal"]'::jsonb, 0)
) as v(enunciado, opcoes, resposta_correta_index);
