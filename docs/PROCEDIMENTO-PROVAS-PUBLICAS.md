# Procedimento: cadastrar testes e provas do CETADP

Criado em 02/11/2026, depois de um erro real: as provas de Missiologia e Ética Cristã foram
carregadas no módulo errado (banco por lição) e uma tela com grade de datas foi construída sem
necessidade. Este arquivo existe para que isso não se repita. Vale para qualquer IA ou pessoa.

## 1. Qual módulo usar (regra fixa)

| Módulo | Tabelas | Como funciona | Quando usar |
|---|---|---|---|
| **Provas públicas (este procedimento)** | `provas_publicas`, `provas_publicas_questoes`, `provas_publicas_respostas` | Prova FIXA (sempre as mesmas questões, mesma ordem do PDF). Aluno abre o link `/prova-publica/<slug>` sem login, informa CPF e nome. O professor copia o link em `/professor/testes-provas` (a secretaria em `/secretaria/testes-provas`). | **Sempre que forem os testes/provas impressos do CETADP** (Teste 1 a 4/5 por matéria). Já feitos assim: Escatologia Bíblica (123), Liderança Cristã (127), Missiologia e Ética Cristã (144). |
| Banco por lição (sorteio) | `avaliacoes_banco_questoes_licao` | Aluno logado, sorteia 20 questões de um pool. | Só Bibliologia e Homilética (099/100). **Não usar para provas novas do CETADP.** |
| Banco antigo | `avaliacoes_teste_licao_banco` | Legado (Pneumatologia). | Não usar. |

Em dúvida, abrir `/professor/testes-provas` (é onde o professor vê o que está publicado) e perguntar
ao Joaquim antes de gravar qualquer coisa.

Não criar tabela nova para provas. Não criar grade/calendário de datas (pedido já descartado pelo
Joaquim em 02/11/2026: a tela mostra só o que está publicado).

## 1.1 O que já está validado NÃO se mexe (regra do Joaquim, 02/11/2026)

Escatologia Bíblica (`123`, `escatologia-teste-1..4`) e Liderança Cristã (`127`,
`lideranca-crista-teste-1..5`) estão em produção, com alunos que já responderam, e foram conferidas
questão a questão. Missiologia e Ética Cristã seguem o mesmo padrão. Ao acrescentar conteúdo novo:

- Só **adicionar**: migration nova, slugs novos. Nunca editar, renomear, apagar nem recarregar
  `provas_publicas`/`provas_publicas_questoes` de matéria já publicada (nem as migrations antigas).
- Nunca alterar slug, ordem, enunciado, gabarito ou `lesson_id` de prova existente sem pedido
  explícito do Joaquim e backup validado. Corrigir gabarito de prova já respondida muda notas.
- Não mudar o fluxo validado do aluno (`/prova-publica/<slug>`: CPF, correção, vínculo por CPF,
  nota mínima 6,1) nem as telas de resultado/impressão. Mudança de tela: só o pedido, sem refatorar.
- A tela `/professor/testes-provas` só **agrupa** por curso (cards); ela não cria, altera ou remove
  provas. Se uma matéria não achar curso, ela continua visível (lista "Outras"), nunca some.
- Antes de qualquer entrega, olhar o que já está publicado em produção (consulta somente leitura em
  `provas_publicas`) e conferir que nada existente muda de contagem, slug ou curso.

Staging: o banco de staging NÃO tem as provas de produção. Se a tela de staging estiver sem uma
matéria (ex.: "não tem Escatologia"), é falta de dado de teste, não bug: criar a matéria de teste num
curso SEED e as linhas de `provas_publicas` só em staging (nunca copiar de staging para produção).
Provas de teste do staging sem questões servem só para ver o card.

## 2. Antes de escrever qualquer SQL

1. Pedir/ler os arquivos: um PDF por teste (Teste 1 a 4 ou 5) mais o PDF de gabarito da matéria
   (seção "TESTES PARCIAIS", uma coluna por teste).
2. PDFs escaneados não têm texto: renderizar cada página em imagem (`pdftoppm -r 120 -png`) e LER a
   imagem. `pdftotext` devolve vazio nesses arquivos.
3. Conferir que **cada arquivo é o teste que o nome diz**: já veio o "Teste 1" que era cópia do
   "Teste 4". Se algum faltar ou estiver errado, carregar só os corretos e listar o que falta.
4. Transcrever as 20 questões de cada teste na ordem impressa (enunciado exatamente como no PDF,
   inclusive erros de digitação do original, a não ser que o Joaquim peça correção).
5. Conferir questão a questão a resposta do gabarito contra o texto. Listar para o Joaquim os itens
   que parecem estranhos e carregar mesmo assim o gabarito oficial. Avisar enunciados repetidos.
6. Questões de associar colunas: `formato = 'ASSOCIACAO_COLUNAS'`, `opcoes` = lista da Coluna B do
   bloco (`["A - Mani", "B - Tertuliano"]`), `resposta_correta` = só a letra. Certo/Errado:
   `formato = 'CERTO_ERRADO'`, `opcoes` null, resposta `C` ou `E`.

## 3. A migration (modelo: 123, 127 e 144)

- Arquivo `supabase/migrations/NNN_provas_publicas_<materia>.sql` (próximo número livre, conferir
  com Glob na pasta de staging).
- `provas_publicas`: `materia` (nome da matéria, ex.: `'Missiologia'`), `titulo`
  (`'Teste N - Lições X e Y'`), `numero_teste`, `slug` (`<materia>-teste-N`, estável: nunca reutilizar
  depois de divulgado) e `lesson_id` buscado pelo título da matéria
  (`(select id from public.lessons where title = '...' order by created_at limit 1)`).
- **O `lesson_id` é obrigatório na prática**: é por ele que o card Curso Básico / Curso Médio de
  `/professor/testes-provas` sabe a que curso a prova pertence (`lessons.course_id` →
  `courses.title` contendo "Básico" ou "Médio"). Sem `lesson_id`, a matéria cai fora dos cards.
- `provas_publicas_questoes`: `ordem` 1..N na ordem impressa, `on conflict do nothing` (idempotente).
- Só inserts. Sem DDL, sem apagar nada. Comentário no topo com origem, pendências e reversão.
- Atualizar `supabase/migrations/README.md`.

## 4. Ordem de entrega

1. Aplicar no **staging** (`cjxdroyyplpknygtcdgr`) e validar com SQL: 20 questões por prova,
   respostas `C`/`E` válidas, letra de associação presente em `opcoes`. No staging é normal não
   existir a matéria: criar a matéria de teste num curso SEED (Básico ou Médio) só para ver o card.
2. Abrir `/prova-publica/<slug>` no staging e conferir.
3. Se houve mudança de código: `npm run type-check` e `npm run lint` (0 erros), branch, PR, CI verde.
4. Backup de produção (`backup-manager-v2.ps1 -PreMigration -Label pre-<assunto>`), esperar
   "CONCLUIDO SEM FALHAS", pedir o "pode" do Joaquim.
5. Aplicar a migration em **produção** (é só dado, mas é escrita em produção), verificar por
   consulta somente leitura, pedir o "pode" do merge. Migration antes do merge.
6. Conferir `/prova-publica/<slug>` em produção (a prova abre, 20 questões).

## 5. Telas

- Aluno: `/prova-publica/<slug>`.
- Professor e secretaria: `/professor/testes-provas` e `/secretaria/testes-provas`: dois cards,
  Curso Básico e Curso Médio; clicar mostra só as matérias publicadas do curso, com Copiar link e
  Enviar por WhatsApp. Matéria nova publicada entra sozinha no card certo (via `lesson_id`).
- Importação automática por PDF (`/admin/provas-publicas/importar`): **não usar**, ver seção do
  `AGENTS.md` (não terminada, não está em produção).

## 6. Pendências conhecidas (02/11/2026)

- Missiologia Testes 4 e 5 (existe só o gabarito; faltam os PDFs dos testes). Ética Cristã Testes 1-4
  já carregados.
- Múltipla escolha (a-d), como no Ética Teste 1: gravar como `ASSOCIACAO_COLUNAS`, `opcoes` =
  `["a. texto", "b. texto", ...]`, resposta = letra minúscula (a correção ignora maiúsc./minúsc.).
- Itens do gabarito para conferir com o CETADP: Missiologia Teste 2 (2 e 8), Teste 3 (13, 14, 17),
  Ética Cristã Teste 3 (19 e 20); Ética Cristã Teste 2 tem as questões 2 e 4 idênticas no original.
