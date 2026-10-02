-- 099_banco_questoes_licao_pool_sorteio.sql
-- (Renumerada de 095 para 099 em 12/09/2026: os números 095/096 já
-- pertenciam a outras migrations em portal-teologico-os-staging
-- (ministerios / campo_ministerio_id) — arquivo escrito por engano na
-- pasta portal-teologico-os, que é a pasta de PRODUÇÃO segundo o
-- AGENTS.md, nunca deveria ter recebido código novo diretamente.)
--
-- Pool de questões por lição interna (1-8), multi-formato, pra sorteio
-- real de 20 questões por Teste (parcial, 2 lições) ou Prova (cumulativa,
-- 8 lições). Decisão de 12/09/2026 com o Joaquim: nomenclatura visível
-- ao aluno é sempre "Teste 1/2/3/4" e "Prova" (nunca "Teste Geral"), e a
-- quantidade é sempre 20 questões, sorteadas de um pool maior (não uma
-- lista fixa) — ver docs/banco_questoes.csv pra origem dos dados.
--
-- Aplicada manualmente no staging (cjxdroyyplpknygtcdgr) em 11-12/09/2026;
-- este arquivo é o registro em git dessa migração (ver README de
-- supabase/migrations para o motivo de não haver Supabase CLI aqui).

CREATE TABLE public.avaliacoes_banco_questoes_licao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  licao integer NOT NULL CHECK (licao BETWEEN 1 AND 8),
  formato text NOT NULL CHECK (formato IN ('CERTO_ERRADO','MULTIPLA_ESCOLHA','PREENCHER_LACUNA','ASSOCIACAO_COLUNAS')),
  enunciado text NOT NULL,
  opcoes jsonb,
  resposta_correta text NOT NULL,
  fonte text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avaliacoes_banco_questoes_licao_lesson_idx ON public.avaliacoes_banco_questoes_licao(lesson_id, licao);

ALTER TABLE public.avaliacoes_banco_questoes_licao ENABLE ROW LEVEL SECURITY;

-- Banco: staff administra; leitura direta pelo aluno não é permitida
-- (o gabarito não pode vazar) — geração/correção sempre via server
-- action com o client admin, igual ao padrão de avaliacoes_banco_questoes.
CREATE POLICY avaliacoes_banco_questoes_licao_staff ON public.avaliacoes_banco_questoes_licao
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- Corrige a unicidade da Prova: antes (migration 025) era 1 prova por
-- matrícula em todo o curso; agora cada matéria (lesson_id) tem sua
-- própria Prova cumulativa, então a regra de "1 tentativa" precisa ser
-- por matéria, não por curso inteiro.
DROP INDEX IF EXISTS public.avaliacoes_prova_unica;
CREATE UNIQUE INDEX avaliacoes_prova_unica_por_materia ON public.avaliacoes(matricula_id, lesson_id) WHERE (tipo = 'PROVA');

-- Mesma regra de tentativa única para cada Teste parcial (1 a 4) de
-- cada matéria.
CREATE UNIQUE INDEX avaliacoes_teste_licao_unica ON public.avaliacoes(matricula_id, lesson_id, numero_teste) WHERE (tipo = 'TESTE_LICAO');

-- Generaliza avaliacao_questoes pros 4 formatos (resposta em texto, não
-- só índice 0-3 de múltipla escolha). Colunas antigas ficam nullable
-- para não quebrar linhas já existentes do fluxo SIMULADO/PROVA por
-- curso (que continua só com múltipla escolha via resposta_correta_index).
ALTER TABLE public.avaliacao_questoes
  ALTER COLUMN opcoes DROP NOT NULL,
  ALTER COLUMN resposta_correta_index DROP NOT NULL,
  ADD COLUMN formato text CHECK (formato IN ('CERTO_ERRADO','MULTIPLA_ESCOLHA','PREENCHER_LACUNA','ASSOCIACAO_COLUNAS')),
  ADD COLUMN resposta_correta text,
  ADD COLUMN resposta_aluno text;
