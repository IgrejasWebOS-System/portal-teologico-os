# Fase 1 — Painel do Professor (guia passo a passo)

Implementado em 27/09/2026, em `portal-teologico-os-staging`. Nada foi tocado em produção.

## O que mudou

A Área do Professor deixou de ser uma página única (`/professor`) e virou um módulo com
menu lateral, igual ao padrão que a área `(igreja)` já usa (`SidebarShell`/`Sidebar.tsx`).

### Rotas novas

| Rota | O que é | Origem |
|---|---|---|
| `/professor` | Dashboard — cards de resumo (turmas, alunos, a receber) | Novo (antes era a página inteira) |
| `/professor/alunos` | Busca + tabela de alunos + Nova Matrícula + baixa de parcela | Reaproveita `ProfessorPainel.tsx` (sem a parte de turmas) |
| `/professor/turmas` | "Minhas Turmas" + vincular turma existente | Reaproveita `TurmasDoProfessor.tsx`, sem mudança nenhuma |
| `/professor/financeiro` | Todas as parcelas do núcleo (todos os alunos), com filtro Pendente/Recebida/Todas, totais e Pix | Novo |
| `/professor/configuracoes` | Dados do professor (nome, telefone, CPF, cargo) — só leitura | Novo, simplificado |

### Arquivos criados

- `src/app/[locale]/professor/layout.tsx` — gate de acesso (`checkIsProfessor`) + `SidebarShell`
- `src/app/[locale]/professor/alunos/page.tsx`
- `src/app/[locale]/professor/turmas/page.tsx`
- `src/app/[locale]/professor/financeiro/page.tsx`
- `src/app/[locale]/professor/financeiro/FinanceiroDoNucleoPainel.tsx`
- `src/app/[locale]/professor/configuracoes/page.tsx`

### Arquivos modificados

- `src/app/[locale]/professor/page.tsx` — virou o Dashboard (era a página inteira antiga)
- `src/app/[locale]/professor/ProfessorPainel.tsx` — não renderiza mais `<TurmasDoProfessor>`; ficou só a tela de Alunos
- `src/app/[locale]/professor/actions.ts` — os redirects de cada ação agora apontam pra rota certa (`/professor/alunos` ou `/professor/turmas`, ou pra onde o form de "dar baixa" indicar via campo oculto `redirect_to`)
- `src/components/layout/Sidebar.tsx` — novo modo `isProfessor` (mesmo padrão de `isAlunoOficial`), com os 5 itens de menu
- `src/components/layout/SidebarShell.tsx` — repassa `isProfessor`/`professorResumo` pro `Sidebar`

### O que ficou de fora de propósito (Fase 2, não iniciada)

- **Caixa do núcleo** e **Despesas do núcleo** não entraram — dependem de `unit_id`/`church_id`
  novo em `fin_contas_pagar`/`fin_caixa_diario`, que hoje não existe no schema (schema é 100%
  global, sem nenhum escopo por igreja). Criar essas colunas + RLS é trabalho de migration e
  precisa de uma conversa de regra de negócio antes (quem aprova despesa, limite de professor
  lançar sozinho, etc.) — combinado.
- **Configurações** ficou só leitura. Editar os próprios dados continua sendo "peça pra
  secretaria" por enquanto — dava pra reaproveitar o `ProfessorForm.tsx` que a secretaria já usa,
  mas isso significava mexer num formulário grande e validado sem necessidade imediata da Fase 1.

## Passo a passo pra validar

1. **Rodar o type-check e o lint** (meu ambiente de shell está indisponível nesta sessão —
   preciso que você rode e me cole o resultado, como vem fazendo o resto da sessão):
   ```powershell
   cd C:\Projetos\portal-teologico-os-staging
   npx tsc --noEmit
   npm run lint
   ```
2. Suba o dev server (`npm run dev`) e entre logado como um usuário professor.
3. **Dashboard (`/professor`)** — confirme que aparecem os 3 cards (Turmas, Alunos, A receber)
   com números batendo com o que você já conhece desse professor, e que cada card leva pra
   rota certa ao clicar.
4. **Turmas (`/professor/turmas`)** — confirme que a lista de turmas e o "Vincular a turma já
   existente" continuam idênticos a antes (nada mudou aqui além de tirar da mesma tela dos
   alunos).
5. **Alunos (`/professor/alunos`)** — confirme busca (nome/CPF/matrícula), filtro por turma,
   "Nova Matrícula" (inclusive o aviso de "sem turma vinculada" se for o caso), tabela
   expansível e "Dar baixa" numa parcela — depois da baixa você deve voltar pra esta mesma tela
   com a mensagem de sucesso.
6. **Financeiro (`/professor/financeiro`)** — confira os 3 cards de totais (a receber,
   recebido, total do núcleo), troque entre os filtros Pendente/Recebida/Todas, gere um QR Pix
   e dê baixa numa parcela por aqui — deve voltar pra esta mesma tela (não pra Alunos).
7. **Configurações (`/professor/configuracoes`)** — confirme que os dados aparecem certos.
8. Teste o menu lateral no mobile (recolhe/expande) e no desktop (ícone de colapsar).

## Depois de validado

- Nada disso vai pra produção até você confirmar que está tudo certo aqui em staging.

---

## Fase 2 — Caixa do núcleo (27/09/2026)

Implementada logo em seguida, já com as regras que você definiu:

- Só **despesas** (a entrada de dinheiro continua em Financeiro/`fin_contas_receber`, não
  duplica aqui).
- **Sem** abrir/fechar caixa — lançamento solto, direto.
- **Sem** aprovação da secretaria — o professor lança e apaga sozinho.

### O que foi criado

- **Migration `115_nucleo_despesas.sql`** (já aplicada em staging) — tabela `nucleo_despesas`
  (professor_id, church_id, categoria_id, descrição, valor, data, forma de pagamento) + RLS:
  professor só mexe nas próprias despesas, secretaria/admin enxerga tudo pra relatório (mesmo
  critério de unidade já usado em `professores`).
- `src/utils/professor.ts` — `checkIsProfessor()` agora também retorna `church_id` (precisava
  pra gravar a despesa vinculada à igreja certa).
- `src/app/[locale]/professor/actions.ts` — duas ações novas: `professorLancarDespesaAction` e
  `professorExcluirDespesaAction`.
- `src/app/[locale]/professor/caixa/page.tsx` + `CaixaDoNucleoPainel.tsx` — nova tela: card de
  total de despesas, botão "Lançar despesa" (modal com descrição, valor, data, categoria do
  plano de contas já existente, forma de pagamento) e tabela com opção de excluir.
- `Sidebar.tsx` — novo item "Caixa" no menu do professor.

### Como testar

1. Rode de novo o type-check e o lint (mesmo comando de sempre).
2. Entre em `/professor/caixa`.
3. Lance uma despesa de teste (ex.: "Material didático", R$ 50,00) e confirme que ela aparece
   na lista e no total.
4. Exclua a despesa de teste e confirme que some da lista e do total.
5. Se quiser, confira no banco (staging) que a linha ficou em `nucleo_despesas` com o
   `professor_id`/`church_id` certos.

---

## Ajustes do mesmo dia (27/09/2026), depois do primeiro teste seu

**Caixa do núcleo virou livro de entradas e saídas.** Antes só mostrava despesas; agora toda
parcela que você (ou a secretaria) dá baixa em Financeiro/Alunos aparece automaticamente aqui
como **Entrada** — não duplica dado nenhum, só lê o que já foi baixado em `fin_contas_receber`.
Despesas continuam como **Saída**, lançadas por você mesmo. A tela mostra Entradas, Saídas e
Saldo.

**Configurações deixou de ser só leitura.** Nome, e-mail, CPF, cargo, igreja e setor continuam
só a secretaria alterando (mesma tela de sempre). Telefone e foto agora você edita direto em
`/professor/configuracoes`.

**Ficha do professor (tela da secretaria) ganhou foto e observação**, e a caixa "Acesso ao
núcleo de ensino" mudou: o campo de e-mail que concedia acesso ficou bloqueado pra professor já
existente (evita reconceder acesso sem querer a cada "Salvar") — agora só mostra o e-mail de
login atual, como aviso. Texto da caixa aumentado, campo de Observação livre adicionado, e todas
as fontes do formulário ficaram pretas.

**Vender literatura da loja pelo painel do professor — fica pendente, tratado como Fase 3.**
Não implementado ainda. Quando quiser destravar isso, precisa decidir: o professor vende pra
quem (só os próprios alunos?), o estoque desconta de onde, e o dinheiro entra em qual caixa
(do núcleo ou o global da loja).

### Como testar esta rodada

1. `/professor/caixa` — dê baixa numa parcela em Alunos ou Financeiro e confirme que ela aparece
   aqui como Entrada, com o saldo recalculado.
2. `/professor/configuracoes` — troque o telefone e suba uma foto, confirme que salva.
3. Na tela da secretaria (`/dashboard/configuracoes/professores/editar/[id]`) — confirme que dá
   pra subir foto, escrever uma observação, e que o campo de e-mail de acesso aparece travado
   (não editável) pra professor já existente.

---

## Retoques finos do mesmo dia (27/09/2026), segunda rodada de ajustes

**`/professor/configuracoes`** — a foto voltou pro topo da caixa, ao lado do nome (antes tinha
ficado numa caixa separada embaixo). Continua editável clicando na foto.

**`/professor/caixa`** — modal "Lançar despesa": todas as fontes de texto (labels, título,
botões, campos) ficaram pretas.

**Ficha do professor (`/dashboard/configuracoes/professores/editar/[id]`)** — a caixa única
"Dados gerais professor" (campo/setor/igreja + dados do professor) teve dois ajustes de
posicionamento, sem mudar nenhuma lógica:

- O texto "Buscar (matrícula, CPF ou nome)" — que tinha ficado empilhado acima da caixa de
  busca — agora fica na mesma linha da caixa, e a fonte subiu mais 1pt
  (`BuscaProfessorCompleta.tsx`).
- O aviso "Vinculado ao cadastro de membro — código ..." — que tinha ficado embaixo da foto —
  agora fica embaixo do campo "Nome completo" (`ProfessorForm.tsx`). A coluna da foto ficou só
  com a foto.

### Como testar esta rodada

1. `/professor/configuracoes` — confirme que a foto aparece no topo, ao lado do nome.
2. `/professor/caixa` — abra "Lançar despesa" e confirme que todo o texto do modal está preto.
3. `/dashboard/configuracoes/professores/editar/[id]` (professor com matrícula vinculada) —
   confirme que "Buscar (matrícula, CPF ou nome)" e a caixa de busca ficam na mesma linha do
   título "Dados gerais professor", e que o aviso "Vinculado ao cadastro de membro" aparece
   embaixo do campo Nome completo (não mais embaixo da foto).
4. Rode de novo `npx tsc --noEmit` e `npm run lint` pra confirmar que continua tudo limpo.

---

## Terceiro retoque do mesmo dia (27/09/2026)

Depois do teste anterior, mais três ajustes finos na tela
`/dashboard/configuracoes/professores/editar/[id]`, todos em `ProfessorForm.tsx`
(nenhuma mudança de lógica/regra de negócio):

- **A busca por matrícula/CPF/nome sumiu da tela de edição.** Fazia sentido só na hora de
  cadastrar um professor novo a partir de um membro (`/novo/membro`) — na tela de edição você já
  está dentro da ficha do professor, então buscar de novo não fazia sentido. Ela continua
  aparecendo normalmente em `/novo/membro`. (`mostrarBusca={false}` passado só na página de
  editar.)
- **"Vinculado ao cadastro de membro" saiu de dentro da caixa "Nome completo".** Antes esse
  aviso ficava dentro da borda da caixa, junto com o valor do nome — agora fica embaixo da
  caixa, fora da borda. Continua aparecendo mesmo com a busca escondida, sempre que o professor
  tiver matrícula vinculada.
- **Foto e os campos ao lado ficaram centralizados um com o outro** (antes o alinhamento
  vertical era pelo topo).

### Como testar esta rodada

1. `/dashboard/configuracoes/professores/editar/[id]` — confirme que não aparece mais a caixa de
   busca no topo da seção "Dados gerais professor".
2. Confirme que "Vinculado ao cadastro de membro — código ..." aparece embaixo da caixa "Nome
   completo", fora da borda dela.
3. Confirme visualmente que a foto e a coluna de campos ao lado estão alinhadas ao centro uma da
   outra.
4. `/dashboard/configuracoes/professores/novo/membro` — confirme que a busca continua aparecendo
   normalmente aqui (não foi removida dessa tela).
5. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Quarto retoque do mesmo dia (27/09/2026)

Na tela de edição, com a busca escondida (retoque anterior), a caixa "Código de cadastro"
aparecia sozinha numa segunda linha, porque as 4 caixas (Campo, Setor, Igreja, Código de
cadastro) eram todas `col-span-4` — 4×4 = 16, estourava os 12 da grid e quebrava linha. Ajuste:
quando as 4 aparecem juntas (tela de edição, sem busca), cada uma vira `col-span-3` (3×4 = 12,
cabe certinho numa linha só); quando só 3 aparecem (Campo/Setor/Igreja na tela de novo professor,
com busca visível), continuam `col-span-4` como antes. Nenhuma caixa aumentou de tamanho, só
passaram a caber na mesma linha.

### Como testar esta rodada

1. `/dashboard/configuracoes/professores/editar/[id]` — confirme que Campo, Setor, Igreja e
   Código de cadastro aparecem todos na mesma linha.
2. Confirme visualmente que o bloco de 2 linhas (Campo/Setor/Igreja/Código + Nome/Cargo/Telefone)
   fica centralizado verticalmente com a foto.
3. `/dashboard/configuracoes/professores/novo/membro` — confirme que Campo/Setor/Igreja
   continuam do mesmo tamanho de antes (sem a busca, a tela de edição é a única com 4 caixas).
4. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Quinto retoque do mesmo dia (27/09/2026)

**`/professor/configuracoes`** — o quadro com os dados do professor (foto, nome, e-mail, CPF,
cargo, igreja, setor, telefone) subiu pra logo abaixo do título "Configurações" (antes vinha
depois do aviso). O aviso "Nome, CPF, cargo, igreja e setor só a secretaria altera..." desceu
pra depois do quadro, ficou 2pt maior, em caixa alta, e todos os textos desta tela (título,
labels, valores, aviso) ficaram pretos.

**`/professor` (Dashboard)** — a saudação "Olá, {nome}" agora sempre mostra o primeiro e o
último nome (ex.: "Joaquim Mario Soares Coelho" → "Olá, Joaquim Coelho"), não só o primeiro nome
como antes. Todos os textos desta tela (saudação, subtítulo, cards, "Próximos passos") ficaram
pretos.

### Como testar esta rodada

1. `/professor/configuracoes` — confirme que o quadro de dados aparece logo abaixo do título, e
   o aviso sobre o que é editável aparece depois dele, maior, em caixa alta e preto.
2. `/professor` — confirme que a saudação mostra primeiro e último nome, e que não sobrou texto
   em cinza/azul nesta tela.
3. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Fora do Painel do Professor: confirmação de parcelas em Nova Matrícula Direta (27/09/2026)

Pedido à parte, em `/admin/matriculas/nova` (não é parte do Painel do Professor, mas foi pedido
na mesma sessão). Antes, ao clicar "Gerar matrícula", as parcelas eram geradas direto (1 por mês
a partir do 1º vencimento, sem revisão). Agora abre um modal de confirmação antes de gravar
qualquer coisa.

### O que foi criado/mudado

- **Novo campo "Aluno já estuda desde antes?"** na caixa de Pagamento — Sim/Não. Decide o
  estado inicial das parcelas no modal de confirmação.
- **`ConfirmarParcelasModal.tsx`** (novo) — mostra: data da matrícula (hoje), nº de parcelas, e
  uma tabela com cada parcela (vencimento, valor, checkbox "já paga"). Datas calculadas 1 por mês
  a partir do 1º vencimento informado; se o dia calculado cair num sábado ou domingo, empurra pro
  próximo dia útil (só aquela parcela — as outras continuam calculadas a partir da data
  ORIGINAL do 1º vencimento, não em cadeia a partir de uma data já empurrada). Feriados nacionais
  ficam de fora por enquanto — só fim de semana (decisão do Joaquim, evita eu chutar uma lista de
  feriados móveis incompleta/errada).
  - "Não" (matrícula nova) → nenhuma parcela vem marcada como paga.
  - "Sim" (aluno já estuda desde antes) → parcelas com vencimento até o mês atual (mês do
    lançamento) já vêm marcadas; a secretaria pode desmarcar/marcar antes de confirmar.
- **`NovaMatriculaForm.tsx`** — o botão "Gerar matrícula" não submete mais direto: valida o
  formulário (`reportValidity`), CPF e a regra de origem, calcula a prévia de parcelas e abre o
  modal (se não houver mensalidade — curso gratuito —, gera direto, sem modal). Ao confirmar, as
  datas/valores/status decididos no modal vão junto no envio.
- **`actions.ts` (`matricularDiretoAction`)** — se vier a confirmação de parcelas
  (`parcelas_mensalidade_json`), grava exatamente essas linhas em `fin_contas_receber` (com
  `status: "PAGO"` e `pago_em` preenchido pras marcadas); sem isso (chamadores antigos), continua
  no cálculo automático de sempre — nada quebrou pra quem já usava.

---

## Rodada seguinte, mesmo dia (27/09/2026) — Matrícula na Área do Professor + ajustes de UI

### Ficha completa de Nova Matrícula também na Área do Professor

- Item **"Matrícula"** na sidebar do professor, logo abaixo de Dashboard, apontando pra
  `/professor/matricula` — a mesma ficha completa de `/admin/matriculas/nova` (mesmas regras de
  preenchimento e de pagamento), reaproveitada via `ProfessorNovaMatriculaForm.tsx` com as props
  `autoAbrir`/`voltarHref` pra renderizar inline na página (não mais como modal flutuante — isso
  foi um bug corrigido nesta rodada) em vez de só como modal disparado por botão.
- O botão "Nova Matrícula" saiu de `/professor/alunos` (a rota `/professor/matricula` é o caminho
  único agora).
- `professorCriarMatriculaAction` ganhou o mesmo suporte a `parcelas_mensalidade_json` e aos
  campos de valor/parcela/forma de pagamento que a versão admin já tinha.

### Foto do professor: da sidebar pro Dashboard

- A foto abaixo do nome, na sidebar, **saiu** — não ficou boa ali (feedback direto do Joaquim).
- Foi pro Dashboard (`/professor`), ao lado esquerdo do "Olá, {nome}".

### Configurações: professor edita os próprios dados

- O aviso "Nome, CPF, cargo, igreja e setor só a secretaria altera..." foi removido.
- `ConfiguracoesPainel.tsx` virou formulário completo: Nome, CPF (com validação), Cargo, Setor/
  Igreja (mesmo padrão de seleção com SEDE-como-opção-dentro-de-Setor já usado em
  `ProfessorForm.tsx`/`ProfessorNovaMatriculaForm.tsx`), Telefone e foto — tudo editável pelo
  próprio professor. Só o e-mail de login continua fora (é conta, não ficha).
- `professorAtualizarPerfilAction` persiste todos os campos novos e revalida `/professor` além de
  `/professor/configuracoes`, pra saudação/foto do Dashboard atualizarem na hora.

### Nova Matrícula: toggle "Aluno já estuda desde antes?" removido

- Pedido do Joaquim: a data do 1º vencimento já diz sozinha se é matrícula nova (datas
  futuras/atuais) ou aluno antigo sendo lançado agora (datas passadas) — o toggle manual era
  redundante.
- Removido de **`NovaMatriculaForm.tsx`** (admin) e **`ProfessorNovaMatriculaForm.tsx`**
  (professor). Em ambos, o estado inicial de "já paga" no `ConfirmarParcelasModal` agora vem
  só de comparar `vencimentoOriginal <= hoje` — sem toggle nenhum. `ConfirmarParcelasModal.tsx`
  perdeu o prop `jaEstudaAntes` e a coluna de explicação condicional (virou uma frase fixa).
- Na versão do professor, "Data da matrícula" passou a vir preenchida com a data atual do sistema
  por padrão (igual "1º vencimento") — o professor edita pra uma data passada quando for lançar
  aluno antigo, e são essas datas que decidem sozinhas o que já vem marcado como pago.

### Dashboard: gráfico "Alunos por turma" + resumo "Financeiro do mês"

- Escolhido via pergunta ao Joaquim entre as opções de expansão do Dashboard: "Alunos por turma +
  financeiro do mês".
- Gráfico de barras horizontais (CSS puro, sem lib nova) com a quantidade de alunos matriculados
  por turma vinculada ao professor (`professor_turmas` + contagem de `ead_matriculas` por
  `course_edition_id`), até 6 turmas, ordenado do maior pro menor.
- Bloco "Financeiro do mês", com dois sub-blocos:
  - **Caixa**: entradas do mês (parcelas com `pago_em` dentro do mês corrente) x saídas do mês
    (`nucleo_despesas` com `data_despesa` no mês corrente).
  - **Financeiro (parcelas do mês)**: a receber (parcelas pendentes com vencimento no mês
    corrente) x recebido (mesmo valor de entradas do Caixa, calculado uma vez só).
- **Correção no mesmo dia**: virou "Alunos por curso" — o agrupamento original por
  `course_edition_id` (turma) mostrava duas barras iguais/idênticas quando duas turmas diferentes
  tinham o mesmo nome (ex.: "2026 Turma 1" de dois cursos), sem distinção nenhuma. Passou a agrupar
  por curso (`ead_matriculas.course_id`, rótulo = `curso_nome_snapshot`, já gravado por matrícula —
  sem precisar de outra tabela).

---

## Fora do Painel do Professor, mesmo dia (27/09/2026) — Conferência de mensalidades (mutirão)

Dois ajustes na última etapa do mutirão de cadastro (`/completar-cadastro/pagamento`, aluno
confirmando quais mensalidades já pagou no primeiro acesso):

- **Data-âncora corrigida**: o cálculo de "quantos meses já decorridos" priorizava
  `turma.data_inicio` sobre `matricula.data_matricula` — então mesmo o aluno informando
  corretamente "26/01/2026" no link de inscrição (`/matricula-turma/[token]`), a tela de
  conferência calculava a partir de 01/01/2026 (data de início da turma), ignorando o que ele
  tinha digitado. Invertida a prioridade: `data_matricula` > `data_inicio` da turma > hoje.
- **Aviso da tela com ícone de alerta vermelho**: piscando 2x ao abrir (animação CSS nova,
  `.animate-alert-blink-twice` em `globals.css`, sem loop), texto alinhado à direita do ícone.
- **Data de cada parcela paga = vencimento do mês, não "hoje"**: em
  `PagamentoInicialAlunoForm.tsx`, ao marcar parcela(s) como já pagas (uma por uma ou via
  "Selecionar todas") sem digitar uma data manualmente, o campo de data de cada linha agora vem
  pré-preenchido com o vencimento daquele mês (1º vencimento + N-1 meses) em vez de ficar em
  branco — antes, em branco, o servidor gravava `pago_em = agora` pra todas, e o Caixa do núcleo
  mostrava um núcleo inteiro de mensalidades "pagas hoje" mesmo pra aluno antigo lançando 9 meses
  retroativos de uma vez. O aluno ainda pode sobrescrever a data de qualquer linha manualmente.
- **Label visível na data de referência**: o campo ao lado de "Quantos meses já decorridos" só
  tinha `aria-label` (nada visível na tela) — ganhou o rótulo "Data do 1º pagamento/vencimento".

### Financeiro do núcleo (`/professor/financeiro`) — filtros por data/turma/curso (27/09/2026)

- Tentativa inicial: bloco "A receber do mês, por curso" (caixas expansíveis por curso + total).
  Revertido no mesmo dia a pedido do Joaquim ("não era isso, voltar como estava") — o layout
  original de 3 cards + filtro A receber/Recebidas/Todas + tabela voltou como estava antes.
- No lugar, foram acrescentados 3 filtros na extremidade direita da mesma linha dos botões
  A receber/Recebidas/Todas: **data** (mês de vencimento), **turma** e **curso** — todos com opção
  "Todas"/"Todos" (sem filtro) por padrão.
- `FinanceiroDoNucleoPainel.tsx` ganhou os campos `cursoNome` e `turmaNome` no tipo
  `ParcelaComAluno`, preenchidos em `page.tsx` a partir de `ead_matriculas.curso_nome_snapshot`
  (curso) e `course_editions.nome` (turma) — sem precisar de tabela nova.

### Como testar

1. `/admin/matriculas/nova` — preencha uma matrícula com curso que tenha mensalidade (valor de
   parcela > 0).
2. Deixe "Aluno já estuda desde antes?" em "Não" e clique "Gerar matrícula" — confirme que abre o
   modal, com as parcelas certas (1 por mês) e nenhuma marcada como paga.
3. Escolha um 1º vencimento que caia perto de um fim de semana e confirme que a parcela
   correspondente aparece com a data ajustada pro próximo dia útil, com a nota "era .../ajustado".
4. Cancele, marque "Sim" em "Aluno já estuda desde antes?" e clique de novo em "Gerar matrícula"
   — confirme que as parcelas até o mês atual já vêm marcadas.
5. Confirme e gere a matrícula; confira em Financeiro > Contas a Receber que as parcelas
   marcadas entraram como PAGO (com `pago_em`) e as demais como PENDENTE, nas datas certas.
6. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Área do Professor: ficha completa de Nova Matrícula + foto na sidebar (27/09/2026)

Três pedidos do Joaquim, todos na Área do Professor:

1. **Foto do professor na sidebar** — aparece agora embaixo do nome, no topo do menu lateral
   (`Sidebar.tsx`), quando o professor já tiver foto cadastrada em Configurações.
2. **Item "Matrícula" na sidebar**, logo abaixo de "Dashboard", levando pra
   `/professor/matricula` (rota nova).
3. **`/professor/matricula`** abre a mesma ficha completa de Nova Matrícula que a Alunos usava
   (modal), só que como página própria (sem o botão de gatilho — abre direto) e agora com **as
   mesmas regras de pagamento da Nova Matrícula Direta da secretaria**:
   - Caixa de Pagamento (valor da matrícula, valor da parcela, nº de parcelas, forma de
     pagamento) pré-preenchida pelo `course_pricing` do curso da turma escolhida — o professor
     pode sobrescrever pontualmente, igual à ficha da secretaria.
   - Campo "Aluno já estuda desde antes?" e o mesmo modal de confirmação de parcelas
     (`ConfirmarParcelasModal.tsx`, reaproveitado do admin) — vencimento calculado 1/mês a partir
     do 1º vencimento, empurrando fim de semana pro próximo dia útil, com "já paga" pré-marcado
     até o mês atual quando o aluno já estuda desde antes.
   - `professorCriarMatriculaAction` (actions.ts) atualizada pra usar os valores digitados (com
     fallback pro `course_pricing` se a secretaria/professor não mudou nada) e pra gravar as
     parcelas confirmadas no modal, mesmo padrão da action da secretaria.
   - O botão "Nova Matrícula" que ficava dentro de `/professor/alunos` foi removido — a ficha só
     é acessada pelo item da sidebar agora.

### Como testar

1. Confirme que a foto do professor aparece na sidebar, embaixo do nome (se ele já tiver foto
   em Configurações).
2. Clique em "Matrícula" no menu — confirme que abre a ficha completa direto (sem precisar
   clicar em nenhum botão "Nova Matrícula").
3. Escolha uma turma e confirme que Pagamento vem preenchido com o preço do curso.
4. Clique "Matricular" com mensalidade > 0 — confirme que abre o modal de confirmação de
   parcelas, igual ao da secretaria.
5. Confirme que `/professor/alunos` não tem mais o botão "Nova Matrícula".
6. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Rodada de correções (28/09/2026) — cadastro de professor, provas e navegação

Seis achados de teste do Joaquim, a maioria fora do Painel do Professor em si mas no fluxo de
cadastro/avaliação que ele usa:

- **Badge "De fora" incorreto** — mostrava "De fora" pra todo professor cadastrado com
  Setor/Igreja preenchidos (ou seja, quase todos), porque o badge estava lendo
  `tipo_professor`/`member_id` (resultado da busca de membro), não a ROTA de cadastro usada.
  Nova coluna `professores.veio_de_fora` (migration `117_professores_veio_de_fora.sql`), gravada
  só na criação (`true` apenas quando vem de `/novo/externo`, nunca reescrita na edição).
  `professores/page.tsx` e `ProfessorForm.tsx` atualizados.
- **Foto anexada na ficha do professor nunca persistia** — `salvarFichaProfessorAction`
  (`completar-cadastro/actions.ts`) nunca lia `foto_url`/`observacoes` do FormData. Corrigido, e o
  select de pré-preenchimento em `completar-cadastro/page.tsx` também ganhou esses dois campos.
- **RG sem máscara na ficha do aluno** — `EditarMatriculaForm.tsx` era a única tela do sistema sem
  máscara no campo RG (Professor e Membro já tinham). Extraído `src/utils/maskRG.ts` (compartilhado)
  e aplicado aqui, mesmo padrão de reformatar o valor a cada tecla sem virar input controlado.
- **"REGIONAL 001" sumindo do dropdown de Setor** (ficha de professor) — não era bug de dado (a
  Regional existe e a query estava certa): `ProfessorForm.tsx` nunca ordenava as listas de
  Setor/Igreja com `.sort()` (diferente de `TurmasDoProfessor.tsx`, que já ordenava) — os itens
  vinham em ordem arbitrária do Postgres, então "sumir" era só estar fora da área visível da rolagem.
  Corrigido com o mesmo `.sort(localeCompare)` já usado em outras telas.
- **Prova liberada sem concluir todos os testes da matéria** — a checagem só existia (com bug) na
  UI de `/portal/testes/[lessonId]`; nunca no servidor. Agora `page.tsx` mostra a Prova bloqueada
  com contador (`X/4 concluídos`) até terminar os 4 testes parciais, e `iniciarTesteLicaoAction`
  (`actions.ts`) barra a criação da Prova no servidor também, mesmo sem passar pela UI.
- **"Voltar" depois de um teste não retornava pra "Simulados e Provas"** — bug com 3 causas juntas
  em `/portal/avaliacoes` e `/portal/testes/[lessonId]`(`/[avaliacaoId]`): (1) `avaliacoes/page.tsx`
  repassava seu próprio `voltarHref` recebido (que aponta pra fora, pra `/escola/[curso]`) direto
  pros links dos testes, em vez de embrulhar apontando de volta pra si mesma; (2) os formulários de
  "começar teste do zero" e "iniciar prova" nunca carregavam o campo oculto `voltar` (só os links de
  "continuar um teste em andamento" carregavam); (3) o formulário de "enviar respostas" também não
  carregava `voltar`, e o redirect de sucesso do servidor descartava o que houvesse. Os três pontos
  foram corrigidos juntos — corrigir só um deixaria o bug aparecer sempre que o aluno começasse um
  teste do zero (era exatamente o caso reportado).

### Como testar

1. Cadastre um professor por `/dashboard/configuracoes/professores/novo/membro` (com Setor/Igreja)
   e confirme que aparece "Membro", não "De fora".
2. Cadastre outro por `/dashboard/configuracoes/professores/novo/externo` e confirme "De fora".
3. Complete a ficha de um professor pendente anexando foto — confirme que ela aparece depois na
   listagem e na própria ficha.
4. Edite uma matrícula de aluno e digite um RG — confirme que a máscara `00.000.000-0` aparece.
5. Na ficha de professor (`/novo/membro` ou editar), abra o dropdown de Setor e confirme que
   "REGIONAL 001" aparece na lista (ordenada).
6. Como aluno, em Testes e Prova de uma matéria, confirme que "Iniciar prova" só aparece depois de
   concluir os 4 testes parciais (antes disso mostra o contador bloqueado).
7. Como aluno, comece um teste do zero (não "continuar"), finalize, e confirme que "VOLTAR" retorna
   pra "Simulados e Provas" (não pra tela de matéria/curso).
8. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Edição completa do aluno pela Área do Professor (28/09/2026)

Pedido do Joaquim: *"preciso editar aluno, para corrigir dados caso cadastre informação errada
pessoal, curso e finaceiro, igreja setor, ou seja edição completa"*, a partir de
`/professor/alunos`. Em vez de criar uma tela nova do zero, reaproveita a MESMA ficha completa que
a secretaria já usa em `/admin/matriculas/[id]` (`EditarMatriculaForm.tsx`) — pessoal, curso/turma,
endereço, pagamentos (dar baixa, cancelar parcela, lançar retroativo, gerar mensalidade faltante) e
cancelar matrícula.

### O que mudou

- **`EditarMatriculaForm.tsx` parametrizado** — os 4 formulários embutidos que antes chamavam
  direto as Server Actions staff-only (`baixarParcelaAction`, `cancelarParcelaAction`,
  `lancarPagamentoRetroativoAction`, `cancelarMatriculaAction`, `gerarParcelasMensalidadeAction`)
  agora aceitam cada um como prop opcional — sem passar nada, a tela do admin continua idêntica
  (cai nas actions de sempre). Também ganhou `travarProfessorId` (trava o campo "Professor(a)" no
  próprio professor, sem `<select>` pra reatribuir o aluno a outro — isso continua decisão da
  secretaria) e `redirectToBaixa` (pro campo oculto `redirect_to` que `professorBaixarParcelaAction`
  já aceitava).
- **5 novas Server Actions em `professor/actions.ts`**: `professorAtualizarMatriculaAction`,
  `professorCancelarParcelaAction`, `professorLancarPagamentoRetroativoAction`,
  `professorGerarParcelasMensalidadeAction`, `professorCancelarMatriculaAction` — espelham a lógica
  das versões admin, mas cada uma confere primeiro que a matrícula pertence ao professor logado
  (`ead_matriculas.professor_id === professor.id`) antes de tocar em qualquer dado, mesma régua de
  segurança já usada em `professorBaixarParcelaAction`/`professorCriarMatriculaAction`. Pagamento
  retroativo em dinheiro continua bloqueado pro professor (exige Caixa Diário, controle de
  secretaria) — mesma regra de `professorBaixarParcelaAction`. Troca de Turma só aceita uma turma
  que o próprio professor já leciona (`professor_turmas`); Curso continua não-editável aqui, igual
  pro admin.
- **Rota nova `/professor/alunos/editar/[id]`** — busca a matrícula + aluno, confere a posse,
  carrega as mesmas listas de apoio (campos, igrejas, setores, profissões, escolaridade, gênero,
  estado civil, pagamentos) e as turmas do PRÓPRIO professor (via `professor_turmas`), e renderiza
  `EditarMatriculaForm` com as 5 actions escopadas acima.
- **Botão "Editar cadastro completo"** — adicionado em `ProfessorPainel.tsx` (tela `/professor/
  alunos`), dentro da linha expandida de cada aluno, ao lado da data de matrícula.

### Como testar

1. `/professor/alunos` — expanda um aluno e clique em "Editar cadastro completo".
2. Confirme que abre a mesma ficha completa da secretaria, com "Professor(a)" travado em você
   (sem dropdown) e "Curso" travado (não editável), mas Turma trocável só entre as suas próprias.
3. Altere um dado pessoal (telefone, endereço) e salve — confirme que grava e mostra "Dados
   atualizados.".
4. Dê baixa numa parcela (Pix/cartão) — confirme que funciona e volta pra esta mesma tela de edição
   (não pra `/professor/alunos`).
5. Tente lançar um pagamento retroativo em Dinheiro — confirme que é recusado com a mensagem sobre
   Caixa Diário.
6. Cancele uma parcela e, depois, cancele a matrícula inteira — confirme os dois fluxos.
7. Tente abrir a URL de edição de um aluno de OUTRO professor (trocando o id na URL) — confirme que
   redireciona pra `/professor/alunos` com "Esse aluno não pertence a você.".
8. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Retoques de teste (28/09/2026) — ficha de Nova Matrícula, modal de parcelas, botão de edição

Quatro achados de teste do Joaquim em `/professor/matricula` e telas relacionadas:

- **RG sem máscara** em `ProfessorNovaMatriculaForm.tsx` — única ficha que ainda faltava (as outras
  já usavam `src/utils/maskRG.ts`). Corrigido.
- **Sexo/Estado civil em caixa baixa/mista** ("Masculino", "Solteiro(a)") — os `<select>` não tinham
  a classe `uppercase` que o resto da ficha tem. Adicionada (só a exibição muda, o valor gravado é o
  mesmo de sempre).
- **Modal "Confirmar parcelas da matrícula" pedindo rolagem** com 12 parcelas — `max-h` subiu de
  `90vh` pra `97vh` e o espaçamento vertical das linhas da tabela diminuiu um pouco, pra caber a
  lista inteira sem rolar na maioria das telas.
- **Botão "Editar cadastro completo"** (`/professor/alunos`) — trocado pra fundo preto/texto branco.

### Como testar

1. `/professor/matricula` — digite um RG e confirme a máscara `00.000.000-0`; confirme que "Sexo" e
   "Estado civil" aparecem em maiúsculo no `<select>`.
2. Gere uma matrícula com 12 parcelas e confirme que o modal mostra a lista inteira sem precisar
   rolar (ou rolando bem menos que antes).
3. `/professor/alunos` — confirme que "Editar cadastro completo" está com fundo preto e texto branco.
4. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Conferência de mensalidades (`/completar-cadastro/pagamento`) — redesenho pra tabela + resumo (28/09/2026)

Pedido do Joaquim depois de perguntar por que essa tela era menos intuitiva que o modal "Confirmar
parcelas da matrícula" da Nova Matrícula Direta: alinhar visualmente as duas. Fora do Painel do
Professor em si (é a tela que o ALUNO vê no primeiro acesso, vindo do link de inscrição), mas parte
do mesmo fluxo de matrícula/pagamento mexido nesta sessão.

### O que mudou

- **`PagamentoInicialAlunoForm.tsx` reescrito** — a lista de cartões avulsos (um por parcela, com
  checkbox + data + forma soltos dentro de cada cartão) virou uma tabela única, mesmo padrão visual
  de `ConfirmarParcelasModal.tsx` (admin/matriculas/nova): colunas Parcela / Vencimento / Valor /
  Forma e data do pagamento / Já paga, com a linha marcada destacada em verde claro, e um resumo no
  rodapé ("Já paga: R$ X,xx" ou "Nenhuma parcela marcada como paga.").
- **Vencimento agora aparece calculado na própria tabela** (1º vencimento + N-1 meses) — antes só
  aparecia implicitamente ao preencher a data manualmente; agora toda parcela mostra a data de
  referência mesmo antes de ser marcada.
- **Nenhum campo do formulário mudou de nome** — `pago_N`, `data_N`, `forma_N`,
  `total_parcelas_exibidas`, `data_inicio` continuam exatamente iguais;
  `salvarPagamentoInicialAlunoAction` (`completar-cadastro/actions.ts`) não precisou de nenhuma
  mudança.
- O bloco de configuração no topo (curso/mensalidade, "quantos meses já pagou", data de referência,
  "Selecionar todas") continua igual — só a lista de parcelas abaixo dele mudou de cartões pra
  tabela.

### Como testar

1. Abra o link de uma turma, complete a ficha de um aluno novo e chegue em "Conferência de
   mensalidades".
2. Confirme que as parcelas aparecem numa tabela única (não mais cartões separados), com a coluna
   Vencimento já preenchida mesmo antes de marcar qualquer uma.
3. Marque algumas parcelas como pagas, ajuste data/forma de uma delas, e confirme que o resumo no
   rodapé ("Já paga: R$ ...") soma corretamente.
4. Clique "Selecionar todas" e confirme que todas as datas vêm preenchidas com o vencimento de cada
   mês (comportamento antigo preservado).
5. Conclua o cadastro e confira em Financeiro > Contas a Receber que as parcelas marcadas entraram
   como PAGO nas datas certas — igual comportamento de antes do redesenho.
6. Rode de novo `npx tsc --noEmit` e `npm run lint`.

---

## Professor criar a própria turma (28/09/2026) — reversão da regra de 21/09/2026

Até 21/09/2026, "Criar Turma" tinha sido removida de propósito de `/professor/turmas` — regra era
"professor NUNCA cria turma pelo próprio painel, só vincula a uma que a secretaria já cadastrou".
Pedido do Joaquim reverte essa decisão: o professor volta a poder criar a própria turma, na mesma
tela onde já vincula turmas existentes.

### O que mudou

- **Nenhuma Server Action nova.** `professorCriarTurmaAction` (`professor/actions.ts`) já existia
  desde 18/09/2026 — foi construída pro fluxo de mutirão (primeiro login em `/completar-cadastro`)
  e já fazia tudo num passo só: cria `course_editions`, cria o vínculo `professor_turmas` (com
  `link_token` automático) e redireciona de volta com o link pronto. Só não tinha mais nenhuma UI
  ativa que a chamasse fora daquele fluxo de primeiro acesso.
- **`TurmasDoProfessor.tsx`** ganhou um novo bloco "Criar turma nova" (aberto por padrão, acima de
  "Vincular a turma já existente"): cascata Setor/Regional → Igreja (mesmo padrão já usado na busca
  de turma existente), Curso, Nome da turma, Classe (opcional), Turno, Dia da semana, Data
  início/fim (opcionais) — chama `professorCriarTurmaAction` direto via `<form action={...}>`
  (Server Action com redirect, sem passo intermediário de "vincular" depois de criar).
- Igual à busca de turma existente, o professor pode escolher **qualquer** Setor/Regional/Igreja
  cadastrada no sistema, não só a própria — mesmo nível de acesso que já existia pra "vincular a
  turma já existente" (que já permitia buscar turma em qualquer igreja). Não é uma trava nova nem
  uma abertura nova de permissão.

### Como testar

1. Crie um professor de teste (`/cadastro-professor` ou pela secretaria) só pra esta validação.
2. `/professor/turmas` — confirme que "Criar turma nova" aparece aberta por padrão, antes de
   "Vincular a turma já existente".
3. Escolha Setor/Regional, Igreja, Curso, preencha Nome/Turno/Dia da semana e clique "Criar turma e
   gerar link" — confirme que volta pra esta mesma tela com a mensagem de sucesso e a turma nova já
   aparece na lista "Minhas Turmas", com o link de matrícula pronto pra copiar.
4. Abra o link gerado (`/matricula-turma/[token]`) numa aba anônima e confirme que a matrícula
   pública funciona normalmente pra essa turma nova.
5. Apague o professor de teste (e a turma/matrícula gerada) depois de validar.
6. Rode de novo `npx tsc --noEmit` e `npm run lint`.
