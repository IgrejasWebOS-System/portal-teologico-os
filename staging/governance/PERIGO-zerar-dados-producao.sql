-- ============================================================
-- ⚠️  PERIGO — ZERAR DADOS REAIS DE PRODUÇÃO  ⚠️
-- ============================================================
--
-- NÃO RODE ISSO SEM PARAR E PENSAR DE NOVO.
--
-- Este bloco apaga PERMANENTEMENTE, sem possibilidade de desfazer:
--   - todo o financeiro (contas a receber, a pagar, lançamentos, caixa)
--   - todas as matrículas de alunos
--   - todos os alunos cadastrados
--   - todos os vínculos professor/turma
--   - todos os professores cadastrados
--
-- Se rodado contra PRODUÇÃO (toduvwtzklntyptcodkf), isso apaga dados
-- REAIS de alunos matriculados de verdade, pagamentos já lançados e
-- matrículas em andamento. Não existe "desfazer" sem um backup prévio.
--
-- Isso também contraria a regra registrada em AGENTS.md (decisão do
-- Joaquim, 23/09/2026): "nenhuma alteração de código ou banco vai direto
-- pra produção, nem em caráter de urgência — nem um UPDATE/DELETE/ALTER
-- avulso colado no SQL Editor de produção, mesmo que pareça pequeno ou
-- reversível." Usar este script é uma EXCEÇÃO deliberada a essa regra,
-- e só deve acontecer com autorização explícita do Joaquim no momento,
-- não porque "já tínhamos isso pronto de outra vez".
--
-- CHECKLIST OBRIGATÓRIO ANTES DE RODAR:
--   [ ] Fiz um backup do banco (Supabase → Project Settings → Database →
--       Backups, ou um pg_dump) e confirmei que ele terminou com sucesso.
--   [ ] Confirmei visualmente, no topo do SQL Editor do Supabase, que o
--       projeto selecionado é mesmo o que eu quero afetar (produção
--       `toduvwtzklntyptcodkf` ou staging `cjxdroyyplpknygtcdgr`).
--   [ ] Tenho certeza de que quero apagar TODOS os professores, alunos,
--       matrículas e financeiro daquele ambiente — não só um registro
--       específico.
--   [ ] Depois de rodar, vou preencher a entrada de log em
--       staging/governance/ERROS-COMUNS-IA.md (modelo logo abaixo deste
--       arquivo, na seção "Entrada de log pendente").
--
-- USO: colar este bloco inteiro no Supabase SQL Editor e rodar de uma
-- vez. Roda contra o projeto que estiver selecionado no editor — repetir
-- a colagem/execução separadamente em cada ambiente:
--   Produção : toduvwtzklntyptcodkf
--   Staging  : cjxdroyyplpknygtcdgr
--
-- Este script NÃO toca em `profiles`/`auth.users` — contas de login
-- (inclusive GLOBAL_ADMIN) ficam preservadas automaticamente.
--
-- Ordem das deleções respeita as dependências (filhos antes dos pais):
--   financeiro -> matrículas -> alunos -> vínculo professor/turma -> professores
-- ============================================================

delete from fin_contas_receber;
delete from fin_contas_pagar;
delete from fin_lancamentos;
delete from fin_caixa_diario;
delete from ead_matriculas;
delete from ead_alunos;
delete from professor_turmas;
delete from professores;

-- Conferência pós-limpeza (todas as colunas devem retornar 0)
select
  (select count(*) from fin_contas_receber) fin_receber,
  (select count(*) from fin_contas_pagar)   fin_pagar,
  (select count(*) from fin_lancamentos)    fin_lanc,
  (select count(*) from fin_caixa_diario)   fin_caixa,
  (select count(*) from ead_matriculas)     matriculas,
  (select count(*) from ead_alunos)         alunos,
  (select count(*) from professor_turmas)   prof_turmas,
  (select count(*) from professores)        professores;

-- ============================================================
-- ENTRADA DE LOG PENDENTE — preencher em
-- staging/governance/ERROS-COMUNS-IA.md depois de rodar este script,
-- copiando a linha abaixo pra tabela (trocar os campos entre <>):
--
-- | <data de hoje> | Dados de produção / Limpeza manual | Execução deliberada do script PERIGO-zerar-dados-producao.sql contra <produção ou staging> | Decisão do Joaquim: <motivo, ex. "reset antes do lançamento oficial"> | Backup tirado em <onde/como> antes de rodar; nenhuma migration criada pois é limpeza de dado, não mudança de schema | Resultado da query de conferência (todas as colunas em 0): <colar aqui> | Controlado |
-- ============================================================
