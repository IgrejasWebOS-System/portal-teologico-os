# Design System — portal-teologico-os / CETADP

Este documento registra o padrão visual e de layout já em uso no projeto,
para que qualquer tela nova (feita por humano ou por IA) mantenha
consistência com o que já existe. Leia isto antes de criar uma página ou
componente novo.

---

## 1. Tokens de design (`src/app/globals.css`)

Toda cor, raio e sombra do projeto vem de um único bloco `@theme` (Tailwind
v4), batizado **"IgrejasWebOS Design System v1.0"**. Nunca usar hex solto
num componente — sempre um destes tokens:

| Categoria | Tokens | Uso |
|---|---|---|
| Base | `iw-navy` (#111111) | Texto principal, títulos, fundos escuros institucionais |
| Ação | `iw-blue` (#BCE5FF), `iw-sky` (#88CDF6) | Hover, bordas suaves, variante `outline` do Button — **não é mais a cor de botão primário** (ver nota abaixo) |
| Destaque | `iw-gold` (#C5A059), `iw-gold-alt` (#D4AF37) | Badges, ícones de sistema, CTAs de destaque (dourado = identidade CETADP) |
| Neutros | `iw-bg` (#E8E8E8), `iw-surface` (#FFFFFF), `iw-muted`, `iw-border` | Fundo de página, cards, texto secundário, bordas |
| Semânticas | `iw-success`/`-bg`, `iw-error`/`-bg`, `iw-warning`/`-bg` | Estados de feedback (sempre com a variante `-bg` para fundo claro do alerta) |
| Forma | `--radius-sm` a `--radius-full`, `--shadow-sm/md/lg` | Cantos e sombras — usar via `rounded-[var(--radius-xl)]` etc. |

Tipografia: **Inter** (corpo, via `next/font/google`) + **Merriweather**
(serifada, só em `h1–h6`) — definidas uma vez em `src/app/layout.tsx` e
aplicadas globalmente em `globals.css`. Não importar outras fontes.

## 2. Utilitário de classes

`src/utils/cn.ts` combina `clsx` + `tailwind-merge`. Todo componente que
aceita `className` deve mesclá-lo com `cn(...)`, nunca concatenar strings
manualmente.

## 3. Biblioteca de componentes (`src/components/ui`)

"CyberOS UI Framework v1.0". Importar sempre do barrel `@/components/ui`:

- **Button** — variantes `primary/secondary/outline/ghost/danger`, tamanhos `sm/md/lg`, suporta `loading`, `leftIcon`, `rightIcon`.
- **Card** — variantes `base/elevated/interactive/warning/danger` + slots `CardHeader/CardBody/CardFooter` + `StatCard` pronto para dashboards.
- **Input** — família `Label`, `FieldWrapper` (label + erro/dica prontos), `TextInput`, `PasswordInput` (toggle de visibilidade embutido), `SelectInput`.
- **Badge** — variantes `default/primary/success/warning/danger/gold`, tamanhos `sm/md`.

Regra: **toda tela nova usa esses primitivos**, não escreve `<button>`/`<input>` cru. A tela de login (`(auth)/login/page.tsx`) foi migrada para esse padrão em 2026-07-12 e serve de referência de como usar `Label` + `TextInput`/`PasswordInput` + `Button` (via um pequeno client component `LoginButton.tsx` para o estado de `loading` com `useFormStatus`).

**Cor de botão primário — decisão do Joaquim em 18/09/2026:** todo botão
primário do sistema usa fundo **`#CF8403`** (texto branco), sem excessão.
`Button` (variante `primary`, `src/components/ui/Button.tsx`) já está
fixado nesse hex — não usar `iw-blue` nem outro laranja/dourado próximo
(ex.: o antigo `#E88D0C`) em botão novo. Telas que ainda escrevem
`<button>` cru em vez do primitivo (ex.: formulários públicos de
autocadastro, `ProfessorForm.tsx`) devem seguir a mesma cor manualmente
até serem migradas pro primitivo — não é uma migração retroativa
automática de toda a base, só a cor precisa bater desde já.

**Botão "VOLTAR" — decisão do Joaquim em 19/09/2026:** todo botão de
navegação "Voltar" do sistema usa o mesmo padrão visual, aplicado em
rollout gradual (não é retroativo automático em massa — cada tela é
revisada/ligada uma a uma, mas já está aplicado nas ~55 ocorrências
existentes até esta data):

- Fundo `#0D0D0D` (preto), borda **2px** `#CF8403`, texto `#CF8403` em
  caixa alta (`uppercase`).
- Ícone `ArrowLeft` (lucide-react) antes do texto.
- Texto é **sempre só a palavra "VOLTAR"** (ou a tradução em caixa alta:
  `BACK` em en-US, `VOLVER` em es-419) — nunca "Voltar para X" ou frase
  maior, mesmo que o botão anterior tivesse mais informação.
- O destino (`href`) de cada botão é revisado individualmente ao aplicar
  o padrão — em algumas telas o "Voltar" antigo apontava para o lugar
  errado; corrigir isso faz parte do mesmo procedimento, não é uma
  segunda etapa.

Implementação: o componente compartilhado `PageHeader`
(`src/components/layout/PageHeader.tsx`) tem uma prop `backNovoPadrao?:
boolean` — quando `true`, força esse visual e o texto "VOLTAR",
ignorando `backLabel`. O wrapper local
`src/app/[locale]/(igreja)/dashboard/configuracoes/PageHeader.tsx`
repassa essa mesma prop. Botões escritos à mão (fora do `PageHeader`,
ex.: `ImpressaoShell.tsx`, formulários de Membros/Professores, telas
públicas de autenticação) seguem a mesma classe de estilo aplicada
manualmente, sem o componente compartilhado.

Ao abrir uma tela que ainda não foi revisada (visual antigo: borda
preta, texto laranja `#E88D0C`, label longo), aplicar este padrão faz
parte do trabalho normal da tela — não precisa esperar pedido explícito
do Joaquim pra cada uma.

## 4. Marca / Logo (`src/components/Logo.tsx`)

Fonte única do ícone/logo oficial do CETADP. Usado em `PublicHeader`,
`PublicFooter`, `/sobre` e na tela de login.

**Para trocar o ícone oficial:** salve o arquivo em `public/logo.png` (ou
`public/logo.svg`, ajustando a extensão em `Logo.tsx`). Nenhuma outra tela
precisa ser tocada — todas importam `<Logo />`. Até o arquivo existir, o
componente cai automaticamente para o ícone `GraduationCap` (lucide) como
placeholder, então o layout nunca quebra.

Formato recomendado do arquivo: quadrado, fundo transparente, mínimo
512×512px (SVG é preferível por escalar sem perda). Props disponíveis:
`size` (`sm/md/lg`), `variant` (`dark` = selo navy sólido, `light` = selo
translúcido branco — usar sobre fundos escuros/coloridos), `shape`
(`square` padrão, `circle` — usado hoje só na tela de login).

**Favicon / ícone de aba do navegador é outro mecanismo**, separado do
`<Logo />` (que é o ícone visível *dentro* da página). O Next.js App Router
reconhece arquivos especiais direto em `src/app/`:

- `src/app/icon.png` (ou `.svg`) → favicon moderno, gerado automaticamente no `<head>`.
- `src/app/apple-icon.png` → ícone para "adicionar à tela de início" no iOS.
- `src/app/favicon.ico` já existe no projeto (placeholder padrão do `create-next-app`) — pode ser substituído pelo arquivo oficial mantendo o mesmo nome.

## 5. Arquitetura de layout (Next.js App Router)

Rotas são organizadas em **grupos entre parênteses** (não aparecem na URL),
cada um com seu próprio `layout.tsx`:

- `(auth)` — só a tela de login, sem chrome.
- `(admin)`, `(igreja)`, `(escola)`, `(cursos)`, `(ebd)` — área autenticada. Cada `layout.tsx` repete o mesmo esqueleto: `<Sidebar />` fixo (256px) + `<AutoLogout />` + `<main className="ml-64 p-8">`. Uma página nova dentro desses grupos **não recria esse esqueleto**, só o conteúdo.
- Páginas públicas (`/`, `/sobre`, `/inscricao`, `/certificados`) **não** ficam em grupo — cada uma importa `<PublicHeader />` + `<PublicFooter />` diretamente, porque não compartilham o esqueleto autenticado.

O hub pós-login vive em `/portal` (não em `/`, que agora é a home pública
institucional). Rotas públicas x protegidas são decididas em
`src/utils/supabase/middleware.ts` (`PUBLIC_PATHS` / `PUBLIC_EXACT`) — ao
criar uma rota pública nova, adicionar o prefixo ali.

## 6. Template de página pública

Páginas institucionais (`/`, `/sobre`) seguem o mesmo molde:

1. `<PublicHeader />` no topo (4 camadas: barra de utilidade → identidade/CTA → nav institucional; menu mobile por `useState`).
2. Conteúdo em seções empilhadas, cada uma com `max-w-7xl mx-auto px-6` e uma cor de fundo alternada (`iw-bg` → `iw-navy` → `iw-surface` → `iw-bg`) para criar ritmo visual sem precisar de divisórias.
3. Hero em grid 12 colunas (tipicamente 7+5) — texto/CTA de um lado, cartão de destaque do outro.
4. `<PublicFooter />` no final, com colunas de links (Ensino / Institucional).

## 7. Responsividade

Mobile-first, breakpoints `sm`/`md`/`lg` do Tailwind. Navegação: desktop
mostra tudo (`hidden md:block` nas camadas extras), mobile colapsa num
menu hambúrguer com estado local (`useState`) — mesmo padrão em todo header
público.

## 8. Checklist antes de criar uma tela nova

- Cor/raio/sombra: só tokens `iw-*` e `--radius-*`/`--shadow-*`.
- Botão, input, card, badge: importar de `@/components/ui`, não recriar.
- Marca: usar `<Logo />`, nunca duplicar o ícone/SVG do CETADP numa tela nova.
- Página autenticada: colocar dentro do grupo de rotas correto; não recriar Sidebar/AutoLogout.
- Página pública nova: registrar o prefixo em `PUBLIC_PATHS` no middleware; importar `PublicHeader`/`PublicFooter` diretamente.
- Antes de duplicar um componente (ex.: um segundo "player de aula"), verificar se já existe algo parecido para generalizar em vez de copiar — o projeto já teve esse problema (`EscolaLessonPlayer` e `CursosLessonPlayer` eram idênticos).
- **Pegadinha conhecida:** `globals.css` tem uma regra global `h1,h2,h3,h4,h5,h6 { color: #111111 }` fora de `@layer`, que tem precedência sobre utilities do Tailwind. Qualquer `<h1>`–`<h6>` colocado sobre fundo escuro (navy) precisa forçar a cor com `!text-white` (com `!`), não só `text-white` — senão o título fica escuro sobre fundo escuro. Já aconteceu no rodapé ("Ensino"/"Institucional") e foi corrigido em 2026-07-12.
- Bordas de campo/caixa/card: seguir sempre o padrão descrito na seção 9, abaixo.

## 9. Padrão de bordas (campos, caixas e cards) — definido em 2026-09-15

Padrão único aplicado a **todos os formulários e telas de Configurações e
Membros** nesta data, a pedido do Joaquim. Usar sempre que criar ou tocar
numa tela nova — não reinventar caso a caso.

**Campos de preenchimento** (`<input>`, `<select>`, `<textarea>` editáveis):

- Borda padrão (estado de repouso, ao abrir a tela): `border-iw-navy`
  (`#0D0D0D`).
- Ao focar/clicar: `focus:border-iw-gold` (`#CF8403`) +
  `focus:ring-2 focus:ring-iw-gold/40` + `focus:outline-none`.
- Sempre incluir `transition-colors` para a troca de cor ficar suave.
- Classe de referência (`inputCls`/`selectCls`, usada em praticamente todo
  formulário do projeto):
  ```
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
  ```

**Caixas e cards** (wrappers `bg-iw-surface rounded-2xl border ... shadow-sm
p-6` e caixas menores que agrupam itens dentro de uma tela):

- Borda padrão (sempre, não só no foco): `border-iw-gold` (`#CF8403`).

**Exceções deliberadas — não aplicar o padrão acima:**

- Botões (mantêm suas próprias variantes de cor).
- Indicador de "linha em edição" nas listas (`SimpleSettingsCRUD.tsx`,
  `SetoresManager.tsx`, `UsersList.tsx`): continua `border-iw-blue` +
  `focus:ring-iw-blue/20` — é um sinal semântico diferente (edição), não o
  estado padrão/foco normal.
- Bordas de erro de validação (`inputErrCls`, `border-iw-error`): estado de
  erro, não relacionado a este padrão.
- Overlays efêmeros (dropdown de autocomplete, menus flutuantes): ficam
  como estavam.
- Caixas já dentro de um alerta colorido (ex.: link dentro do aviso
  "cadastro pendente" em `EditarMatriculaForm.tsx`): mantidas neutras para
  não conflitar visualmente com a cor do próprio alerta.

Arquivos de referência de implementação: `NovaMatriculaForm.tsx` (primeiro
teste aprovado), `SimpleSettingsCRUD.tsx`, `ProfessorForm.tsx`,
`NovoMembroForm.tsx`/`EditarMembroForm.tsx`, `EditarMatriculaForm.tsx`.

## 10. Unificação visual — ficha de Membro x ficha de Matrícula (análise técnica, 19/09/2026) — IMPLEMENTAÇÃO PENDENTE

**Pedido do Joaquim:** deixar o *layout* dos campos de
`/dashboard/membros/novo` (`NovoMembroForm.tsx`) e de
`/admin/matriculas/nova` (`NovaMatriculaForm.tsx`) visualmente idênticos —
mesma ordem de blocos, mesmo agrupamento, mesmo estilo de campo — para que
secretaria/admin/professor tenham uma experiência única ao cadastrar
pessoas, **sem unificar banco de dados**. Nenhuma mudança foi feita ainda;
isto é só o levantamento técnico que embasa a implementação futura.

**Situação real hoje (confirmada lendo o código, não suposta):**

- `NovoMembroForm.tsx` grava em `public.members` (cliente Supabase do
  navegador). Identidade do membro = `members.cpf` +
  `members.registration_number`. Tem `role_id` (FK para
  `ecclesiastical_roles` — é o "cargo" tipo MB, AUAB etc.) e
  `financial_status` (`UP_TO_DATE`/atrasado), mas esse campo é só uma
  bandeira manual — não existe hoje nenhuma tabela de cobrança recorrente
  (dízimo/taxa mensal) ligada a `members`. É por isso que o Joaquim
  descreveu esse acompanhamento como manual.
- `NovaMatriculaForm.tsx` (via `matricularDiretoAction` em
  `admin/matriculas/actions.ts`) grava em `public.ead_alunos` (identidade
  do aluno = `ead_alunos.cpf`, independente de `members.cpf`) e depois em
  `public.ead_matriculas` (a matrícula em si). Opcionalmente também cria
  uma cobrança em `public.fin_contas_receber` (`origem_tipo =
  'MATRICULA_DIRETA'`), tabela que só aceita `aluno_id` (de
  `ead_alunos`) — não aceita `member_id`.
- **Não existe nenhuma FK entre `members` e `ead_alunos` hoje.** São duas
  tabelas de identidade totalmente separadas; uma mesma pessoa pode (e
  provavelmente vai) existir como duas linhas diferentes, uma em cada
  tabela, sem nenhum vínculo automático — mesmo que o CPF seja igual.
  Isso responde diretamente à pergunta do Joaquim: sim, hoje elas
  alimentam bancos diferentes.

**Por que dá para unificar o visual sem unificar o banco:** os dois
formulários já usam os mesmos primitivos de UI (`inputCls`/`selectCls`,
seção 9) e já têm blocos de conteúdo quase equivalentes (dados pessoais,
naturalidade/nacionalidade, endereço). O trabalho de unificação visual é
puramente de front-end: definir um único componente de "seção de
formulário" (ex. `<FichaDadosPessoais>`, `<FichaEndereco>`) reutilizado
pelos dois forms, cada um continuando a submeter para sua própria tabela
(`members` de um lado, `ead_alunos`/`ead_matriculas` do outro). Nenhuma
migration é necessária para isso.

**Sobre o exemplo do Joaquim (cargo MB → AUAB passa a pagar taxa mensal de
R$ 10,00):** isso é um requisito de **dado**, não de layout — hoje não tem
onde gravar essa regra nem essa cobrança recorrente em `members`. Fica
registrado aqui como **pendência separada e maior**: exigiria (a) uma
tabela de cobrança recorrente ligada a `members` (hoje só existe ligada a
`ead_alunos`, via `fin_contas_receber`), e (b) uma regra de negócio
disparada na troca de `role_id` do membro. Não deve ser confundido com a
unificação visual pedida acima, que é só de front-end.

**Status:** análise concluída, nenhum código alterado. Implementação da
unificação visual e da regra de cobrança por cargo ficam como próximos
passos, a serem priorizados pelo Joaquim.
