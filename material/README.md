# Material de treinamento — CETADP

Guias passo a passo (com capturas de tela reais) dos principais fluxos do
sistema, organizados por público. Serve hoje como material pra mandar aos
grupos de WhatsApp (professores, alunos, secretaria); a ideia é que mais pra
frente vire a base de uma Central de Ajuda dentro do próprio sistema em
produção (o botão "Central de Ajuda" que já aparece nas telas hoje abre um
widget externo — este material pode alimentar isso no futuro).

## Estrutura

- `professores/` — cadastro público, definir senha, completar ficha, área do
  professor, vincular turma e gerar link de matrícula pros alunos.
- `alunos/` — matrícula via link do professor (ou inscrição pública),
  definir senha, completar ficha, pagamento inicial, acesso às aulas.
- `secretaria/` — fluxos administrativos (aprovar inscrição, matrícula
  direta, conferência de mensalidades, etc.) — a preencher.

## Convenção de arquivos

Dentro de cada pasta, capturas de tela numeradas na ordem do fluxo real:

```
01-nome-da-tela.png
02-proxima-tela.png
...
```

A numeração não precisa ser sequencial "perfeita" (pode pular, refazer um
número) — só precisa refletir a ordem em que as telas aparecem pro usuário
final. Quando uma pasta tiver as capturas completas, monta-se um PDF (ou
outro formato) a partir delas + do roteiro escrito.

## Ambiente

Este material é produzido testando o fluxo em **staging**
(`portal-teologico-os-staging`, branch `staging`, Supabase
`cjxdroyyplpknygtcdgr`), nunca em produção — assim não precisa criar e depois
apagar dados de teste em produção. Ver `AGENTS.md` na raiz do projeto.
