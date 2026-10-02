# Cronograma de validação — demo de amanhã

## O que já foi feito hoje (ambiente staging)

- **RBAC Parte B**: tela Matriz de Usuários agora edita nível + unidade
  de operadores existentes (`admin_roles`), e todo fluxo que concede
  acesso (convite, professor de núcleo, edição) sincroniza
  `profiles.system_role` automaticamente — sem isso a pessoa não
  conseguia logar em `/dashboard` mesmo com o nível certo gravado.
- **3 contas mestre de produção corrigidas**: `admin@cetadp.teo.br` e
  `joaquim@cetadp.teo.br` estavam com esse mesmo problema (nível
  Super-Master mas travadas em MEMBER) — já corrigido direto em
  produção, os 3 já logam.
- **Seletor hierárquico em Membros**: Setor/Regional → Igreja →
  Sub-congregação/Ponto de Pregação → Célula. Tela começa vazia até
  escolher o escopo (evita carregar o cadastro inteiro de uma vez).
- **Teste de Certo/Errado por lição**: estrutura completa reaproveitando
  o motor de Simulado/Prova que já existia. Pneumatologia digitalizada
  (72 questões, 4 testes) com **gabarito provisório** — nota não vale
  ainda, só valida a tela.
- **3 contas de teste** criadas no staging (ver senha abaixo).

## Antes de tudo: onde é a demo?

A demo de amanhã roda em produção (URL pública) ou local
(`localhost:3000` apontando pro staging)? Isso muda o próximo passo:

- **Produção** → preciso fazer merge do código pra `main` e aplicar as
  migrations 097 (Teste C/E) e 098 (contas de teste, se quiser elas lá
  também) em produção antes da demo.
- **Local/staging** → já está tudo pronto, só falta validar.

## Passo a passo

1. [ ] Rodar `npx tsc --noEmit` — sem erros.
2. [ ] Rodar `npm run build` — build de produção sem erros.
3. [ ] Testar localmente (`npm run dev`):
   - Login `admin@cetadp.teo.br` → `/dashboard/membros` → seletor
     aparece vazio, escolher um Setor carrega os membros.
   - Login `alunobasico@cetadp.teo.br` → `/portal/avaliacoes` → ver
     Curso Básico em 40%, bloco "Testes por lição" aparece.
   - Fazer o Teste 1 de Pneumatologia → responder C/E → conferir nota
     e o aviso amarelo de "gabarito provisório".
   - Login `professor@cetadp.teo.br` → confirmar que entra no
     `/dashboard` (acesso global, sem tela de turma própria ainda).
4. [ ] Se tudo certo: commit → push (branch nova) → abrir PR → merge
   pra `main` (proteção de branch exige PR, ver AGENTS.md).
5. [ ] Aplicar as migrations 097 e 098 em produção — eu aplico, só
   preciso da sua confirmação de que pode (098 só se você quiser as
   contas de teste visíveis em produção também).
6. [ ] Assim que o CETADP passar o gabarito real de cada teste: eu
   atualizo só o dado (`resposta_correta_index` +
   `gabarito_provisorio = false`) — não mexe em código nenhum.

## Contas de teste (staging)

Senha de todas: `@Cetadp748596#` (mesma convenção das demais contas
demo do projeto — ver migration 041).

| Conta | O que mostra |
|---|---|
| `alunobasico@cetadp.teo.br` | Curso Básico em 40% |
| `alunomedio@cetadp.teo.br` | Curso Básico em 60% |
| `professor@cetadp.teo.br` | Acesso global (mesmo nível do secretário) |

## O que ficou de fora — não dá pra fechar até amanhã

- Tela dedicada de "gestão de turma" pro professor — hoje ele só loga,
  não tem uma tela própria de turma (a tabela `professores` nem tem
  login vinculado ainda; é um recurso a construir do zero).
- A seção "Ligue as colunas" (associação) dos Testes 1 e 3 de
  Pneumatologia — só as 72 questões de Certo/Errado foram
  digitalizadas, o formato de associação de colunas não existe no
  sistema ainda.
- Gabarito real de todos os testes — aguardando o CETADP passar amanhã.
