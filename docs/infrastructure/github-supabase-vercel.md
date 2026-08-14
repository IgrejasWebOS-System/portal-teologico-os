# Referência rápida — GitHub / Supabase / Vercel

Referência de consulta rápida. Para o histórico e as decisões do isolamento, ver
`docs/architecture-decisions/isolamento-2026-08.md`.

## GitHub

- Organização: `IgrejasWebOS-System`
- Repositório: https://github.com/IgrejasWebOS-System/portal-teologico-os
- Branch de produção: `main` — todo push aqui dispara deploy automático na Vercel.
- Não existe conector de GitHub no Cowork no momento; git push/pull continuam
  manuais (PowerShell) ou via `scripts/backup-portal-teologico.ps1`.

## Supabase

- Projeto: `portal-teologico-os`
- Ref: `toduvwtzklntyptcodkf`
- Project URL: `https://toduvwtzklntyptcodkf.supabase.co`
- Direct connection string (para pg_dump/pg_restore):
  `postgresql://postgres:[SENHA]@db.toduvwtzklntyptcodkf.supabase.co:5432/postgres`
- Variável de ambiente usada pelos scripts de backup:
  `PORTAL_TEOLOGICO_SUPABASE_DB_URL`
- CLI:
  ```bash
  supabase login
  supabase init
  supabase link --project-ref toduvwtzklntyptcodkf
  ```
- Chaves (anon public / service_role): configuradas, guardadas em `.env.local`
  (não versionado) — ver `.env.example` na raiz do projeto pra lista completa de
  variáveis esperadas.

## Vercel

- Time: `IgrejasWebOS's projects` (slug `igrejasweboss-projects`)
- Projeto: `portal-teologico-os` → domínio `portal-teologico-os.vercel.app`
- Push em `main` no GitHub = deploy automático em Produção. Push em outras
  branches = Preview deployment.

## Variáveis de ambiente esperadas (build e runtime)

Ver `.env.example` na raiz do projeto — lista completa e comentada. Resumo:

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin — só server-side, nunca no browser |
| `NEXT_PUBLIC_APP_URL` | URL base do app (Mercado Pago, e-mails) |
| `MERCADOPAGO_ACCESS_TOKEN` | Checkout Pro |
| `MERCADOPAGO_WEBHOOK_SECRET` | Valida notificações do Mercado Pago |
| `RESEND_API_KEY` | E-mail transacional (opcional — sem ela, só pula o envio) |
| `RESEND_FROM_EMAIL` | Remetente dos e-mails |

Essas mesmas variáveis precisam existir em **dois lugares** além do `.env.local`
de desenvolvimento: nas Environment Variables do projeto na Vercel (produção) e
nos Secrets do repositório no GitHub (`Settings → Secrets and variables → Actions`),
usados pelo workflow de CI — ver `docs/devops/pipeline.md`.
