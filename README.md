# CETADP — Portal EAD de Teologia

Portal de ensino a distância do **CETADP** (Centro Educacional Teológico
das Assembleias de Deus Piracicaba), construído sobre o **IgrejasWebOS** —
o mesmo sistema de gestão eclesiástica (`portal-teologico-os`). O Portal
EAD é um módulo habilitável dentro dessa mesma plataforma, não um sistema
separado: compartilha autenticação, banco de dados e design system com o
restante do IgrejasWebOS.

## O que é

Site institucional público (home, "Quem Somos", Biblioteca) + fluxo de
inscrição e matrícula + área do aluno com cursos oficiais, reciclagem,
teologia em vários níveis e EBD (Escola Bíblica Dominical) em vídeo,
pensado para atender vários campos e ministérios a partir de um único
portal.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (`strict`)
- **Tailwind CSS v4** — design system próprio, ver [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- **Supabase** — Postgres + Auth + Row Level Security, via `@supabase/ssr` (client/server) e `@supabase/supabase-js` (cliente admin/`service_role`, só em server actions)

## Rodando localmente

```bash
npm install
```

Crie um `.env.local` na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # necessário para aprovar inscrições (convite de aluno)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Aplique as migrações em `supabase/migrations/`, na ordem cronológica dos
arquivos (esta é a única pasta ativa desde 13/07/2026) no seu projeto
Supabase, depois:

```bash
npm run dev
```

> Este projeto usa um Supabase **isolado e dedicado** (`toduvwtzklntyptcodkf`,
> criado em 13/07/2026), separado do banco antigo que era compartilhado com
> o `Igrejas-Web-os`. Veja `ordem-tecnica-isolamento-e-migracao.md` para o
> histórico dessa decisão.

## Estrutura de rotas

Rotas ficam organizadas em grupos do App Router (pastas entre parênteses,
não aparecem na URL), cada uma com seu próprio layout:

| Grupo/rota | Conteúdo |
|---|---|
| `/`, `/sobre`, `/inscricao`, `/biblioteca`, `/loja`, `/certificados` | Site público — sem login, `PublicHeader`/`PublicFooter` |
| `(auth)/login` | Login (e-mail + senha) |
| `/portal`, `/portal/avaliacoes`, `/portal/certificados` | Hub autenticado, simulados/provas e certificados do aluno |
| `(igreja)` | Dashboard da igreja: membros, configurações, ocorrências |
| `(escola)`, `(cursos)`, `(ebd)` | Módulos de conteúdo em vídeo/aula |
| `(admin)` | Conteúdo, inscrições, matrículas diretas, financeiro (plano de contas/caixa/contas a pagar e a receber), patrimônio, certificados e pedidos da loja |

Rotas públicas x protegidas são decididas em
`src/utils/supabase/middleware.ts`.

## Fluxo de inscrição e matrícula

1. Candidato preenche o formulário público em `/inscricao` (sem login) → grava um registro `PENDENTE` em `ead_inscricoes`.
2. A secretaria (usuário com `profiles.system_role` em `GLOBAL_ADMIN`/`SECTOR_ADMIN`/`LOCAL_ADMIN`) analisa em `/admin/inscricoes`.
3. Ao aprovar: gera a matrícula (`get_next_matricula_ead()`), cria o registro em `ead_alunos` e convida o aluno por e-mail via Supabase Auth (`auth.admin.inviteUserByEmail`, cliente `service_role` em `src/utils/supabase/admin.ts`).
4. O aluno recebe o e-mail, clica no link (`redirectTo` aponta para `/auth/callback`, que troca o `code` por sessão) e é levado a `/definir-senha` para criar sua senha.
5. Dali em diante, o aluno acessa normalmente em `/login` com e-mail e senha.

Detalhes de schema e RLS: `supabase/migrations/001_schema_base_isolado.sql` e `003_rls_corrigida.sql`.

## Documentação do projeto

- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — tokens, componentes, arquitetura de layout, checklist para telas novas.
- `parecer-tecnico-portal-teologico-os.md` — auditoria técnica e cronológica do projeto original.
- `parecer-individualizacao-portal-ead-teologia.md` — avaliação de viabilidade do Portal EAD como produto multi-tenant.
- `cronograma-portal-ead-teologia.csv` — cronograma de implementação.
- `CETADP_PORTAL_EAD.md` — documento institucional do projeto (visão geral, público-alvo, roadmap).

## Pontos em aberto (roadmap)

- RBAC (checagem de `system_role`) está aplicado em todas as rotas `/admin/*` e `/dashboard/*`.
- Emissão de certificado: schema pronto (`certificates`, numeração automática), mas ainda sem tela/ação que gera o certificado ao concluir um curso.
- Cadastrar os polos presenciais reais em `ead_campos_ministerios` (hoje só 3 registros de seed).
- Pós-pitch: migrar este projeto para dentro do `igrejas-web-system-os` (RBAC de 5 níveis via `admin_roles`, Party Pattern, `ministry_id` obrigatório) — ver `ordem-tecnica-isolamento-e-migracao.md`, Fase 4.
