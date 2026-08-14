# Isolamento do portal-teologico-os — registro oficial (agosto/2026)

Este documento registra o estado de infraestrutura do `portal-teologico-os` após o
isolamento do projeto, e as decisões tomadas na sessão de 12-13/08/2026.

## Contexto

O `portal-teologico-os` nasceu compartilhando GitHub e banco de dados com outros
projetos do ecossistema IgrejasWebOS-System (`Igrejas-Web-os`, `Igrejas-Web-System-OS`).
Em 13/07/2026 (Fase 1 do plano de isolamento) ele passou a ter GitHub e Supabase
próprios, dedicados só a este projeto.

## Estado confirmado

### GitHub
- Repositório ativo: `https://github.com/IgrejasWebOS-System/portal-teologico-os`
- Branch padrão: `main` (deploy de produção na Vercel dispara a partir daqui)
- Repositórios removidos/isolados: `igrejas-web-os` e `Igrejas-Web-System-OS` não
  fazem mais parte deste projeto.

### Supabase
- Projeto ativo: **portal-teologico-os**
- Ref: `toduvwtzklntyptcodkf`
- Project URL: `https://toduvwtzklntyptcodkf.supabase.co`
- É o único projeto Supabase vinculado ao `portal-teologico-os` — os projetos
  `Igrejas-web-os` e `Igrejas-web-system-os` que existiam no Supabase foram removidos
  do escopo deste projeto.
- ⚠️ Durante a conversa, foi colada uma vez uma "Project URL" divergente
  (`https://dvrajadmqcixaccqpmnh.supabase.co`) — confirmado por print de tela que essa
  URL estava incorreta/de outra origem. A URL válida e confirmada é a acima
  (`toduvwtzklntyptcodkf.supabase.co`).
- Chaves de API (anon public / service_role) já existem e estão configuradas — os
  valores completos não foram registrados aqui por segurança; ficam apenas no
  `.env.local` (não versionado) e nos Secrets do GitHub Actions / variáveis de
  ambiente da Vercel.
- CLI setup:
  ```
  supabase login
  supabase init
  supabase link --project-ref toduvwtzklntyptcodkf
  ```

### Vercel
- Time: `IgrejasWebOS's projects` (slug `igrejasweboss-projects`)
- Projeto ativo: `portal-teologico-os` → `portal-teologico-os.vercel.app`,
  vinculado ao repo GitHub `IgrejasWebOS-System/portal-teologico-os`.
- Outros projetos observados no mesmo time: `igrejas-web-system-os` (vinculado a um
  repo GitHub diferente, `Igrejas-Web-System-OS`) e `apresentacao-cetadp`.
- **Pendência levantada pelo usuário**: `igrejas-web-system-os` deveria ter deixado de
  aparecer na Vercel após o isolamento, mas ainda está listado. Avaliação técnica:
  como é um projeto Vercel separado, vinculado a um repositório GitHub diferente,
  removê-lo não deve afetar o deploy/domínio/variáveis do `portal-teologico-os` —
  projetos Vercel são isolados por padrão, a menos que compartilhem domínio
  customizado ou variável de ambiente marcada como "shared" no nível do time (não
  verificado diretamente por falta de acesso via conector no momento do registro).
  Recomendação: conferir Settings → Domains e Settings → Environment Variables do
  projeto `igrejas-web-system-os` antes de excluí-lo.

## Ambientes locais (informado pelo usuário)

| Ambiente | Caminho |
|---|---|
| Produção | `C:\Projetos\portal-teologico-os` |
| Desenvolvimento/staging | `C:\Projetos\portal-teologico-os-staging` |

## Stack

GitHub · Supabase (PostgreSQL) · Vercel · Next.js (App Router) · TypeScript ·
JavaScript · Ngrok · Mercado Pago (Checkout Pro).

## Conectores Claude/Cowork — estado no momento do registro

- **Vercel**: conector conectado, time correto (`igrejasweboss-projects`) mas
  `list_projects` retornou vazio para esse time — escopo do token não está
  enxergando os projetos ainda. Requer reconexão selecionando a conta/projeto certos.
- **Supabase**: conector conectado, mas apontando pra outra organização
  (`bpo-system-web-os` / `bpo-system-web-os-staging`), não pra
  `IgrejasWebOS-System`. Requer reconexão com a conta dona da organização certa.
- **GitHub**: nenhum conector de GitHub disponível no catálogo do Cowork nesta
  sessão. Trabalho no código continua via acesso direto aos arquivos da pasta
  local (`C:\Projetos\portal-teologico-os`); operações de `git push` continuam
  sendo feitas pelo usuário (manualmente ou via `scripts/backup-portal-teologico.ps1`).

## Nota sobre organização da documentação

Este documento inicialmente foi escrito em `doc/infraestrutura/` (pasta nova, a
pedido do usuário). Durante o levantamento, descobriu-se que o projeto já tem uma
convenção própria de documentação em `docs/` (plural), criada por
`scripts/init-portal-teologico-folders.ps1`, com categorias fixas (`blueprint`,
`devops`, `github`, `backup`, `security`, `database`, `infrastructure`,
`architecture-decisions`). O usuário confirmou usar essa convenção existente — este
arquivo foi migrado para `docs/architecture-decisions/`.
