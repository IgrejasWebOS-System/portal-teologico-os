# Pipeline de CI/CD

## O que existe hoje

Dois mecanismos separados, que não se falam diretamente:

### 1. GitHub Actions (`.github/workflows/ci.yml`) — portão de qualidade

Roda em **todo Pull Request para `main`** (não roda em push direto). Um único job,
`lint-typecheck-build`, faz nessa ordem: checkout → setup Node 20 → `npm ci` →
`npm run lint` → `npm run type-check` → `npm run build`.

O passo de build recebe variáveis de ambiente via GitHub Secrets (não valores fixos
no arquivo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `MERCADOPAGO_ACCESS_TOKEN`,
`MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

**Esse workflow não faz deploy.** É só um checador — barra um PR com erro de lint,
tipo ou build antes de chegar na `main`.

**Pendência a verificar**: esses Secrets precisam estar cadastrados em
`Settings → Secrets and variables → Actions` no repositório GitHub. Não temos
conector de GitHub conectado nesta sessão pra confirmar se já foram configurados —
se não estiverem, todo PR vai falhar no passo de build. Vale conferir manualmente.

### 2. Vercel (integração GitHub nativa) — deploy de verdade

Não depende do `ci.yml`. A Vercel está com a integração de GitHub instalada no
projeto `portal-teologico-os` — qualquer push é observado direto:

- Push em `main` → build e deploy em **Produção**
  (`portal-teologico-os.vercel.app`).
- Push em qualquer outra branch, ou um PR aberto → build e deploy de **Preview**
  (URL única por deployment).

## Fluxo completo, na prática

```
git push origin main
        │
        ├──► GitHub Actions roda ci.yml (lint/type-check/build) — informativo,
        │     não bloqueia a Vercel mesmo se falhar (não são a mesma pipeline)
        │
        └──► Vercel detecta o push → build próprio → deploy em Produção
```

Ou seja: mesmo que o CI do GitHub Actions falhe, a Vercel ainda vai tentar (e
provavelmente conseguir) fazer o deploy, porque são dois sistemas independentes.
Se algum dia for necessário que um PR reprovado no CI *bloqueie* o deploy, isso
exigiria configurar Branch Protection Rules no GitHub exigindo o check do CI antes
do merge — não está configurado assim hoje (não confirmado via conector, mas não
há nenhum arquivo de configuração de branch protection versionado no repo).

## Scripts locais (fora do CI/CD automático)

O backup/push manual (`scripts/backup-portal-teologico.ps1`) e os demais scripts de
`scripts/` são executados pelo usuário, não pela pipeline — ver
`docs/backup/scripts.md`.
