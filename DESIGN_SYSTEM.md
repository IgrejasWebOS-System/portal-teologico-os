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
| Ação | `iw-blue` (#BCE5FF), `iw-sky` (#88CDF6) | Botões primários, hover, bordas suaves |
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
