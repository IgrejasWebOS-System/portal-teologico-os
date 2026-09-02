# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server (Next.js 16, Turbopack)
npm run build         # production build
npm run lint          # ESLint (eslint.config.mjs)
npm run type-check    # tsc --noEmit — run before every commit
```

No test framework is configured — there is no `npm test`. CI (`.github/workflows/ci.yml`) runs lint → type-check → build on every PR to `main`, using placeholder secrets (real values live in GitHub Actions secrets, not in the repo).

There is no Supabase CLI in this project. Migrations in `supabase/migrations/` are applied by hand, in numeric order, either by pasting the `.sql` into the Supabase SQL Editor or via the `apply_migration` MCP tool — see `supabase/migrations/README.md` for the full log of what each numbered file does.

## Architecture

**This is a Next.js 16 App Router codebase with breaking changes from what training data expects — read `node_modules/next/dist/docs/` before assuming an API.** The most load-bearing example: there is no `middleware.ts`; routing/session logic lives in `src/proxy.ts` (the `proxy` export + `matcher` config), which composes `next-intl`'s middleware with `updateSession` from `src/utils/supabase/middleware.ts`.

### i18n routing
`src/i18n/routing.ts` defines locales (`pt-BR` default/no prefix, `en-US`, `es-419` prefixed) with `localeDetection: false` — pt-BR must never be inferred from a cookie/header, only via an explicit language switcher. All app routes live under `src/app/[locale]/...`. `updateSession` strips the locale prefix before matching `PUBLIC_PATHS`/auth rules, then re-adds it on redirects, so route-protection logic in `src/utils/supabase/middleware.ts` is written entirely in terms of the unprefixed (pt-BR-equivalent) path.

### Auth & RBAC
- `src/utils/supabase/server.ts` / `client.ts` — normal (anon-key) clients for server components/actions and browser code, respectively. RLS is the real enforcement boundary.
- `src/utils/supabase/admin.ts` — `service_role` client (`createAdminClient`). Server-only, never imported into a `"use client"` file; used only for the specific privileged step (e.g. `auth.admin.inviteUserByEmail`) after the caller's permission has already been checked with the normal client.
- `src/utils/staff.ts` — `checkIsStaff()` / `STAFF_ROLES` (`GLOBAL_ADMIN`, `SECTOR_ADMIN`, `LOCAL_ADMIN`), the single source of truth for "is this user secretaria/admin". Used in `updateSession` (to route `/login` correctly) and in `(admin)` layouts to gate the whole route group. Its Supabase param is deliberately typed `any` — see the comment in the file before "fixing" that; a structural type there breaks `tsc` with infinite type instantiation.
- Route groups under `src/app/[locale]/` map to access levels: public (`/`, `/sobre`, `/inscricao`, `/biblioteca`, `/loja`, `/certificados`), `(auth)` login, `(admin)` secretaria/staff (content, matrículas, financeiro, patrimônio, loja), `(igreja)`/`(escola)`/`(cursos)`/`(ebd)` other authenticated areas, `/portal` student hub. What's public vs. protected is decided centrally in `src/utils/supabase/middleware.ts` (`PUBLIC_PATHS`/`PUBLIC_EXACT`), not per-page.
- **RLS self-reference is a hard failure mode** — see the RLS rule in `AGENTS.md` (imported above). It applies to any new policy on `profiles`, not just historical ones.

### Enrollment flow (inscrição → matrícula)
Public form (`/inscricao`, no auth) → `ead_inscricoes` row (`PENDENTE`) → staff review at `/admin/inscricoes` → on approval, `get_next_matricula_ead()` generates the enrollment number, `ead_alunos` row is created, and the student is invited via `service_role` (`auth.admin.inviteUserByEmail`, `redirectTo` → `/auth/callback`) → student sets a password at `/definir-senha` → normal `/login` from then on. Schema/RLS reference: `supabase/migrations/001_schema_base_isolado.sql` and `003_rls_corrigida.sql`.

### Design system
Full detail in `DESIGN_SYSTEM.md` — read it before adding a screen or component. Summary: all colors/radii/shadows are Tailwind v4 `@theme` tokens in `src/app/globals.css` (never a raw hex in a component); class merging goes through `cn()` (`src/utils/cn.ts`, `clsx` + `tailwind-merge`); every new screen composes primitives from the `@/components/ui` barrel (`Button`, `Card`/`CardHeader`/`CardBody`/`CardFooter`/`StatCard`, `Label`/`FieldWrapper`/`TextInput`/`PasswordInput`/`SelectInput`, `Badge`) instead of raw `<button>`/`<input>`.

### External integrations
- **Supabase** — isolated project `toduvwtzklntyptcodkf` (staging work happens on its `staging` branch, per the environment table in `AGENTS.md`), Postgres + Auth + RLS via `@supabase/ssr`.
- **Mercado Pago** — payment checkout (loja + matrícula paga), raw `fetch` client at `src/utils/mercadopago/client.ts`, webhook at `src/app/api/webhooks/mercadopago`.
- **Resend** — transactional email, raw `fetch` in `src/utils/email/resend.ts`. Missing `RESEND_API_KEY` logs a warning and returns `false` rather than throwing, so callers (e.g. the Mercado Pago webhook) never fail because email is unconfigured.

`.env.example` documents every environment variable; never commit `.env.local` or paste real values into `.env.example`.
