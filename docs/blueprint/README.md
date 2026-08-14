# portal-teologico-os — visão geral

Portal EAD do CETADP (Centro Educacional Teológico). App Next.js 15 (App Router) +
TypeScript + Tailwind CSS, banco Supabase (Auth + PostgreSQL + Storage) próprio e
isolado, deploy automático na Vercel a partir da branch `main`.

## Stack

GitHub · Supabase (PostgreSQL) · Vercel · Next.js (App Router) · TypeScript ·
JavaScript · Ngrok (túnel local, ex: testar webhook do Mercado Pago em dev) ·
Mercado Pago (Checkout Pro).

## Ambientes

| Ambiente | Caminho local |
|---|---|
| Produção | `C:\Projetos\portal-teologico-os` |
| Desenvolvimento/staging | `C:\Projetos\portal-teologico-os-staging` |

## Índice da documentação (`docs/`)

- `blueprint/` — visão geral, mapa de rotas, módulos, design system (esta pasta)
- `devops/` — pipeline de CI/CD
- `github/` — (reservado — sem conteúdo ainda)
- `backup/` — scripts de backup/restore/verify
- `security/` — (reservado — sem conteúdo ainda)
- `database/` — migrations do Supabase
- `infrastructure/` — referência de GitHub/Supabase/Vercel
- `architecture-decisions/` — registros de decisão (ex: isolamento do projeto)

Estrutura definida por `scripts/init-portal-teologico-folders.ps1` — é ele quem
cria essas pastas (e as equivalentes em OneDrive/HD externo) na primeira vez que
roda num ambiente novo.

## Onde começar

1. Arquitetura e módulos: `blueprint/modulos.md` e `blueprint/mapa-rotas.md`
2. Infraestrutura (GitHub/Supabase/Vercel): `infrastructure/github-supabase-vercel.md`
3. Banco de dados: `database/migrations.md`
4. Backup/restore: `backup/scripts.md`
5. Deploy: `devops/pipeline.md`
6. Padrões visuais: `blueprint/design-system.md`

Ver também `AGENTS.md`/`CLAUDE.md` na raiz do projeto para convenções de código
(banco multi-tenant, TypeScript strict, estrutura de pastas).
