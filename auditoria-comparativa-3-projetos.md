# Auditoria Comparativa — 3 Projetos

**Diretórios avaliados:**
- `C:\Projetos\Igrejas-Web-os`
- `C:\Projetos\portal-teologico-os`
- `C:\Projetos\igrejas-web-system-os`

**Data:** 13/07/2026 · **Metodologia:** leitura de código-fonte, `package.json`, histórico Git (`.git/logs/HEAD`), migrações SQL e arquivos de instrução de projeto (`CLAUDE.md`, `README.md`) das três pastas.

---

## Achado principal (leia isto primeiro)

O arquivo `igrejas-web-system-os/CLAUDE.md` declara, na primeira linha de identidade do projeto:

> *"Sistema de gestão eclesiástica multi-tenant com módulos configuráveis por ministério. **Substitui e unifica: IgrejasWebOS + portal-teologico-os.**"*

Ou seja: **o próprio fornecedor já classifica dois dos três projetos (incluindo o `portal-teologico-os`, onde construímos o Portal EAD do CETADP até agora) como algo a ser substituído** por um terceiro projeto mais novo e mais ambicioso. Isso é o achado mais importante desta auditoria e tem relação direta com a apresentação de 24/07 — ver seção 5.

---

## 1. Cronologia (por histórico Git)

| Projeto | Início | Autor do Git | Commits | Observação |
|---|---|---|---|---|
| `Igrejas-Web-os` | ~02/02/2026 | **JoaquimMSCoelho** (você mesmo — conta Outlook) | 3 | Protótipo próprio, anterior à contratação do fornecedor |
| `portal-teologico-os` | 20/05/2026 | connectioncyberos (fornecedor) | 3 | O projeto em que construímos o Portal EAD do CETADP nesta conversa |
| `igrejas-web-system-os` | ~26/06/2026 | connectioncyberos (fornecedor) | ~40 | Reinício com arquitetura nova; declarado como sucessor dos outros dois |

**Leitura:** existem três tentativas de construir essencialmente o mesmo sistema de gestão eclesiástica, em ~5 meses, por duas partes diferentes (você mesmo, depois o fornecedor duas vezes). Isso por si só já é um sinal de alerta de governança de projeto — não necessariamente um erro de ninguém, mas um padrão de reinícios que vale entender antes de investir mais tempo em qualquer um dos três.

## 2. `Igrejas-Web-os` — o protótipo original (autoria sua)

- Pasta com estrutura duplicada: existe um projeto Next.js na raiz **e** um quase idêntico dentro de `web/` (mesmo `package.json`, nome interno `"web"` nos dois). Também há uma pasta `_LEGACY_ARCHIVE/` com um backup datado (`web_backup_20260202_2344_MembrosV1`) e um PDF (`ZZ-SISTEMA MEMBROS WEB - atualização (1) (3).pdf`) — provavelmente o documento de especificação original que deu origem a tudo isso (não consegui abrir o PDF nesta sessão por falta de uma ferramenta de renderização; se for útil, posso tentar de novo depois).
- Stack: Next 16.1.6, **Tailwind v3** (o único dos três ainda na v3), `framer-motion`, identidade visual "**enterprise emerald**" (verde) — mensagem do próprio commit: *"visual enterprise emerald consolidado"*.
- Único módulo com código real: **Membros v1**, com "status financeiro visual" (segundo a mensagem do commit).
- Autoria 100% sua — nenhum vínculo de código com o fornecedor nesta pasta.

## 3. `portal-teologico-os` — o projeto desta sessão

Já auditado em detalhe nos pareceres de 12/07 (`parecer-tecnico-portal-teologico-os.md`) e 13/07 (individualização do Portal EAD). Resumo para efeito de comparação:

- Stack: Next 16.2.6, Tailwind v4, tema "**IgrejasWebOS Design System v1.0**" (navy #111111 + dourado #C5A059).
- Módulos: Igreja/Membros, Escola, Cursos, EBD, Admin de Conteúdo — e, com o trabalho desta sessão, o Portal EAD/CETADP completo (home institucional, inscrição, matrícula, aprovação).
- Multi-tenancy: inexistente de forma estrutural (só o que construímos agora para o EAD, via `campo_ministerio_id`).
- RBAC: ausente na maior parte das rotas administrativas (só corrigido em `/admin/inscricoes`, nesta sessão).
- Só 3 commits no Git, todos do fornecedor, sem granularidade.

## 4. `igrejas-web-system-os` — o sucessor declarado

Este é, de longe, o mais maduro tecnicamente dos três, apesar de ser o mais recente:

- Stack: Next 15.5.19 (curiosamente a versão mais antiga do Next entre os três), Tailwind v4, mais `dompurify`/`jsdom` (sanitização de HTML no servidor — prática de segurança que nenhum dos outros dois tem) e `recharts` (para o módulo de analytics).
- **Multi-tenant de verdade, por convenção documentada**: `CLAUDE.md` exige `ministry_id uuid NOT NULL` em toda tabela, RLS obrigatória em todas, e proíbe explicitamente `SELECT` sem filtro de `ministry_id` em Server Actions.
- **RBAC real, com 5 níveis hierárquicos** (`admin_roles`): 0-Super-Master, 1-Master/Campo, 2-Admin-Sede, 3-Admin-Setor, 4-Usuário-Local — com helpers padronizados (`getAuthContext`, `requireAuthContext`, `assertLevel`) usados de forma consistente (um commit só atualiza 20 páginas de uma vez para usar esse padrão). **Isso resolve exatamente o problema de controle de acesso que apontei repetidamente no `portal-teologico-os`.**
- **"Party Pattern"**: cadastro de pessoas sempre na tabela `parties`, com papéis (`party_roles`) — em vez de uma tabela `members` fixa (como no `portal-teologico-os`) mais uma tabela `ead_alunos` separada (como a que criei nesta sessão). Essa é a abordagem mais correta para "uma pessoa, vários papéis" — o que é exatamente a situação de alguém que é membro de igreja **e** aluno do CETADP.
- Módulos planejados/começados: membros, financeiro, escola, cursos, EBD, secretaria, patrimônio, eventos, ocorrências, comunicação, voluntários, infantil, governança, permissões, API & webhooks, configurações, analytics, conciliação — 18 ao todo, um escopo bem maior que o do `portal-teologico-os`.
- Histórico Git bem mais granular (~40 commits com mensagens descritivas de correção específica), mas ainda concentrado num período muito curto (26–28/06/2026), e as tabelas por trás dos módulos mais avançados (financeiro, patrimônio etc.) não têm migração correspondente versionada — só `001_base_schema`, `002_rls_policies` e `003_seed` existem; o mesmo padrão de "migração aplicada sem arquivo salvo" que já apontei no `portal-teologico-os`.

## 5. Risco central e recomendação

Três identidades visuais diferentes (emerald / navy-dourado / sage-azul), três esquemas de banco diferentes, três repositórios Git separados — para o que é, na essência, o mesmo problema de negócio (gestão eclesiástica + ensino). O `igrejas-web-system-os` é tecnicamente o mais bem resolvido (multi-tenant real, RBAC real, padrão de cadastro de pessoas mais correto), mas é também o menos completo em funcionalidades prontas na tela, e o mais recente.

**Isso afeta diretamente o pitch de 24/07:** o Portal EAD que construímos está em cima do `portal-teologico-os` — que o próprio fornecedor já descreve como algo a ser substituído. Duas leituras possíveis, e a decisão é sua:

1. **Manter o pitch em cima do `portal-teologico-os`** (recomendado para o prazo de 24/07): é o que já está funcionando, testado e com a identidade visual do CETADP pronta. O risco fica documentado e vira um item do roadmap pós-aprovação ("migrar para a arquitetura multi-tenant real do `igrejas-web-system-os`").
2. **Investigar se vale portar o Portal EAD para o `igrejas-web-system-os`** antes do pitch — tecnicamente mais correto a longo prazo, mas arriscado a 11 dias do prazo, e ainda não tem nenhuma tela do EAD construída lá.

Recomendo a opção 1 para não colocar o prazo de 24/07 em risco, mas registrando explicitamente, no material do pitch, que existe um projeto de nova geração em andamento e que o Portal EAD será portado para lá quando estabilizado.

## 6. Achados secundários (padrões que se repetem)

- Nas três pastas, **cada uma tem sua própria pasta `node_modules` completa** (dezenas de milhares de arquivos) — normal para projetos Node separados, mas confirma que não há nenhum compartilhamento de código real entre eles (nem um monorepo, nem pacotes internos compartilhados).
- O hábito de poucos commits "backup" em vez de histórico incremental (já apontado no primeiro parecer) se repete em `portal-teologico-os`; foi parcialmente corrigido em `igrejas-web-system-os` (commits descritivos), mas o `CLAUDE.md` deste último ainda intitula os únicos dois "backup" restantes da mesma forma genérica.
- Migrações SQL sem arquivo correspondente para todas as tabelas referenciadas no código é um problema recorrente em pelo menos dois dos três projetos (`portal-teologico-os` e `igrejas-web-system-os`).

---

## 7. Verificação real do schema Supabase (13/07/2026, pós-conexão MCP)

A limitação do parágrafo original abaixo foi resolvida: conectei o Supabase via MCP e comparei o schema real de produção dos dois projetos contra as migrações locais.

**Confirmado:** `swczhmhyqygpdzxwpvfo` é usado por `portal-teologico-os` e `Igrejas-Web-os`; `outlsupecrgsiathvhcl` é usado por `igrejas-web-system-os`. Em ambos, `list_migrations` (o histórico de migração rastreado pelo próprio Supabase) retornou **vazio** — confirma que todas as alterações de schema, nos dois projetos, foram aplicadas manualmente pelo SQL Editor, nunca via CLI/arquivo de migração rastreado. É por isso que "onde rodar a migração" não tinha uma resposta óbvia.

### `swczhmhyqygpdzxwpvfo` (portal-teologico-os / Igrejas-Web-os)

- **30 tabelas em produção**, bem mais do que os arquivos locais lidos nesta sessão (002, 003, ebd_module, schema_introspection, 009, 010, 011) explicam — confirma numericamente o gap de migrações 001/004-008 já apontado.
- **Achado relevante:** as tabelas `admin_roles` e `ministries` — o padrão de RBAC de 5 níveis que elogiei no `igrejas-web-system-os` — **já existem nesta base de produção**, sem uso pelo código do `portal-teologico-os` (que só verifica `profiles.system_role`). O padrão mais maduro já está no banco; só não está conectado à aplicação.
- Dados reais de teste confirmados: `ead_inscricoes` (3 linhas) e `ead_campos_ministerios` (3 linhas) — os testes que você fez do fluxo de inscrição.
- **Risco crítico (nível ERROR) confirmado ao vivo:** 3 tabelas com RLS **desabilitado**: `department_types`, `church_departments`, `receivables` (esta última é financeira — contas a receber). `department_types` tem até política criada, mas RLS desligado, ou seja, a política nunca é aplicada. Essas 3 tabelas estão hoje totalmente expostas à chave `anon`.
- **Risco alto (nível WARN), muitas ocorrências:** políticas de RLS permissivas demais (`USING (true)` / `WITH CHECK (true)`) em `sectors`, `ecclesiastical_roles`, `members`, `ministries`, `settings_*`, `occurrence_types`, `member_timeline`, `member_occurrences` e, mais grave, **na própria `admin_roles`** (INSERT/UPDATE/DELETE liberados para qualquer usuário autenticado). Isso confirma, agora no nível de banco de dados (não só no código), a falha de RBAC já apontada no parecer técnico original: mesmo se o código da aplicação checasse papéis corretamente, qualquer usuário autenticado poderia alterar a tabela de controle de acesso diretamente via API.

### `outlsupecrgsiathvhcl` (igrejas-web-system-os)

- **~115 tabelas em produção** — muito além dos 3 arquivos locais (`001_base_schema`, `002_rls_policies`, `003_seed`), confirmando que o mesmo padrão de "schema aplicado sem arquivo salvo" também afeta este projeto, apesar de ser o mais novo.
- **Zero advisórios de nível ERROR.** Nenhuma tabela com RLS desabilitado, nenhuma política permissiva óbvia sinalizada. Postura de segurança real, medida, melhor que a do banco compartilhado — reforça a conclusão da seção 5 de que este é o projeto tecnicamente mais maduro dos três.

### Recomendação prática imediata

Independente da decisão sobre qual projeto seguir para 24/07, as 3 tabelas com RLS desabilitado em `swczhmhyqygpdzxwpvfo` (`department_types`, `church_departments`, `receivables`) são um risco real e presente, não uma hipótese — recomendo habilitar RLS nelas o quanto antes. Não apliquei a correção automaticamente (habilitar RLS sem política adequada bloquearia todo acesso às tabelas); o SQL de remediação e a decisão de quais políticas criar ficam com você:

```sql
ALTER TABLE public.department_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
```

*(Nota original, mantida para histórico: esta auditoria foi feita inicialmente por leitura direta de arquivos, sem acesso aos projetos Supabase reais — essa lacuna foi fechada nesta seção.)*
