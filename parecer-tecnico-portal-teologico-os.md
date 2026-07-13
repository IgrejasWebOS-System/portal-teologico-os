# Parecer Técnico e Cronológico

**Projeto avaliado:** portal-teologico-os (nome interno no banco: "IgrejasWebOS")
**Local analisado:** pasta completa do repositório conectado (código-fonte, histórico de versionamento, migrações de banco de dados, configurações)
**Data do parecer:** 12/07/2026
**Metodologia:** leitura integral dos arquivos do projeto (excluindo `node_modules`), inspeção do histórico Git (via `.git/logs/HEAD`, já que o commit `git log` interativo não estava disponível no ambiente de análise), leitura das migrações SQL/Supabase e revisão de código-fonte (rotas, server actions, componentes, middleware de autenticação).

---

## 1. Cronologia do desenvolvimento

O repositório Git contém **apenas 3 commits** no total, todos do mesmo autor (`connectioncyberos@gmail.com`), sem branches ou pull requests:

| # | Data/hora (local, -03:00) | Commit | Conteúdo |
|---|---|---|---|
| 1 | 20/05/2026, ~00:19 | `dfb72cc` | "Initial commit from Create Next App" — scaffold padrão do Next.js |
| 2 | 18/06/2026, 22:05 | `ab5eb25` | "backup: 2026-06-18_22-05 - configuracoes module + migration 009" |
| 3 | 19/06/2026, 09:25 | `345c62b` (HEAD atual) | "backup: 2026-06-19_09-25 - configuracoes module + migration 009" |

**Leitura cronológica dos fatos:**

- Entre o commit inicial (20/05) e o segundo commit (18/06) há um intervalo de **~30 dias sem nenhum registro de versionamento**. Todo o desenvolvimento ocorrido nesse período (autenticação, módulo de membros, EBD, Escola, Cursos, Admin de conteúdo etc.) foi consolidado retroativamente em um único commit de "backup", sem histórico incremental, sem mensagens descritivas por funcionalidade e sem possibilidade de auditoria de quando cada parte foi efetivamente construída.
- O terceiro commit ocorre **11 horas depois** do segundo, com a mensma mensagem genérica ("configuracoes module + migration 009"), sugerindo um novo "salvamento" do mesmo lote de trabalho, não uma nova entrega identificável.
- **Não há commits desde 19/06/2026.** Considerando a data de hoje (12/07/2026), o repositório está **parado há 23 dias**, apesar de o projeto conter módulos que aparentam estar incompletos ou com dívida técnica (ver seções 3 e 4).
- Todo o histórico pertence a uma única conta de e-mail genérica do prestador ("connectioncyberos"), não a uma conta do cliente. Isso é relevante para **governança/continuidade**: se a relação com o prestador for encerrada, é preciso confirmar que o cliente tem acesso próprio ao repositório remoto (GitHub/GitLab) e ao projeto Supabase (não apenas ao código local).
- Um script solto na raiz do projeto, `EXTRACT_DNA.ps1`, se identifica textualmente como pertencente ao prestador ("PROJETO: CONNECTION CYBER OS — LEGACY HARVESTER", "ALVO: EXTRAÇÃO DE ESTRUTURA PARA CONNECTIONCYBER") e descreve seu objetivo como "mapeamento cirúrgico para fusão de cadastros". Isso indica que o prestador usa este projeto (ou seus dados) como base para reaproveitamento em outro contexto/cliente — algo que, dependendo do contrato firmado, pode ou não ser apropriado e vale confirmar contratualmente (exclusividade do código, propriedade intelectual, não reuso de cadastros de membros de igreja para outros fins).

**Limitação da análise:** sem acesso a um terminal git completo neste ambiente, não foi possível rodar `git log -p`/`git diff` para inspecionar o conteúdo linha a linha de cada commit. A reconstrução acima usa o reflog (`.git/logs/HEAD`) e os timestamps Unix nele contidos, que são confiáveis para datas/autoria, mas não substituem uma auditoria de diff completa caso seja necessário nível de detalhe maior.

---

## 2. Arquitetura e stack técnica

- **Framework:** Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript (modo `strict` ativado — ponto positivo).
- **Backend/dados:** Supabase (Postgres + Auth + RLS), acessado via `@supabase/ssr`.
- **Estilo:** Tailwind CSS 4 + `tailwind-merge`/`clsx`; ícones via `lucide-react`; animações via `framer-motion`.
- **Autenticação:** middleware (`src/proxy.ts` + `utils/supabase/middleware.ts`) valida sessão com `supabase.auth.getUser()` (forma correta, revalida no servidor — evita o erro comum de confiar em `getSession()` no client).
- **Testes:** nenhum framework de teste (Jest/Vitest/Playwright) está presente no `package.json`. Não há testes automatizados no projeto.
- **CI/CD:** não há pipeline (`.github/workflows` inexistente). Deploy e verificação de qualidade dependem de execução manual.
- **Documentação:** o `README.md` é o boilerplate padrão gerado pelo `create-next-app` — não há nenhuma documentação real do projeto (como rodar, variáveis de ambiente necessárias, descrição dos módulos, como aplicar as migrações).

### Módulos implementados (por rota)

1. **Autenticação** `(auth)/login` — login por e-mail/senha.
2. **Dashboard da Igreja** `(igreja)` — página inicial, **Membros** (cadastro completo com CPF/RG/endereço/contato, arquivamento, histórico/timeline de ocorrências), **Configurações** (setores, cargos eclesiásticos, profissões, escolaridade, estado civil, gênero, igrejas, regiões-DF, controle de acessos/usuários/campos/líderes/sedes, departamentos), **Ocorrências**, listagem de **Igrejas**.
3. **EBD** (Escola Bíblica Dominical) `(ebd)` — trimestres e lições em vídeo, com player e progresso de leitura.
4. **Escola** `(escola)` — cursos com player de aula e conclusão de lição.
5. **Cursos** `(cursos)` — estrutura praticamente idêntica ao módulo Escola.
6. **Admin de Conteúdo** `(admin)/admin/conteudo` — criação/edição de aulas e trilhas/cursos, publicação/despublicação.

---

## 3. Achados técnicos — pontos positivos

- Uso correto de `supabase.auth.getUser()` no middleware (prática recomendada oficialmente pela Supabase; erro comum evitado).
- TypeScript em modo `strict`, reduzindo bugs de tipagem.
- `.env.local` corretamente listado no `.gitignore` — nenhuma chave (incluindo a `SUPABASE_SERVICE_ROLE_KEY`, que dá acesso irrestrito ao banco) foi encontrada versionada ou referenciada no código-fonte do cliente.
- Componente de **logout automático por inatividade** (`AutoLogout.tsx`) bem implementado, com aviso prévio de 5 minutos e boa UX.
- Tratamento defensivo de concorrência no cadastro de membros: além da checagem prévia de CPF/matrícula duplicados, o código também trata o erro `23505` (violação de unicidade do Postgres) como rede de segurança contra condição de corrida.
- Módulo `member_timeline` (migração 003) com RLS corretamente restrita por igreja (`church_id`), isolando dados entre igrejas diferentes.

## 4. Achados técnicos — problemas e riscos

### 4.1 Controle de acesso (severidade alta)

Nenhuma rota ou server action de **Admin** verifica papel/permissão do usuário — apenas se ele está autenticado (`if (!user) redirect("/login")`). Isso foi confirmado em `admin/conteudo/actions.ts` (criar/editar aulas, criar cursos, publicar/despublicar) e reforçado pelo próprio `Sidebar.tsx`, que exibe o menu "Admin" para qualquer usuário logado, sem checagem condicional. Na prática, **qualquer membro autenticado pode, hoje, criar, editar e publicar conteúdo administrativo**, bastando acessar a URL.

Mais grave: a migração `010_rls_policies_configuracoes.sql` declara explicitamente em comentário — *"Permissão: qualquer usuário autenticado pode ler e escrever"* — para tabelas de configuração (setores, cargos eclesiásticos, profissões, escolaridade, estado civil, gênero). Isso é uma regressão de segurança em relação ao padrão mais cuidadoso visto na migração 003 (`member_timeline`), que restringe corretamente por igreja. A cronologia do Git sugere que esse relaxamento ocorreu justamente no último lote de trabalho registrado (18–19/06), o que pode indicar pressa para "fechar o backup" sem revisar as implicações de segurança.

**Recomendação:** implementar controle de papel (RBAC) real — checagem de `role`/`is_admin` no servidor (server actions e, idealmente, também no middleware) — antes de liberar o sistema para uso em produção com usuários reais.

### 4.2 Dados sensíveis de membros (severidade alta / conformidade LGPD)

A tabela `members` armazena CPF, RG (com órgão emissor e UF), endereço completo, telefone, e-mail, data de nascimento, filiação e estado civil — dados pessoais e, em parte, sensíveis conforme a LGPD. A migração que cria essa tabela (provavelmente "001") **não está presente no repositório** (as migrações disponíveis começam em `002`), portanto **não foi possível confirmar, a partir dos arquivos entregues, qual política de RLS protege a tabela `members` hoje em produção**. Dado o padrão permissivo encontrado na migração 010, recomenda-se auditar diretamente no painel do Supabase se `members` está restrita por igreja/perfil ou se está com a mesma política "qualquer autenticado pode ler/escrever" — isso definiria se membros de uma igreja podem ver ou alterar dados de membros de outra igreja.

### 4.3 Duplicação de código (dívida técnica)

`EscolaLessonPlayer.tsx` e `CursosLessonPlayer.tsx` são **idênticos** (mesmo código, diferindo apenas no nome do componente). Os três módulos de conteúdo em vídeo (EBD, Escola, Cursos) foram implementados como três verticais paralelas ao invés de um componente/rota genérica reaproveitável — sinal de desenvolvimento apressado ou copiar-colar, que aumenta o custo de manutenção (qualquer correção de bug precisa ser replicada manualmente nos três lugares).

### 4.4 Organização de migrações de banco

Existem **duas pastas de migração diferentes** (`supabase/migrations/` e `sql/migrations/`), sem numeração contínua: faltam as migrações 001 e 004–008. Não há uma fonte única de verdade para o schema do banco dentro do repositório — o arquivo `schema_introspection.sql` (um script de consulta ao catálogo do Postgres, não uma migração) sugere que a documentação do schema foi feita "engenharia reversa" a partir do banco já existente, não mantida como histórico de migrações desde o início.

### 4.5 Ausência de testes e CI

Não há nenhum teste automatizado nem pipeline de integração contínua. Para um sistema que lida com dados pessoais de membros de igreja e múltiplos módulos de conteúdo pago/gerido, isso eleva o risco de regressões silenciosas a cada alteração.

### 4.6 Documentação

`README.md` nunca foi atualizado (ainda é o texto padrão do `create-next-app`). Não há instruções de setup, variáveis de ambiente exigidas, ou visão geral dos módulos — o que dificulta o handover para outro desenvolvedor ou equipe caso o vínculo com o prestador atual termine.

---

## 5. Parecer / conclusão

O projeto entrega um escopo funcional amplo (CRM eclesiástico com histórico de membros, três módulos de conteúdo em vídeo e um módulo administrativo) sobre uma stack moderna e tecnicamente razoável (Next.js 16 + React 19 + TypeScript strict + Supabase). Pontos de qualidade genuínos existem, como a validação de sessão no middleware e o tratamento de concorrência no cadastro de membros.

Entretanto, o **histórico de versionamento não reflete uma disciplina de engenharia madura**: três commits em dois meses, todos do prestador, sem rastreabilidade incremental, e parado há 23 dias. Mais importante do ponto de vista de risco: **o controle de acesso administrativo está ausente na camada de aplicação**, e ao menos um módulo de banco de dados concede explicitamente leitura/escrita irrestrita a qualquer usuário autenticado — um padrão que, se replicado na tabela de membros (não verificável a partir dos arquivos disponíveis), representaria exposição de dados pessoais sensíveis entre igrejas/usuários sem relação com aquele cadastro.

**Antes de qualquer uso em produção com dados reais de membros**, recomenda-se, em ordem de prioridade:

1. Auditar e corrigir a política RLS da tabela `members` diretamente no Supabase.
2. Implementar checagem de papel/permissão (admin vs. membro comum) nas rotas e server actions de `/admin` e de `/dashboard/configuracoes`.
3. Recuperar ou reconstituir as migrações ausentes (001, 004–008) para ter uma fonte única e completa do schema.
4. Estabelecer um mínimo de testes automatizados para os fluxos críticos (cadastro/edição de membros, publicação de conteúdo).
5. Esclarecer contratualmente com o prestador a propriedade do código, o acesso do cliente ao repositório remoto/Supabase, e o uso do script `EXTRACT_DNA.ps1` (reaproveitamento de estrutura/cadastros para outros projetos do prestador).

Este parecer reflete o estado dos arquivos na data acima e as limitações de análise descritas na Seção 1 (ausência de terminal Git completo no ambiente de avaliação).
