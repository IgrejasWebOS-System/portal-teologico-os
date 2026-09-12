# scripts/ — utilitários de manutenção do STAGING

Todos os scripts aqui rodam contra o banco apontado em `.env.local`
(`node --env-file=.env.local scripts/<nome>.mjs`, na pasta
`portal-teologico-os-staging`). Os que mexem em dado de teste têm trava
de segurança: recusam rodar se `NEXT_PUBLIC_SUPABASE_URL` não for o
projeto de staging (`cjxdroyyplpknygtcdgr`).

Pra saber **quando usar qual** ao testar Teste/Prova/Simulado, ver
`staging/governance/QA-PROCEDIMENTO-TESTES.md` — resumo rápido abaixo.

| Script | Pra que serve | Apaga login das contas de teste? | Trava de ambiente |
|---|---|---|---|
| `zerar-staging.mjs` | **Procedimento X — do zero.** Zera matrículas/alunos/avaliações/financeiro de teste E recria `alunobasico@`/`alunomedio@cetadp.teo.br` prontos pra logar (senha `@Cetadp26`), cada um na matéria certa. Mantém professor e turma. | Sim, mas recria no final | Sim |
| `limpar-tentativas-teste.mjs` | **Procedimento Y — com os dados atuais.** Apaga só as tentativas de Teste/Prova/Simulado dos alunos de teste, mantendo login, matrícula, progresso de aula e financeiro intactos. | Não | Sim |
| `criar-usuario-teste-staff.mjs <email>` | Cria/reaproveita uma conta de **staff** (GLOBAL_ADMIN) em staging — branches do Supabase não herdam `auth.users` de produção. | — (cria staff, não aluno) | Sim (aviso no cabeçalho) |
| `resetar-senha-admin.mjs <email>` | Redefine a senha de uma conta admin real (cetadp@/marcelo@/etc.) sem depender de e-mail de recuperação. Senha é digitada na hora, nunca salva em arquivo. | — | Não tem trava de projeto (uso deliberado em qualquer ambiente onde a conta exista) |
| `limpar-usuarios-teste.mjs` | **Obsoleto/desativado em 12/09/2026** — era um one-off de produção sem trava de ambiente, com lista de e-mails no formato antigo. Não usar; o arquivo só recusa rodar e aponta pros scripts certos. | — | — |

## Regra geral

- Scripts de reset de staging (`zerar-staging.mjs`,
  `limpar-tentativas-teste.mjs`) nunca devem perder a trava
  `url.includes("cjxdroyyplpknygtcdgr")` — é o que impede rodar sem
  querer contra produção.
- Novo script que mexe em dado de aluno/matrícula/avaliação: sempre
  adicionar a mesma trava, e registrar aqui na tabela.
