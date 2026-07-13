# Parecer Técnico — Individualização do "Portal EAD de Teologia" a partir do IgrejaWebOS

**Contexto:** apresentação de negócio (pitch) em 24/07/2026, propondo um "Portal EAD de Teologia" como produto individual, destinado a atender múltiplos campos e ministérios, com vínculo futuro ao sistema já existente "IgrejaWebOS" (avaliado no parecer anterior, de 12/07/2026).

**Pergunta a responder:** dá para partir do código atual e individualizar este projeto como um produto multi-tenant, no prazo até 24/07?

**Resposta curta: sim**, com escopo de MVP ajustado ao prazo. O projeto atual já cobre boa parte do domínio de um portal EAD (autenticação, player de vídeo, progresso de aula, administração de conteúdo). O trabalho real dos próximos 12 dias é menos "construir do zero" e mais "reorganizar e isolar por cliente (tenant)" — e, felizmente, isso resolve ao mesmo tempo os dois problemas de segurança mais graves apontados no parecer anterior (controle de acesso e política de dados aberta), porque um produto multi-tenant não tolera esses dois problemas de jeito nenhum.

---

## 1. O que já existe e pode ser reaproveitado

- **Autenticação e sessão**: middleware com `getUser()` no servidor e logout automático por inatividade — reaproveitável sem alterações estruturais.
- **Motor de conteúdo em vídeo**: `VideoPlayer`, progresso de aula (`ebd_lesson_progress`, `completeLessonAction`), publicação/despublicação de curso — é o coração de qualquer portal EAD e já funciona em três variações (EBD, Escola, Cursos).
- **Administração de conteúdo**: criação de aulas e trilhas (`admin/conteudo`) — vira a base do painel de "criação de curso" do novo produto.
- **Padrão de isolamento por organização já provado**: a tabela `member_timeline` (migração 003) já implementa corretamente RLS restrita por `church_id`. Esse é exatamente o padrão que precisa ser generalizado para "tenant" (campo/ministério) no novo produto — não é preciso inventar a abordagem, só reaplicá-la de forma consistente.

## 2. O que precisa ser transformado para virar um produto individual e multi-tenant

### 2.1 Modelo de dados: introduzir o conceito de "tenant" (campo/ministério)

Hoje o sistema assume implicitamente uma única organização (uma igreja/entidade). Para atender "vários campos e ministérios diferentes" como clientes distintos, é necessário:

- Criar uma tabela `tenants` (ou reaproveitar/estender `churches` para representar campo/ministério, dependendo de como a denominação organiza campo → ministério → igreja local).
- Adicionar `tenant_id` às tabelas de cursos, aulas, trilhas, matrículas e progresso.
- Reaplicar em todas elas o mesmo padrão de RLS já usado em `member_timeline` (acesso restrito a quem pertence àquele tenant), no lugar do padrão perigoso encontrado na migração 010 ("qualquer autenticado pode ler/escrever").

Isso resolve, como efeito colateral direto, o risco de segurança mais grave do parecer anterior: com múltiplos campos como clientes pagantes (ou pelo menos distintos) do mesmo produto, uma falha de isolamento deixa de ser "um bug interno" e passa a ser "vazamento de dados entre clientes" — inaceitável num pitch de negócio.

### 2.2 Consolidar os três módulos de curso em um único motor de "Trilhas"

O parecer anterior identificou que `EscolaLessonPlayer` e `CursosLessonPlayer` são código idêntico, e que EBD segue o mesmo padrão em uma terceira variação. Para individualizar o produto, o caminho certo **não é manter as três verticais**, e sim consolidar em um único módulo de "Trilhas de Estudo Teológico" parametrizado por tenant e por tipo de trilha (EBD trimestral, curso livre, curso avançado etc.). Isso:

- Reduz o trabalho de implementar multi-tenant (uma vez em vez de três).
- Vira, inclusive, um bom argumento de pitch: "consolidamos a arquitetura para escalar com um único motor de conteúdo, em vez de manter três sistemas paralelos".

### 2.3 Controle de acesso por papel (RBAC) real

O parecer anterior apontou que nenhuma rota ou server action de admin verifica papel do usuário. Num produto multi-tenant vendido a vários campos/ministérios, isso é ainda mais crítico: cada campo precisa de seu próprio administrador, que **não pode** enxergar nem alterar dados de outro campo, e usuários comuns (alunos) não podem acessar telas administrativas. Papéis mínimos sugeridos: `super_admin` (equipe do produto), `admin_tenant` (gestor do campo/ministério), `tutor` (opcional), `aluno`.

### 2.4 Identidade visual por tenant (branding)

Para que cada campo/ministério sinta o portal como "seu", vale um mínimo de white-label: nome, logo e cor por tenant, guardados em uma tabela de configuração simples e aplicados via tema dinâmico. Não precisa ser sofisticado para o pitch — só precisa ser visível na demonstração (ex.: dois campos fictícios com temas diferentes).

### 2.5 Provisionamento de novo tenant

Um fluxo simples (mesmo que só via painel do super-admin) para cadastrar um novo campo/ministério e convidar seu administrador. É o que transforma o sistema de "uma instalação única" em "produto que se replica para novos clientes" — ponto central de qualquer pitch de SaaS/multi-tenant.

## 3. Estratégia de vínculo com o IgrejaWebOS

Como o Portal EAD nasce do mesmo código e (recomendado) do mesmo backend Supabase que o IgrejaWebOS, a forma mais rápida e sólida de "vincular depois" é:

- **Manter a mesma base de autenticação** (`auth.users`/`profiles`) — um usuário que já existe no IgrejaWebOS pode ganhar acesso ao Portal EAD apenas habilitando uma flag/vínculo, sem recadastro.
- **Não duplicar banco de dados por tenant.** Um banco único com `tenant_id` e RLS bem definida é mais rápido de construir em 12 dias, mais barato de operar, e é o padrão de mercado para MVPs multi-tenant (bases separadas por cliente só compensam em escala muito maior).
- Tratar o Portal EAD, tecnicamente, como **um módulo habilitável dentro da mesma plataforma** — o que também é uma resposta forte para o pitch: "não é um sistema novo do zero, é uma evolução natural do IgrejaWebOS já existente, com investimento já feito".

## 4. Viabilidade do prazo (12 dias, até 24/07)

Fazer tudo isso em nível de produção robusta em 12 dias não é realista com uma pessoa só. O que é realista — e é o que importa para um pitch de negócio — é um **MVP funcional e demonstrável**, com:

- Modelo de dados multi-tenant implementado e funcionando (não necessariamente polido em todos os detalhes).
- RLS corrigida e RBAC básico funcionando de verdade (isso é inegociável — não dá para fazer um pitch de multi-tenant mostrando, ou sabendo internamente, que um cliente pode ver dados de outro).
- Dois campos/ministérios fictícios de demonstração, com temas visuais diferentes, cada um com seu admin e seus alunos.
- Um fluxo completo e ensaiado: login → aluno assiste aula → progresso registrado → admin do campo publica conteúdo novo → esse conteúdo aparece só para o próprio campo.
- Um roadmap claro (slide) do que vem depois da aprovação — pagamento, certificado, relatórios, app mobile etc. — para não prometer mais do que o MVP entrega.

## 5. Recomendação final

Sim, pode partir deste ponto. O projeto atual já tem ~60–70% dos blocos de construção de um portal EAD (auth, vídeo, progresso, admin de conteúdo). Os 12 dias devem ser investidos, nesta ordem de prioridade, em: (1) modelo de tenant + RLS corrigida, (2) RBAC real, (3) consolidação dos três módulos de curso em um só, (4) branding por tenant, (5) dados de demonstração e ensaio do pitch. O cronograma detalhado está no arquivo `cronograma-portal-ead-teologia.csv`, entregue junto com este parecer.

**Observação sobre formato:** este parecer foi entregue em Markdown (não em .docx) porque o ambiente de geração de documentos Office ficou indisponível nesta sessão. O conteúdo abre e imprime normalmente; posso reconverter para Word assim que o ambiente voltar, se for necessário anexar formalmente ao pitch.
