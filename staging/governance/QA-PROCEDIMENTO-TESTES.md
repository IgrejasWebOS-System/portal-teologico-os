# Procedimento QA — Testes de Teste/Prova por matéria (staging)

Criado em 12/09/2026. Objetivo: sempre que o Joaquim disser "vou fazer
um novo teste", saber sem ambiguidade qual dos dois procedimentos usar
— e qualquer IA ou pessoa trabalhando neste projeto depois deve seguir
a mesma árvore de decisão, não reinventar a cada vez.

## Árvore de decisão

**Pergunta:** o teste que você vai fazer precisa de conta/matrícula
zerada, ou você quer continuar com a mesma conta de teste que já usou
antes (só repetir um Teste/Prova)?

- Resposta **"do zero"** (conta nova, matrícula nova, quer simular um
  aluno recém-aprovado) → **Procedimento X**.
- Resposta **"com os dados que já estou usando"** (só quer repetir um
  Teste 1-4 ou a Prova que já tentou, mesma conta) → **Procedimento Y**.

Se o Joaquim só disser "vou testar de novo" sem especificar, a IA deve
perguntar explicitamente qual dos dois antes de rodar qualquer comando
— não presumir.

## Procedimento X — do zero

Reseta completamente e recria as duas contas de teste, prontas pra
logar.

```powershell
cd C:\Projetos\portal-teologico-os-staging
node --env-file=.env.local scripts/zerar-staging.mjs
```

O que acontece:
1. Apaga `fin_contas_receber`, `ead_matriculas`, `ead_alunos` de todo
   mundo que não for staff (GLOBAL_ADMIN).
2. Cascade automático apaga junto: `avaliacoes` e `avaliacao_questoes`
   de todas as matrículas removidas — isso inclui Simulado, Prova (por
   curso) e Teste 1-4/Prova (por matéria), sem precisar listar essas
   tabelas à parte.
3. Apaga todo `auth.users` que não for GLOBAL_ADMIN (login de staff é
   preservado).
4. Garante que sobra pelo menos 1 professor e 1 turma (recria se
   necessário).
5. **Recria do zero** as duas contas de aluno de teste, cada uma na
   matéria certa:
   - `alunobasico@cetadp.teo.br` → matriculado em **Curso Teológico
     Básico** (onde fica Bibliologia).
   - `alunomedio@cetadp.teo.br` → matriculado em **Curso Teológico
     Médio** (onde fica Homilética).
   - Senha das duas: `@Cetadp26`.

Depois de rodar, pode logar direto com qualquer uma das duas contas —
matrícula "EM_ANDAMENTO", zero tentativas de Teste/Prova, pronto pra um
teste do zero de verdade.

## Procedimento Y — com os dados que já está usando

Mantém login, matrícula, progresso de aula e financeiro — só libera
novas tentativas de Teste/Prova/Simulado.

```powershell
cd C:\Projetos\portal-teologico-os-staging
node --env-file=.env.local scripts/limpar-tentativas-teste.mjs
```

O que acontece: apaga só as linhas de `avaliacoes` (e
`avaliacao_questoes` junto, via cascade) das matrículas de
`alunobasico@`/`alunomedio@cetadp.teo.br` — nada mais. Os índices
únicos do banco (`avaliacoes_teste_licao_unica`,
`avaliacoes_prova_unica_por_materia`, limite de 2 Simulados) bloqueiam
uma segunda tentativa enquanto a linha antiga existir; este é o
comando que libera de novo.

Use quando: quiser refazer o Teste 3 de Bibliologia que já fez, testar
a Prova de novo, comparar comportamento entre uma tentativa e outra —
qualquer cenário onde a CONTA em si (login, matrícula, progresso de
aula) deve continuar igual.

## Achado importante corrigido em 12/09/2026 — não reverter sem saber por quê

Bibliologia pertence ao **Curso Teológico Básico**; Homilética pertence
ao **Curso Teológico Médio** — são matérias de cursos diferentes,
apesar dos nomes "básico"/"médio" sugerirem uma progressão dentro do
mesmo curso. Antes desta correção, `alunomedio@cetadp.teo.br` estava
matriculado no Curso **Básico**, o que tornava **impossível testar
Homilética** com qualquer uma das duas contas — não por bug no código
do Teste/Prova, mas por matrícula no curso errado. Causa raiz: a
migration `098_contas_teste_alunos_professor_demo.sql` reusa a mesma
variável de curso (Básico) pra criar as duas contas demo — ela foi
escrita pro fluxo antigo "Teste C/E" (só precisava de progresso de
aula, não de matéria específica por curso). Corrigido via SQL direto
em staging (sem impacto, `alunomedio` não tinha nenhuma avaliação
registrada ainda) e o `zerar-staging.mjs` agora recria sempre nessa
configuração correta.

Se no futuro Homilética "sumir" pro `alunomedio`, confira primeiro em
qual curso a matrícula dele está antes de suspeitar do código.

## Scripts obsoletos — não usar

`scripts/limpar-usuarios-teste.mjs` foi desativado em 12/09/2026: era
um script pontual pra produção, sem trava de ambiente, com lista de
e-mails em formato antigo. Ver `scripts/README.md` pra tabela completa
de scripts e quando usar cada um.

## Lição aprendida: sempre `git pull` depois de `git checkout main`

As migrations `095`-`098` chegaram a "sumir" temporariamente da pasta
local depois de um `git checkout main` sem `git pull` em seguida — elas
já estavam mergeadas no GitHub (via outro branch,
`feat/ministerio-campo-sede-busca`), só não tinham sido puxadas ainda
pro `main` local. Resolvido com um `git pull` simples, sem perda de
dado nenhuma. Registrado em `ERROS-COMUNS-IA.md` como lembrete: depois
de `git checkout main`, sempre `git pull` antes de criar uma branch
nova em cima.
