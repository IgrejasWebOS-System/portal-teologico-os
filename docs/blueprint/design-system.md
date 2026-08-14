# Design system — convenções de UI

Registrado a partir das decisões tomadas ao longo de várias sessões de trabalho.

## Cores

- **Laranja primário**: `#E88D0C`
- **Preto**: `#000000` — usado para bordas de ênfase e ícones invertidos
- Borda "padrão" de container: `border border-[#E88D0C]/40` (fina, translúcida)
- Ícone padrão do sistema: quadro `bg-black border-2 border-[#E88D0C]`, ícone
  `text-[#E88D0C]` por dentro — usado em praticamente todo cabeçalho de página
  administrativa/config.

## Componente `PageHeader` (`src/components/layout/PageHeader.tsx`)

Cabeçalho padrão das páginas internas (admin/portal/dashboard). Sticky no topo ao
rolar, borda laranja de 1,5pt embaixo, título 22px preto negrito, descrição 14px
preta (inline, ao lado do título), ícone opcional à esquerda (quadro preto/borda
laranja), link "Voltar" opcional na extremidade direita (laranja, 14px, borda preta
de 1,5pt), e slot `actions` para botões extras nessa mesma linha.

```tsx
<PageHeader
  icon={GraduationCap}
  title="Matrículas"
  description="Todas as matrículas por curso..."
  backHref="/admin/matriculas"      // opcional
  backLabel="Voltar para Matrículas" // opcional
  actions={<Link href="...">Nova matrícula</Link>} // opcional
/>
```

Existe também um wrapper fino em `src/app/(igreja)/dashboard/configuracoes/PageHeader.tsx`
que mantém a assinatura antiga (`icon/title/description`, sem `backHref` explícito —
sempre aponta pra `/dashboard/configuracoes`) usada pelas ~14 páginas de
Configurações, sem precisar tocar em cada uma delas.

Migração completa (agosto/2026): 24 páginas convertidas pro padrão novo, cobrindo
admin, configurações, financeiro, EBD, matrículas, certificados, FAQ, loja,
patrimônio e os hubs de topo (`/admin`, `/dashboard/configuracoes`).

## Botões

- Variante `primary` do `src/components/ui/Button.tsx`: fundo laranja, **borda
  preta de 1px** (`border-black`).
- Todo botão com `bg-[#E88D0C]` solto pelo projeto (fora do componente `Button`)
  também recebeu `border border-black` — ~38 arquivos cobertos numa varredura.

## Sidebar (`src/components/layout/Sidebar.tsx` + `SidebarShell.tsx`)

- **Desktop**: sempre visível, fixo (`md:translate-x-0`), sem toggle.
- **Mobile**: off-canvas, recolhido por padrão, fecha automaticamente após
  navegação (efeito baseado em `usePathname()`, já que o layout não remonta entre
  rotas do mesmo grupo).

## Ícones flutuantes de rede social (`FloatingSocialIcons.tsx`)

Fixos no lado direito da tela (web e mobile). Borda preta de 1,5pt em todos, exceto
o ícone de e-mail/correio (que já tinha fundo preto + borda laranja, mantido como
está).

## Tipografia de cabeçalho de página (fora do `PageHeader`, ex: cursos/escola/EBD)

Em telas de aula (`/escola/[id]`, `/cursos/[id]`): tipografia com bump de +1 tier
e cor preta pura **somente em desktop** (`md:text-*` / `md:text-black`), mobile
inalterado. Containers de card usam a borda padrão
`border-[#E88D0C]/40`.
