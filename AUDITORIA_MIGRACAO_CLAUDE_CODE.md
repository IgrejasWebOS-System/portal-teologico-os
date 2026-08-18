# Dossiê de Auditoria — Migração `portal-teologico-os-staging` para Claude Code

**Data:** 17/08/2026
**Escopo:** `C:\Projetos\portal-teologico-os-staging` (ambiente de desenvolvimento ativo), com referência cruzada a `C:\Projetos\portal-teologico-os` (produção, Supabase `toduvwtzklntyptcodkf`) e à branch de staging (Supabase `cjxdroyyplpknygtcdgr`).
**Natureza:** documento consolidado de 3 rodadas de auditoria (leitura de arquivos + consulta em tempo real aos dois bancos Supabase). Nenhum arquivo de código foi criado ou alterado para produzir estas análises — só este dossiê, que existe para servir de ponto de partida ao Claude Code.

---

## Sumário executivo

O projeto tem disciplina de documentação acima da média (pareceres técnicos, READMEs de migration, `AGENTS.md` com regras de bugs já sofridos), mas dois problemas concretos precisam de atenção antes ou logo no início do trabalho no Claude Code:

1. **11 funções `SECURITY DEFINER` estão expostas ao público (usuário anônimo) via API REST**, tanto em staging quanto em **produção** — confirmado consultando o linter de segurança nativo do Supabase, não apenas lendo código.
2. **Produção está 25 migrations atrasada em relação a staging**, incluindo uma reestruturação de arquitetura inteira (modelo `units`/`admin_roles` substituindo `sectors`/`churches`) que já está em staging mas não foi promovida.

Estes dois pontos não aparecem em nenhum arquivo do repositório — só foram descobertos consultando os bancos diretamente (`list_migrations` e `get_advisors` via MCP do Supabase).

---

## Parte 1 — Auditoria por nível de relevância (arquivos e estrutura)

### Nível 1 — Crítico

- **Gap de arquivo vs. banco nas migrations 030–039.** Os arquivos `.sql` de 030 a 039 não existem em `supabase/migrations/` nesta cópia local, embora estejam documentados em `supabase/migrations/README.md`. **Confirmado via `list_migrations` que essas migrations FORAM aplicadas ao banco** (15/08 em staging, 16/08 em produção) — não há perda de dados, mas o repositório local não tem os arquivos que reproduzem esse estado. Reconstituir esses arquivos (via introspecção do schema atual) antes de migrar, para que o histórico local bata com o real.
- **`supabase/migrations/README.md` está desatualizado em ~25 migrations.** O README documenta até a `041`/`042`. O banco real (staging) já está na `076_fix_staff_demo_tokens`, incluindo um bloco inteiro (042–073) — hierarquia de `units`, `admin_roles`, escopo territorial, LGPD (`045_nacionalidade_consentimento_lgpd`) — que não aparece no README nenhuma vez. Qualquer processo (humano ou IA) que confie só no README vai ter uma visão incompleta do schema.
- **Produção desatualizada em relação a staging (25 migrations de diferença).** Produção está parada em `051_faq_modulo` (25/07). Staging está em `076_fix_staff_demo_tokens` (16/08). A reestruturação de `sectors`/`churches` → `units`/`admin_roles` (migrations 059–064) está só em staging. Isso deve ser decisão consciente (staging à frente por design) e não um esquecimento — vale confirmar antes de qualquer promoção para produção.
- **Duplicidade de pastas de migration.** `sql/migrations/` (legado, ARQUIVADO, descreve o banco antigo compartilhado com `Igrejas-Web-os`) coexiste com `supabase/migrations/` (ativo) e **reusa os mesmos números** (009, 010, 011) com conteúdo totalmente diferente. Risco de confusão para qualquer ferramenta que varra arquivos `.sql` numerados sem ler o README primeiro.
- **Segredos reais em `.env.local`** (staging): URL, chave `anon` e chave `service_role` da branch `cjxdroyyplpknygtcdgr`, em texto plano, fora do Git (`.gitignore` cobre corretamente). Precisa de tratamento manual deliberado na migração — não copiar automaticamente para o novo ambiente sem confirmar isolamento de acesso equivalente.
- **Regra de RLS auto-referenciada** (documentada em `AGENTS.md`, migrations 048–050): uma policy de RLS em `profiles` que consulta a própria `profiles` na condição derruba a tabela inteira por recursão infinita. Correção usa função `SECURITY DEFINER` intermediária. Conhecimento específico deste projeto — não é algo que uma IA nova vai inferir sozinha.
- **Secrets do GitHub Actions** — workflow de CI depende de 8 secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Status de cadastro real no GitHub não confirmado nesta auditoria — checar diretamente em Settings → Secrets and variables → Actions.

### Nível 2 — Importante

- `CLAUDE.md` é só um redirecionamento de uma linha (`@AGENTS.md`) — os dois precisam migrar juntos.
- Reestruturação i18n em andamento: `src/app/[locale]/`, com arquivos fora da pasta `[locale]` (`actions.ts`, `course-actions.ts`, `ebd-actions.ts`, `globals.css`, `favicon.ico`) deliberadamente mantidos fora por não serem rotas.
- 21 arquivos usam `service_role`/`createAdminClient` — mapeados nesta auditoria, todos aparentemente server-side.
- CI cobre lint + type-check + build, mas **não** RLS nem testes automatizados — não existe rede de segurança para o tipo de bug de recursão de RLS citado acima.
- Scripts operacionais são PowerShell com caminhos Windows fixos (`scripts/*.ps1`, `BACKUP.ps1`, `EXTRACT_DNA.ps1`).
- `config/paths.json` é configuração pessoal de estação de trabalho (pastas locais, backup, organização GitHub), não configuração de aplicação.

### Nível 3 — Complementar

- 13+ documentos técnicos soltos na raiz do repositório, sem pasta `docs/` centralizada (pareceres técnicos, análises comparativas, roteiros de apresentação).
- Existe uma pasta `docs/` com um único arquivo — inconsistente com o resto da documentação solta na raiz.
- Dois arquivos quase-duplicados: `CETADEP_PORTAL_EAD.md` e `CETADP_PORTAL_EAD.md`.
- Dois HTMLs de apresentação institucional e um CSV de cronograma na raiz — não fazem parte da aplicação.

### Nível 4 — Opcional

- Ícones padrão do `create-next-app` em `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — uso não confirmado.

---

## Parte 2 — Checklist adicional recomendado (visão de engenharia sênior)

Itens que não aparecem numa auditoria de arquivos, mas que eu pediria antes de considerar a migração "fechada":

- **Reconciliar o histórico real de migrations com os arquivos locais**, em staging *e* produção, antes de levar qualquer coisa para o Claude Code (ver Parte 3 — já fiz essa checagem ao vivo).
- **Inventário de acesso e credenciais**: quem hoje acessa Vercel, GitHub (`IgrejasWebOS-System`), Supabase, Mercado Pago, Resend e o registrador do domínio `cetadp.teo.br`. Se for só uma pessoa, documentar como recuperar acesso em caso de perda de conta.
- **LGPD**: o projeto guarda CPF, RG, endereço, filiação e dados financeiros. A migration `045_nacionalidade_consentimento_lgpd` sugere alguma atenção já dada ao tema — vale confirmar o que ela cobre exatamente (captura de consentimento? finalidade? retenção?) e se existe política de privacidade publicada.
- **Rede de segurança automatizada**: hoje não há teste automatizado (unitário, integração ou e2e) — só lint/type-check/build. Para um sistema que processa matrícula, pagamento e certificado, qualquer regressão só aparece em produção.
- **Auditoria de dependências**: `npm audit` (ou equivalente) não foi rodado nesta auditoria.
- **Webhook do Mercado Pago**: confirmar se `src/app/api/webhooks/mercadopago/route.ts` valida assinatura e trata reentrega idempotente (o Mercado Pago reenvia o mesmo evento mais de uma vez por design).
- **Histórico do Git**: verificar se alguma chave real já foi commitada no passado, mesmo estando hoje no `.gitignore`.
- **Observabilidade**: não há Sentry nem equivalente — hoje, saber que algo quebrou em produção depende de reclamação de usuário ou checagem manual do painel do Vercel.

### Correções a análises anteriores desta mesma auditoria

- O achado do token `MERCADOPAGO_ACCESS_TOKEN` com prefixo `APP_USR-` (10/08/2026, `PARECER_TECNICO_ISOLAMENTO_CONNECTIONCYBEROS.md`) **já foi confirmado como sandbox de fato**, antes do lançamento de 21/08 — não é mais uma pendência em aberto, ao contrário do que uma versão anterior deste relatório havia indicado.
- O gap das migrations 030–039 **não é perda de dados** — as migrations foram aplicadas ao banco normalmente. O problema é só a ausência dos arquivos `.sql` correspondentes no repositório local (ver Nível 1 acima).

---

## Parte 3 — Confirmação em runtime: staging vs. produção

Consulta direta aos dois bancos via MCP do Supabase (`list_migrations` + `get_advisors`, tipo `security`), em 17/08/2026.

### Alertas de segurança — idênticos em staging e produção

| Alerta | Staging (`cjxdroyyplpknygtcdgr`) | Produção (`toduvwtzklntyptcodkf`) |
|---|---|---|
| 11 funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` via `/rest/v1/rpc/*` | Presente | **Presente** |
| `search_path` mutável em `check_matricula_unica`, `patrimony_movement_trigger`, `validate_unit_hierarchy` | Presente | **Presente** |
| Proteção contra senha vazada (HaveIBeenPwned) desativada | Presente | **Presente** |

As 11 funções expostas ao anônimo incluem `is_super_master()`, `get_user_min_level()`, `get_next_matricula_ead()`, `get_next_certificado()`, `get_accessible_unit_ids()`, `unit_is_within()`, `current_system_role()`, `get_next_tombamento()`, `check_limite_simulados()`, `calcular_depreciacao_mensal()`, `calcular_valor_contabil()` — ou seja, qualquer pessoa sem login pode chamá-las hoje via API REST pública, tanto em staging quanto em produção.

### Migrations — produção 25 versões atrás de staging

- **Produção:** última migration aplicada é `051_faq_modulo` (25/07/2026).
- **Staging:** última migration aplicada é `076_fix_staff_demo_tokens` (16/08/2026).
- Diferença: 25 migrations, incluindo a reestruturação `sectors`/`churches` → `units`/`admin_roles` (059–064), escopo territorial no EAD, `must_change_password`, e a conta demo de staff usada para testes.

---

## Como usar este documento no Claude Code

Este arquivo foi pensado para ser o primeiro documento lido ao abrir o projeto no Claude Code — ele resume o que só ficou visível consultando os dois bancos ao vivo, o que nenhum arquivo do repositório sozinho mostra. `AGENTS.md`/`CLAUDE.md` continuam sendo a fonte de regras operacionais do dia a dia; este dossiê é o retrato do estado real do sistema em 17/08/2026, para servir de checklist antes de qualquer mudança estrutural.

Nenhuma ação de correção foi executada a partir desta auditoria — os itens acima são diagnóstico, não implementação.
