# Parecer técnico — Separação Staging/Produção (portal-teologico-os)

Baseado em: `doisprojetossupabase.md` (padrão connection-cyber-os) + print do Supabase do projeto `portal-cidadania-os`.
Data: 2026-07-20 | Responsável pela análise: Claude (Cowork) | Decisão final: Joaquim Coelho (21/07/2026)

---

## STATUS: DECISÃO TOMADA — PROJETO ÚNICO MANTIDO, SEPARAÇÃO ADIADA

Este parecer chegou a uma conclusão diferente da recomendação original da seção 5. O motivo e a decisão final estão registrados na **seção 9**, ao final do documento. As seções 1–8 abaixo ficam como registro da análise original — o cronograma da seção 6 **não foi executado** e não deve ser retomado sem reabrir esta decisão.

---

## 1. Objetivo

Avaliar a aplicação do padrão de dois ambientes Supabase (staging + produção), já usado no ecossistema connection-cyber-os, ao projeto `portal-teologico-os`, e propor um cronograma de implementação com validação obrigatória em cada etapa — nenhuma etapa avança sem confirmação explícita da anterior.

## 2. O que o documento de referência propõe (síntese)

- Dois projetos Supabase isolados por ambiente: `{projeto}` (produção) e `{projeto}-staging` (desenvolvimento).
- Variáveis de ambiente controlam para onde o código aponta (`.env.local` para staging local, variáveis do Vercel para produção).
- Duas branches Git alinhadas aos ambientes (`develop` → staging, `main` → produção via Vercel).
- Migrations sempre testadas em staging antes de aplicadas em produção.
- Plano gratuito do Supabase permite 2 projetos **ativos** simultâneos por organização.

Tecnicamente é uma boa prática padrão de mercado (é exatamente o conceito de "environment parity" do 12-Factor App). Não há nada no documento que não se aplique também a este projeto.

## 3. Diagnóstico do estado atual do portal-teologico-os

Levantamento feito agora, direto no projeto e no Supabase:

- **Um único projeto Supabase** em uso: `toduvwtzklntyptcodkf` (região `sa-east-1`, plano Free, status `ACTIVE_HEALTHY`).
- **`.env.local` aponta direto para esse único projeto** — não existe separação de ambiente hoje. Tudo que rodamos localmente (inclusive testes, migrations e dados de demonstração) acontece no mesmo banco que seria "produção" no dia em que o CETADP começar a usar de verdade.
- **A aplicação real (Next.js) nunca foi implantada no Vercel** — não existe `.vercel/` no projeto. Só as duas páginas de apresentação em HTML (`apresentacao-cetadp.vercel.app` e a versão para igrejas) foram publicadas, e são sites estáticos separados, sem relação com o banco de dados.
- **Git tem uma única branch (`main`)** — o script de backup sempre confirma e envia para a branch atual, que é sempre `main`. Não existe `develop` nem qualquer fluxo de branch por ambiente.
- **41 migrations já aplicadas** diretamente nesse único banco, incluindo dados de demonstração espalhados por praticamente todos os módulos: 2 disciplinas completas (10 aulas cada), 3 contas de aluno demo com matrículas/simulados/provas, lançamentos financeiros (caixa diário, contas a pagar/receber), patrimônio, produtos da loja, certificado modelo, leads. Total: 41 tabelas, todas com RLS habilitada, a maioria já com linhas de dado fictício.
- **A organização Supabase (`IgrejasWebOS-System`, plano Free) já tem 2 projetos ativos simultâneos**: o `portal-teologico-os` atual e o projeto antigo compartilhado `swczhmhyqygpdzxwpvfo` (usado por outro sistema, `Igrejas-Web-os`, ainda em produção lá). Existe também um terceiro projeto (`Igrejas-Web-System-OS`) que está `INACTIVE` (pausado), então não conta contra o limite.

## 4. Restrição crítica: o plano Free já está no limite de projetos ativos

O plano Free do Supabase permite **2 projetos ativos por organização**. Essa organização já usa os 2 (`portal-teologico-os` + o projeto antigo compartilhado). **Criar um terceiro projeto ativo (`portal-teologico-os-staging`) hoje não é possível sem uma destas duas ações:**

| Opção | O que significa | Custo |
|---|---|---|
| A. Pausar o projeto antigo (`swczhmhyqygpdzxwpvfo`) | Só é seguro se nada em produção do `Igrejas-Web-os` depender dele agora. **Preciso da sua confirmação — não vou pausar nada sem essa checagem.** | Zero |
| B. Assinar o plano Pro do Supabase | Libera projetos ilimitados, +7 dias de backup automático diário (relevante para o parecer de risco de perda de dados já entregue), +100GB de banda | US$25/mês |
| C. Adiar — manter 1 ambiente só por enquanto | Nenhuma mudança agora | Zero, mas mantém o risco descrito abaixo |

Isso é uma decisão sua, não técnica — preciso que escolha antes de eu criar qualquer projeto novo.

## 5. Recomendação de arquitetura

Com 41 tabelas já povoadas de dados **fictícios** (alunos demo, matrículas demo, financeiro demo, patrimônio demo) construídos justamente para demonstração ao cliente, o projeto atual **já se comporta como um ambiente de staging**, só que sem o nome.

**Recomendação:** em vez de criar um projeto novo e tentar "limpar" o atual depois, o caminho mais seguro é:

- **`toduvwtzklntyptcodkf` (atual) vira oficialmente STAGING** — continua sendo onde desenvolvemos, testamos migrations, mexemos em dados fictícios à vontade. Nada muda no dia a dia.
- **Um projeto novo, limpo, vira PRODUÇÃO** — recebe só a estrutura (schema), sem nenhum dado fictício, pronto para o dia em que o CETADP for usar de verdade com dados reais de alunos.

Isso evita o trabalho arriscado de tentar identificar e apagar dado por dado fictício do banco atual (com chance real de apagar algo que devia ficar). Só migro dado real pra produção quando o cliente realmente começar a usar.

**Esta recomendação também depende da sua aprovação antes de eu prosseguir** — é uma decisão de arquitetura, não só técnica.

## 6. Cronograma — passo a passo com validação obrigatória

Regra combinada: **cada item só é considerado concluído depois que você confirmar o resultado da validação.** Não executo o próximo item sem essa confirmação.

### FASE 0 — Decisões (bloqueante — nada é criado antes disso)

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 0.1 | Confirmar qual opção da seção 4 (A, B ou C) | Sua resposta em chat | Você escolher uma das três |
| 0.2 | Confirmar a recomendação da seção 5 (atual = staging, novo = produção) | Sua resposta em chat | Você aprovar ou propor alternativa |
| 0.3 | Definir nome do projeto de produção no Supabase (sugestão: `portal-teologico-os` — o atual muda de propósito mas não precisa mudar de nome técnico até você decidir; ou criar já com nome definitivo) | Sua resposta em chat | Nome definido |

### FASE 1 — Criar o projeto de produção no Supabase

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 1.1 | Criar projeto novo via MCP do Supabase, mesma região (`sa-east-1`) | Rodar `list_projects` e conferir status `ACTIVE_HEALTHY` | Você confirmar visualmente no dashboard também |
| 1.2 | Anotar `project_id`, URL e chaves (anon/service_role) do novo projeto | Chaves visíveis em Project Settings → API Keys | Você confirmar que salvou/recebeu as chaves com segurança |

### FASE 2 — Replicar o schema (sem dados fictícios)

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 2.1 | Reaplicar as migrations 001–041 no projeto novo, **pulando as que só inserem dado de demonstração** (identificar cada uma: schema/RLS/função vs. seed fictício) | Lista das migrations aplicadas vs. puladas, com justificativa de cada pulo | Você validar a lista antes de eu rodar qualquer uma |
| 2.2 | Rodar as migrations aprovadas, uma a uma, com checagem de erro a cada uma | Saída de cada `apply_migration` sem erro | Você validar após cada lote (ou eu paro no primeiro erro) |
| 2.3 | Comparar `list_tables` dos dois projetos (nomes, contagem, RLS habilitada) | Tabela lado a lado: staging vs. produção | Contagem de tabelas e RLS batendo 1:1, produção com 0 linhas de dado fictício |
| 2.4 | Rodar `get_advisors` (segurança) no projeto novo | Sem alertas críticos novos que não existissem no staging | Você aprovar o resultado |

### FASE 3 — Variáveis de ambiente

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 3.1 | Confirmar que `.env.local` (staging) continua apontando pro projeto atual — nenhuma mudança aqui | Conferir o arquivo | OK visual |
| 3.2 | Criar um `.env.production.local` de referência (não commitado) com as chaves do projeto novo, só para eu conseguir rodar `npm run build` localmente contra produção se precisar | Arquivo existe, não aparece em `git status` | Você confirmar que `.env*` continua no `.gitignore` (já confirmado) |
| 3.3 | Registrar as chaves de produção também no `config/paths.json` ou local combinado, para a rotina de backup saber diferenciar os dois bancos no futuro | Revisão do arquivo de config | Você aprovar o formato |

### FASE 4 — Git: branches por ambiente

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 4.1 | Criar branch `develop` a partir do `main` atual | `git branch` mostra as duas | Você confirmar |
| 4.2 | Definir `develop` como branch de trabalho do dia a dia (aponta pro Supabase staging) | Próximos commits feitos em `develop` | Você aprovar o fluxo |
| 4.3 | `main` passa a receber só merge de `develop` quando algo for validado pra ir pra produção | Nenhuma ação imediata — só regra combinada | Você confirmar que entendeu o fluxo |

### FASE 5 — Vercel (quando formos publicar o app de verdade, não as apresentações)

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 5.1 | Vincular o repositório `portal-teologico-os` a um projeto Vercel (hoje não existe) | Projeto aparece em `list_projects` do Vercel | Você confirmar que quer publicar agora ou só deixar preparado |
| 5.2 | Configurar variáveis de ambiente de PRODUÇÃO no painel do Vercel (não em arquivo) | Variáveis visíveis em Settings → Environment Variables | Você conferir os valores certos por lá (chaves de produção) |
| 5.3 | Configurar deploy automático: `main` → produção, `develop` → preview (opcional) | Testar 1 deploy de cada | Deploy sobe sem erro nos dois casos |

### FASE 6 — Documentação e rotina de backup

| # | Item | Como validar | Critério para avançar |
|---|---|---|---|
| 6.1 | Atualizar `CLAUDE.md`/`AGENTS.md` do projeto com o novo fluxo de ambientes | Revisão do texto | Você aprovar a redação |
| 6.2 | Adaptar `scripts/backup-portal-teologico.ps1` para rodar `pg_dump` dos DOIS bancos (staging e produção), cada um na sua pasta | Rodar o script e conferir os 2 arquivos `.dump` gerados | Dump de cada ambiente íntegro e no lugar certo |
| 6.3 | Atualizar `supabase/migrations/README.md` explicando que, dali pra frente, toda migration passa primeiro por staging e só depois por produção | Revisão do texto | Você aprovar |

## 7. O que eu NÃO vou fazer sem autorização explícita, item por item

- Pausar o projeto Supabase antigo (`swczhmhyqygpdzxwpvfo`).
- Assinar/mudar qualquer plano pago (Supabase Pro, Vercel Pro, etc.) — pagamento é sempre com você.
- Publicar o app de verdade no Vercel antes de você pedir.
- Apagar qualquer dado do banco atual.

## 8. Observações finais (análise original, 20/07)

O padrão do documento é sólido e vale a pena aplicar — principalmente porque ainda não existe cliente real usando o sistema, que é exatamente o cenário "custo zero, benefício alto" da tabela do próprio documento de referência. O único ponto de atenção real é a restrição de 2 projetos ativos do plano Free, que já está no limite — por isso a Fase 0 é bloqueante antes de qualquer criação de projeto.

---

## 9. Decisão final (21/07/2026)

Ao longo da conversa, dois fatos novos mudaram a conclusão deste parecer:

**a) O custo real do plano Pro não é fixo.** O plano Pro (US$25/mês) inclui um crédito de computação de US$10/mês, suficiente para cobrir só **1** projeto ativo. A partir do segundo projeto ativo na mesma organização, cada projeto adicional soma **+US$10/mês**, sem teto:

```
Total mensal = US$25 (Pro) + US$10 × (nº de projetos ativos − 1)
```

Como a organização (`IgrejasWebOS-System`) já tem outros projetos Supabase (o banco antigo compartilhado `swczhmhyqygpdzxwpvfo`, ativo, e o projeto `Igrejas-Web-System-OS`, pausado), criar um projeto de produção separado para o portal teológico não custaria só os US$25 já assinados — somaria mais US$10/mês só para esse projeto, com risco de crescer ainda mais se outros projetos do ecossistema (ex. `portal-cidadania-os`) forem reativados/trazidos para a mesma organização depois. Isso tornou o custo do plano recomendado na seção 5 inviável para o momento.

**b) O `portal-teologico-os` já é um projeto independente, por desenho.** A investigação confirmou que o banco atual (`toduvwtzklntyptcodkf`) foi criado em 13/07/2026 especificamente como "Fase 1 do plano de isolamento" — para desvincular o módulo de teologia do sistema maior `Igrejas-Web-System-OS` e permitir a entrega do portal como produto independente ao CETADP. Ou seja, o objetivo de "ter o portal teológico único, sem dependências" **já estava cumprido antes mesmo deste parecer** — o que faltava era só a separação interna de staging/produção, que é uma camada adicional, não um requisito para a independência do projeto.

### Decisão

- **`portal-teologico-os` continua com um único projeto Supabase** (`toduvwtzklntyptcodkf`), exatamente como está hoje. Nenhum projeto novo foi criado.
- **Nenhuma separação staging/produção será implementada por enquanto.** O cronograma da seção 6 fica registrado para referência futura, mas não deve ser executado sem reabrir esta decisão.
- **Não reativar nem reintegrar o `Igrejas-Web-System-OS`** com o módulo de teologia de volta — o retrabalho não se justifica com o portal já praticamente pronto para apresentação ao cliente de forma independente.
- **A assinatura do Supabase Pro (US$25/mês) foi mantida** — ela sozinha já resolve o achado mais grave do parecer de risco de perda de dados anterior (backup diário automático por 7 dias, ausente no plano Free), sem custo adicional de projeto.
- **Os outros dois projetos Supabase da organização** (`swczhmhyqygpdzxwpvfo` e `Igrejas-Web-System-OS` pausado) não foram alterados — pausar, reativar ou consolidar esses projetos é decisão a ser tomada quando o trabalho for especificamente nesses sistemas, fora do escopo deste parecer.

### Quando revisitar esta decisão

Faz sentido reabrir a separação staging/produção quando pelo menos uma destas condições acontecer:

- O CETADP começar a usar o portal com dados reais de alunos (produção de verdade, não mais demonstração).
- Houver orçamento previsto especificamente para infraestrutura (o custo de +US$10/mês por projeto deixar de ser um problema).
- A unificação com o `igrejas-web-system-os` (já prevista no `CLAUDE.md` daquele projeto) for iniciada — nesse cenário a arquitetura de ambientes deve ser decidida para o sistema unificado, não isoladamente para o portal teológico.

Até lá, a rotina de backup (`scripts/backup-portal-teologico.ps1`, código + banco) continua sendo a principal proteção contra perda de dados, complementada agora pelos backups diários automáticos do plano Pro.
