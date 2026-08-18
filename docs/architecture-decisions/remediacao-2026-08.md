# Log de remediação — agosto/2026

Registro formal do fluxo de correção ponta a ponta acordado em 19/08/2026,
executado módulo a módulo com gate obrigatório: **mudança → validação
técnica → auditoria formal → registro aqui → só então o próximo módulo**.

Backlog de origem: auditoria própria (17-19/08) + 4 rodadas independentes em
`zz-matriz-sistemas\Portal Teologico\` (`Auditoria Técnica de Migração.txt`,
`.txt2`, `.txt3`, `Dossiê de Auditoria.txt`) + os 3 relatórios formais de
`C:\Projetos\portal-teologico-os` (padronização de idiomas, ambiente
staging, cronograma i18n). Este log cobre o backlog de segurança/infra/
qualidade — a implementação de i18n segue seu próprio cronograma aprovado,
em paralelo, sem se misturar aqui.

Plano completo: `C:\Users\joaqu\.claude\plans\curried-dazzling-naur.md`.

---

## Módulo 0 — Itens que dependem do usuário (checklist, não bloqueante em série)

| # | Item | Status |
|---|---|---|
| 0.1 | Ligar "Leaked password protection" (Supabase Auth) | ⏳ Pendente |
| 0.2 | Reconfirmar credencial Mercado Pago é sandbox de fato | ⏳ Pendente |
| 0.3 | Branch Protection Rule em `main` (GitHub) exigindo check do `ci.yml` | ⏳ Pendente |
| 0.4 | Confirmar 8 secrets do CI cadastrados no GitHub Actions | ⏳ Pendente |
| 0.5 | Apagar `CETADEP_PORTAL_EAD.md` | ⏳ Pendente |
| 0.6 | Preencher inventário de acesso/credenciais | ⏳ Pendente (template a criar no Módulo 4) |

---

## Módulo 1 — Segurança de banco (Supabase)

### 1.1 — Guard de staff em funções de patrimônio + search_path mutável

**Status: ✅ RESOLVIDO** (aplicado e validado em 19/08/2026)

**Achado original:** `calcular_valor_contabil` e `calcular_depreciacao_mensal`
(`supabase/migrations/024_patrimonio_inventario.sql`) eram `SECURITY DEFINER`
sem nenhuma checagem de `system_role` interna — diferente de
`get_next_tombamento`/`get_next_certificado` no mesmo módulo — permitindo
que qualquer `authenticated` obtivesse valor contábil/depreciação de
qualquer item de patrimônio via RPC, ignorando a RLS de
`patrimony_items_staff`. Adicionalmente, `check_matricula_unica`,
`patrimony_movement_trigger` e `validate_unit_hierarchy` estavam com
`search_path` mutável (lint `function_search_path_mutable` do advisor nativo
do Supabase).

**Mudança aplicada** (migrations `fix_patrimonio_staff_check_e_search_path`
e `fix_validate_unit_hierarchy_search_path`, via MCP `apply_migration`):
- `CREATE OR REPLACE FUNCTION` em `calcular_valor_contabil`/
  `calcular_depreciacao_mensal`, adicionando o mesmo guard de staff já usado
  em `get_next_tombamento` (`RAISE EXCEPTION` se `system_role` não é
  `GLOBAL_ADMIN`/`SECTOR_ADMIN`/`LOCAL_ADMIN`) + `REVOKE EXECUTE ... FROM anon`
  como defesa em profundidade.
- `ALTER FUNCTION ... SET search_path = public` em `check_matricula_unica`,
  `patrimony_movement_trigger` e `validate_unit_hierarchy` — sem reescrever o
  corpo das funções (o `.sql` fonte de `validate_unit_hierarchy`, migration
  057b, não existe neste disco — ver item 1.3 abaixo).

**Ambientes:** aplicado em produção (`toduvwtzklntyptcodkf`) **e** staging
(`cjxdroyyplpknygtcdgr`) — confirmado que `validate_unit_hierarchy` existe
nos dois ambientes (avaliação inicial errada assumia que era só staging;
corrigida durante a execução).

**Validação técnica:**
- `get_advisors(type: security)` rodado antes e depois nos dois projetos:
  os 3 alertas `function_search_path_mutable` desapareceram completamente
  das duas listas.
- Consulta direta a `pg_proc` (`proconfig`) confirmando
  `search_path=public` fixado nas 5 funções, nos dois ambientes.
- Consulta ao corpo da função (`pg_get_functiondef` via `execute_sql`)
  confirmando a string do guard de staff presente em
  `calcular_valor_contabil`/`calcular_depreciacao_mensal` (`tem_guard_staff:
  true`) — não apenas que a migration "rodou sem erro".

**Nota sobre alertas que continuam aparecendo no advisor:** as 11 funções
`SECURITY DEFINER` expostas via RPC (incluindo as 2 corrigidas aqui e as 9
que já tinham guard desde sempre, ex. `get_next_certificado`) continuam
listadas como "Public Can Execute SECURITY DEFINER Function" — isso é
esperado: é um alerta estrutural do linter (qualquer função `SECURITY
DEFINER` exposta), não uma indicação de que o guard não funciona. Mesmo
comportamento que `get_next_tombamento`/`get_next_certificado` sempre
tiveram, mesmo com `REVOKE ... FROM anon` já aplicado.

**Auditoria formal:** RESOLVIDO. Achado original fechado com evidência
verificável (não apenas leitura de código) nos dois ambientes.

---

### 1.2 — Status `MIGRATIONS_FAILED` da branch staging

**Status: ⚠️ DIAGNOSTICADO — não é um problema ativo, mas achou algo mais grave (ver 1.2b abaixo)**

`query_logs` (Postgres logs via MCP) retornou erro de backend em toda
tentativa, inclusive contra produção e em janelas recentes — não foi
possível recuperar o log/erro original de 14/08/2026 (creation-time da
branch). Ferramenta indisponível nesta sessão, não um dado negativo.

**Evidência estrutural coletada (contorna a limitação do log):**
- `updated_at` da branch staging é idêntico ao `created_at`
  (`2026-08-14T20:18:51`) — o status nunca mudou desde a criação, é o
  resultado do processo automático de provisionamento (replay do histórico
  de `main` numa branch nova), não de nenhuma migration aplicada depois.
- `preview_project_status: ACTIVE_HEALTHY` — a branch está saudável como
  banco em uso agora.
- Schema real tem 51 tabelas em `public`, idêntico em nomes ao de produção;
  `execute_sql`/`apply_migration`/`get_advisors` funcionaram normalmente
  nesta sessão contra ela (inclusive os fixes do item 1.1).

**Conclusão:** `MIGRATIONS_FAILED` é uma flag congelada de um evento de
provisionamento (provavelmente um timeout ou falha pontual no replay
inicial de `main` → nova branch), sem efeito prático — a branch está
funcional e recebendo migrations normalmente desde então. Não é um risco
ativo. Recomendação: ignorar a flag (ou recriar a branch só se o Supabase
oferecer isso sem perda de dado, o que não é urgente).

### 1.2b — Achado crítico não relacionado ao item acima: banco de produção está mais adiantado do que o `list_migrations` mostra, mas o Git/código de produção NÃO tem o merge de i18n que o relatório afirma

**Status: 🔴 REABERTO — contradiz relatório já entregue, precisa da sua decisão antes de prosseguir**

Ao investigar a branch staging, comparei o schema real dos dois bancos
(não só a tabela de histórico de migrations) e encontrei duas coisas que
mudam conclusões anteriores:

**a) O schema de produção está muito mais adiantado do que a auditoria (minha e as 4 rodadas anteriores) concluiu.** `list_migrations` mostra produção parada em `051_faq_modulo` — mas isso é só a tabela de tracking. O schema real tem `admin_roles`, `units`, `profiles.must_change_password`, `profiles.pode_escanear_provas` — tudo isso presente e idêntico a staging. Ou seja, alguém aplicou as migrations 052–068 (pelo menos) direto em produção via SQL Editor manual (método documentado como válido no próprio `supabase/migrations/README.md`), sem que isso ficasse registrado em `supabase_migrations.schema_migrations`. **A conclusão anterior de "produção roda um modelo de hierarquia mais antigo" estava errada** — o banco de produção já tem a reestruturação `units`/`admin_roles`.

**b) `profiles.locale` (migration 074, parte da Fase 0 do i18n) NÃO existe em produção.** E, mais importante: fui conferir o código-fonte real em `C:\Projetos\portal-teologico-os` (pasta de produção) —
- `src/app/[locale]/` **não existe** — a árvore de rotas ainda é a estrutura antiga, sem locale.
- `next-intl` **não está** em `package.json`.
- `git log --all` procurando "locale"/"i18n"/"intl" no histórico de commits: **zero resultados**.
- Último merge real em `main`: 15/08/2026, sobre "recuperar senha" — nada de i18n.

Isso **contradiz diretamente** o `Relatorio-Tecnico-Padronizacao-Idiomas-CETADP.md`, que afirma: *"Fase 0 (infraestrutura) — concluída e já mesclada em main."* Pelo que verifiquei agora, ao vivo, isso não é verdade neste repositório/banco de produção — nem o código nem a migration `074` chegaram lá.

**Isto não é uma correção que eu deva aplicar sozinho** — é uma divergência entre um relatório que você já recebeu (de outra sessão) e o estado real do sistema. Pode ser que: (i) o relatório estava se referindo a um merge que ainda não tinha acontecido de fato e a frase ficou incorreta, (ii) existe um outro repositório/remote que não estou vendo, ou (iii) o merge foi revertido depois. Preciso que você esclareça antes de eu seguir tratando isso como fechado.

### 1.3 — Gap de arquivos locais (030–039, 057b)

*(pendente)*

### 1.4 — Varredura de segredo no histórico do Git

*(pendente)*
