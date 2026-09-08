# Parecer Técnico — Regionais, Sub-congregações, Células e Núcleos de Ensino

Data: 08/09/2026
Escopo: `portal-teologico-os` (staging), a partir da descrição de hierarquia enviada pelo Joaquim e da análise da pasta `MATERIALPORTAL`.

## 1. Sumário executivo

A boa notícia é que a base para o modelo descrito já existe no banco: a tabela `units` (Campo → Sede → Setor → Igreja → Sub-congregação/Ponto de Pregação → Célula) e a tabela `admin_roles` (nível 0–4 + unidade, com RLS recursiva por sub-árvore) foram construídas exatamente para suportar hierarquia territorial com gerenciamento individual por unidade — o que o texto do Joaquim chama de "núcleo de ensino com gerenciamento próprio" é, em termos de schema, um `admin_roles` de nível 3 ou 4 amarrado a uma `unit`. Isso já está pronto e já tem RLS real (não é só decoração de nome).

A notícia que precisa de decisão é: **hoje "Regional" recebe o mesmo `unit_type` de "Setor" no banco (o que é correto — a hierarquia e as regras são as mesmas), mas ficou pra trás em uma etapa: nunca ganhou linha na tabela-ponte que os formulários de matrícula e o RLS de escopo realmente consultam.** Os dados reais de produção (migrations 078–088) criaram 23 unidades chamadas "REGIONAL 001" a "REGIONAL 026" com `unit_type = 'SETOR'` — certo, do ponto de vista de hierarquia (mesma posição na árvore, mesmas regras de pai/filho, mesma elegibilidade a `admin_roles` nível 3) — misturadas com as 15 unidades "SETOR 001" a "SETOR 015" que são os setores locais de Piracicaba. O problema não é a modelagem em si, é que a tabela `sectors` (legada, é o que o formulário de matrícula e o dropdown de Setor/Igreja realmente leem) só tem as 15 linhas dos setores locais — as 26 Regionais nunca foram bridged pra lá. Resultado: as igrejas de Regional ficam de fora do fluxo de matrícula hoje, mesmo tendo, na árvore `units`, exatamente as mesmas regras que um Setor. Esse é o ajuste central que este parecer recomenda: dar à Regional o mesmo suporte operacional completo que o Setor já tem — não criar uma regra nova, replicar a que já existe.

A pasta `MATERIALPORTAL` não tem relação direta com a pergunta de hierarquia — é o acervo de capas e conteúdo dos cursos (Básico, Médio, Preparatórios, EBOM), material editorial que já mapeia para o módulo `courses`/`biblioteca` existente. Está reportado na seção 5, mas não impacta o modelo de dados discutido aqui.

## 2. O modelo descrito pelo Joaquim, resumido

- **Campo** (ex: Piracicaba) → **Sede** (igreja normal, mas principal do campo, com núcleo de ensino próprio).
- Dentro da Sede: **Setores** e **Regionais**, ambos como agrupamentos de nível equivalente — cada um com uma "igreja mãe" e um conjunto de igrejas.
- Dentro de Setor/Regional: **Igrejas**, e dentro de Igreja: **Sub-congregações** e **Células**.
- Cada núcleo de ensino (pode ser uma igreja de Setor, uma igreja de Regional, ou a própria Sede) tem gerenciamento individual — o professor responsável pelo núcleo é, no exemplo dado, a mesma pessoa que dá aula e administra a agenda daquele núcleo.
- Objetivo final: registrar sub-congregações e células num banco próprio, vinculadas à igreja, para conseguir relatórios de matrícula por Sede/Setor/Regional/Igreja/Sub-congregação/Célula, e para o portal público indicar ao visitante o núcleo mais próximo.

## 3. O que já existe hoje no banco (staging e produção)

### 3.1 Árvore `units` — já cobre a hierarquia inteira

A migration `054_units_hierarquia.sql` criou `public.units` como tabela recursiva (`parent_id`), com `unit_type` cobrindo `CAMPO`, `SEDE`, `SETOR`, `IGREJA`, `CELULA` — e a `057_expandir_unit_type.sql` já ampliou para `SUB_CONGREGACAO` e `PONTO_PREGACAO`, com um trigger (`validate_unit_hierarchy`) que trava a cadeia certa: Campo raiz → Sede (pai Campo) → Setor (pai Sede) → Igreja (pai Setor) → Sub-congregação/Ponto de Pregação (pai Igreja) → Célula (pai Igreja, Sub-congregação ou Ponto de Pregação). Ou seja: **a parte "quero cadastrar sub-congregações e células num banco vinculado à igreja" já está no schema**, faltando só a tela de administração (ver seção 4.3).

### 3.2 `admin_roles` — já é o mecanismo de "gerenciamento individual por núcleo"

A migration `059_admin_roles_e_escopo.sql` criou `admin_roles` (usuário + nível 0–4 + `unit_id`), com a função `get_accessible_unit_ids()` calculando recursivamente toda a sub-árvore que aquele nível/unidade alcança. Nível 3 = Admin de Setor, nível 4 = Usuário Local (Igreja/Sub-congregação/Ponto de Pregação/Célula). É isso que dá a um professor-responsável-de-núcleo o gerenciamento próprio do seu núcleo sem enxergar os outros — exatamente o "cada núcleo tem seu próprio gerenciamento individual" descrito pelo Joaquim. A `061_rls_escopo_churches_sectors_members_transactions.sql` já aplicou esse escopo real (não apenas nominal) em `churches`, `sectors`, `members` e `transactions`.

Vale registrar: existe uma análise anterior neste mesmo repositório (`docs/analise-hierarquia-campo-sede-setor.md`, 25/07/2026) que concluía que esse escopo real **não existia** e seria "uma mudança estrutural grande". Essa conclusão está desatualizada — o trabalho das migrations 054 a 069 (posteriores à análise) resolveu exatamente esse gap. Este parecer substitui aquela conclusão.

### 3.3 Professores e turmas já têm amarração territorial

- `professores.unit_id` (migration `069_professores_unit_id.sql`) liga o professor a qualquer nível da árvore (Setor, Regional, Igreja, Sub-congregação...).
- `course_editions.unit_id` e `ead_alunos.unit_id` (migration `062_ead_escopo_territorial.sql`) já preparam a turma e o aluno para serem restritos/classificados por unidade, com a função `unit_is_within()` para checar pertencimento recursivo.
- Essa mesma migration já deixa registrado, no próprio comentário, que é "só a fundação de schema" — as Server Actions de matrícula ainda não usam esses campos para filtrar ou restringir nada. Ou seja, o alicerce para os relatórios "onde estão meus alunos" já existe, mas a aplicação ainda não lê esses dados.

## 4. Gaps identificados (o que falta ajustar)

### 4.1 Regional tem as mesmas regras de Setor na árvore, mas não tem o mesmo suporte operacional

Correção sobre a primeira versão deste parecer: o Joaquim apontou corretamente que Regional **precisa** ter as mesmas regras de Setor, porque a função é idêntica (mesma posição na hierarquia, mesma lógica de igreja-mãe, mesmo tipo de gerenciamento). E, na árvore `units`, isso já é verdade — Regional usa `unit_type = 'SETOR'`, então já herda literalmente as mesmas regras de hierarquia e already é elegível a `admin_roles` nível 3 do mesmo jeito que um Setor local. O gap real não é de regra, é de **cobertura**: os dados reais (migrations 078–088) criaram as 26 Regionais como `unit_type = 'SETOR'` com nome `"REGIONAL 0XX"`, mas a tabela-ponte que aplica essas regras nas telas nunca foi estendida pra elas. Consequência prática, confirmada no código:

- A tabela-ponte `sectors` (que os formulários de matrícula realmente consultam — `admin/matriculas/nova/page.tsx`, `[id]/page.tsx`, `ficha-rapida/page.tsx`) só tem as 15 linhas dos Setores locais de Piracicaba. As 26 Regionais nunca ganharam linha em `sectors`.
- `churches.sector_id` fica `NULL` para toda igreja de Regional (a migration que as insere nem preenche essa coluna).
- No formulário de Nova Matrícula, o dropdown de Igreja filtra por `sector_id` quando um Setor é escolhido (`churches.filter(c => c.sector_id === sectorId)`) — como as igrejas de Regional não têm `sector_id`, elas nunca aparecem quando a secretaria escolhe um Setor, e não existe opção "Regional" para escolher em primeiro lugar. Elas só aparecem soltas se nenhum Setor for selecionado, misturadas com todas as outras.
- Busquei `"REGIONAL"` em todo o código-fonte da aplicação (`src/`) e não há nenhuma ocorrência — a distinção Setor/Regional existe apenas como texto dentro do `name` de uma migration SQL, nunca chegou à camada de aplicação.

Isso confirma tecnicamente o que o Joaquim já percebe na prática: hoje não dá para gerenciar matrícula por Regional, porque o sistema não sabe que Regional existe.

### 4.2 `regioes` é outro conceito, com o mesmo nome — risco de confusão

Existe uma tabela `regioes` (migration `042`/`043`), mas ela é um rótulo geográfico plano ligado 1:1 a cada um dos 15 Setores locais (ex: "CENTRO/NORTE", "SUL"), usada só para agrupar relatórios — não tem igrejas, não tem igreja-mãe, não é hierárquica. É um conceito diferente do "Regional" que o Joaquim descreve (que é um nível da árvore, paralelo a Setor, com 8 a 10 igrejas e sub-congregações cada). Recomendo renomear essa tabela existente (ex: `zonas_geograficas`) antes de introduzir o novo `REGIONAL` como tipo de unidade, para não haver dois conceitos com nomes parecidos no mesmo sistema.

### 4.3 [RESOLVIDO nesta sessão] Sub-congregação/Ponto de Pregação/Célula

Correção sobre a primeira versão deste parecer: ao abrir o código antes de construir algo do zero, achei que a tela de Sub-congregação e Célula **já existia** (`/dashboard/configuracoes/sub-congregacoes`, `/dashboard/configuracoes/celulas`, reaproveitando `NovaIgrejaForm.tsx` com `lockedType`) — e o seletor de "Igreja Mãe" nelas nunca foi filtrado por Setor, então uma igreja de Regional já podia ser escolhida como igreja-mãe antes de qualquer mudança minha. Faltava só Ponto de Pregação (o `unit_type` já existia no banco desde a `057`, só sem tela) — implementado agora: `/dashboard/configuracoes/pontos-pregacao` (listagem + cadastro) e o card correspondente no painel de Ministério/Setores/Igrejas.

### 4.4 [JÁ ESTAVA CORRIGIDO] `unit_id` ao criar Igreja/Setor

O comentário da migration `061` (mais antigo) apontava esse gap, mas o código atual de `criarCampoAction`, `addSetorAction` e do `handleSubmit` de `NovaIgrejaForm.tsx` já preenche `unit_id` corretamente ao criar Campo/Sede/Setor/Igreja/Sub-congregação/Célula (marcado no próprio código como "M10a"/"M11") — foi corrigido em algum momento depois daquela migration, antes desta sessão. Não precisou de nenhuma mudança.

### 4.5 Relatórios por território ainda não existem na aplicação

O schema tem os campos (`ead_alunos.unit_id`, `course_editions.unit_id`, `unit_is_within()`), mas nenhuma tela hoje mostra "quantos alunos por Setor/Regional/Igreja" nem alimenta o formulário de matrícula com `unit_id` do aluno automaticamente a partir do Setor/Igreja escolhidos. É trabalho de aplicação (Server Actions + telas), não de banco.

## 5. Análise da pasta MATERIALPORTAL

A pasta contém exclusivamente PDFs de conteúdo editorial: capas de livro (pasta "CAPAS GRÁFICA", Básico e Médio), o conteúdo das disciplinas do Curso Básico e Médio (Cristologia, Bibliologia, Doutrina de Deus, Escatologia, Hermenêutica, Eclesiologia etc.), os Cursos Preparatórios (Presbítero, Diaconato, Batismo, Superintendente EBD, CPD) e um material da EBOM. Não há planilha, documento estrutural ou lista de igrejas/regionais nessa pasta — é material de biblioteca/produção gráfica, não de modelagem de dados.

Isso mapeia para o módulo `courses` já existente (`module = 'escola'` para os básicos/médios, com trilhas cadastráveis em `/admin/conteudo/trilhas`) e para os Cursos Preparatórios, que já têm precedente no sistema (`018_cursos_preparatorios_avulsos.sql`). Não vejo necessidade de mudança de modelo de dados por causa dessa pasta — é conteúdo a ser cadastrado/anexado nas trilhas já existentes, não uma nova entidade. Se o Joaquim quiser, posso levantar à parte quais desses PDFs já estão cadastrados como aula/trilha e quais faltam subir — mas isso é tarefa separada da hierarquia territorial.

## 6. Modelo de dados proposto

Ajuste incremental, não um redesenho — a estrutura de base (`units`, `admin_roles`) fica como está. E, seguindo a correção do Joaquim: **Regional continua com `unit_type = 'SETOR'`** (não vira um tipo novo no enum) — é assim que ela já herda, automaticamente e sem duplicar lógica, exatamente as mesmas regras de hierarquia, RLS e `admin_roles` que um Setor tem. Criar um `unit_type = 'REGIONAL'` separado, como eu tinha proposto na primeira versão deste parecer, é o caminho errado: abriria espaço para as regras divergirem ao longo do tempo (alguém corrige uma policy de RLS pensando só em `SETOR` e esquece `REGIONAL`), que é exatamente o risco que o Joaquim sinalizou. O ajuste é só de **cobertura operacional**, não de tipo:

1. **Estender a tabela `sectors`** para incluir também as 23 Regionais (hoje só tem as 15 locais), com uma coluna nova só de rótulo (ex: `categoria` = `'SETOR'` ou `'REGIONAL'`, puramente para exibição no dropdown/relatório) — sem separar tabela nem regra. `unit_id` de cada linha aponta pra unit correspondente (que já é `type = 'SETOR'` para ambos os casos).
2. **Preencher `churches.sector_id`** para as igrejas de Regional, referenciando a linha correspondente em `sectors` — resolve o filtro quebrado do dropdown de Igreja sem mexer no componente de formulário, porque a lógica de filtro (`churches.filter(c => c.sector_id === sectorId)`) passa a funcionar igual para Setor e Regional, sem precisar de nenhum código novo.
3. **Renomear a tabela `regioes` existente** (zona geográfica cross-setor, ver 4.2) para algo como `zonas_geograficas`, e ajustar a UI que a usa (`SetoresManager.tsx`) — separa claramente do conceito de Regional, evitando os dois nomes parecidos.
4. **Construir as telas de Sub-congregação/Ponto de Pregação/Célula**, reaproveitando o padrão de `CampoForm.tsx`/`NovaIgrejaForm.tsx`: formulário com nome, responsável (busca por matrícula, como já existe em `MatriculaLookup.tsx`), endereço, e vínculo obrigatório com a Igreja mãe (`parent_id`) — funciona igual esteja a igreja debaixo de um Setor local ou de uma Regional, porque a árvore `units` já trata as duas do mesmo jeito.
5. **Corrigir as Server Actions de criar Igreja/Setor/Regional** para preencherem `unit_id` na criação (gap 4.4) — pré-requisito antes de abrir cadastro de sub-congregação/célula para os próprios responsáveis de núcleo, senão eles cadastram e não enxergam o que cadastraram.

## 7. Núcleo de ensino — como fica o gerenciamento individual

Com o ajuste acima, o fluxo fica:

- O Joaquim (ou GLOBAL_ADMIN) cria a unidade `IGREJA`/`SUB_CONGREGACAO` que será o núcleo de ensino, e cria (ou reaproveita) o registro de `professores` vinculado a essa `unit_id`.
- Cria um `admin_roles` nível 4 para esse professor, apontando para a mesma `unit_id` — a partir daí, `get_accessible_unit_ids()` garante que ele só vê/edita matrículas, turmas e dados daquele núcleo (e da sub-árvore dele, se tiver sub-congregação/célula abaixo).
- Turmas (`course_editions`) desse núcleo recebem `unit_id` preenchido, restringindo a matrícula à sub-árvore daquele núcleo (função `unit_is_within()`, já pronta).
- Isso já cobre literalmente o exemplo dado: "o professor é o mesmo responsável por gerenciar seu núcleo" — é um único `admin_roles` de nível 4 com o mesmo `unit_id` do `professores.unit_id`.

Não é preciso criar uma entidade nova "núcleo de ensino" no banco — ela já é, na prática, uma `unit` (Igreja, Sub-congregação ou até a Sede) com um professor+admin_role vinculados a ela. Introduzir uma tabela `nucleos_ensino` separada duplicaria o que `units` já resolve, e é o tipo de decisão que vale confirmar com o Joaquim antes de construir (ver seção 9).

## 8. Relatórios e portal público (o objetivo final do Joaquim)

Com `ead_alunos.unit_id` e `course_editions.unit_id` de fato preenchidos (hoje só existem como coluna, não são usados), fica possível:

- Contagem de matrículas por Sede/Setor/Regional/Igreja/Sub-congregação/Célula via `unit_is_within()` recursiva ou um `WITH RECURSIVE` simples subindo a árvore a partir de `ead_alunos.unit_id`.
- "Núcleo mais próximo" no portal público: precisa de latitude/longitude (ou pelo menos cidade/UF, que `churches` já tem) por unidade, e uma consulta simples de distância/agrupamento por cidade — não depende de nenhuma mudança estrutural além do que já foi proposto na seção 6.

Este é trabalho de aplicação (relatório admin + endpoint público), não de banco — mas só é viável depois que o gap da seção 4.5 for fechado (a matrícula passar a gravar `unit_id` de verdade).

## 9. Plano de implantação (staging-first, faseado)

Seguindo a regra do projeto (staging → validação → PR → produção):

**Fase 1 — Schema (staging):** ampliar `sectors` com a coluna de rótulo (`categoria`) e inserir as 23 Regionais (mesmo `unit_type = 'SETOR'` na árvore, só a linha-ponte que faltava), preenchimento de `churches.sector_id` para as igrejas de Regional, rename de `regioes` → `zonas_geograficas`. Não envolve `ALTER TYPE` nem mexe no enum — é só dado (INSERT/UPDATE), risco bem menor que a primeira versão deste plano.

**Fase 2 — Correção de Server Actions existentes:** preencher `unit_id` ao criar Igreja/Setor/Regional (gap 4.4) — pré-requisito de tudo que vem depois.

**Fase 3 — Telas novas:** cadastro de Sub-congregação/Ponto de Pregação/Célula, e ajuste do dropdown de matrícula para incluir Regional como opção de primeiro nível (paralelo a Setor).

**Fase 4 — Núcleo de ensino:** wiring de `professores.unit_id` + `admin_roles` nível 4 no fluxo de cadastro de professor (já existe a tela, só falta a amarração).

**Fase 5 — Relatórios e portal público:** telas de contagem por território e endpoint de "núcleo mais próximo".

Cada fase testável isoladamente em staging antes de avançar — nenhuma depende de mexer em dado de produção antes de validada.

## 10. Riscos

- **Inserir 23 registros novos em `sectors` (Regionais) em produção**, com o `unit_id` certo para cada um dos 400+ vínculos de igreja — precisa rodar com backup prévio (já existe rotina, ver `PARECER_TECNICO_RISCO_PERDA_DADOS.md` e o script de backup) e validação de contagem antes/depois (23 Regionais + 15 Setores = 38 linhas em `sectors`, batendo com as 38 units `SETOR` que já existem).
- **Abrir cadastro de sub-congregação/célula para responsáveis de núcleo antes de corrigir o gap de `unit_id`** (seção 4.4) cria registros invisíveis para o próprio criador — ordem das fases importa.

## 11. O que foi executado nesta sessão (staging)

Por pedido explícito do Joaquim ("executar as alterações de ponta a ponta, sem perguntas") — tudo em staging (`cjxdroyyplpknygtcdgr`), nada em produção:

- **Fase 1 (banco):** migration `094_regionais_bridge_sectors.sql` aplicada — `sectors` ganhou a coluna `categoria` (`SETOR`/`REGIONAL`), as 23 Regionais entraram como linha-ponte (mesma tabela, mesma regra que Setor sempre teve), e as 314 igrejas de Regional que estavam com `sector_id` nulo foram vinculadas. Conferido: 15 Setor + 23 Regional = 38 linhas em `sectors`, 0 igrejas sem `sector_id`.
- **Fase 2 (unit_id automático):** já estava corrigido no código antes desta sessão — nenhuma mudança necessária (seção 4.4).
- **Fase 3 (telas):** Sub-congregação e Célula já existiam e já aceitavam igreja de Regional como igreja-mãe. Construído agora: tela de Ponto de Pregação (listagem `/dashboard/configuracoes/pontos-pregacao`, cadastro, e suporte em `NovaIgrejaForm.tsx`), fechando os três tipos que `units` já suportava no schema.
- **Rename `regioes` → `zonas_geograficas`:** adiado — quebraria rotas/imports existentes sem ganho funcional (é só risco de confusão de nome, não um bug). Documentado como pendência de baixa prioridade.

## 12. Pendências que ficam para uma próxima rodada

1. ~~**Fase 4 — núcleo de ensino:** wiring de `professores.unit_id` + `admin_roles` nível 4 no fluxo de cadastro de professor.~~ **[RESOLVIDO nesta sessão]** — ver seção 13.
2. ~~**Fase 5 — relatórios:** contagem de matrículas por Sede/Setor/Regional/Igreja.~~ **[RESOLVIDO nesta sessão]** — ver seção 13. "Núcleo mais próximo" no site público segue como pendência real (não foi pedido nesta rodada; precisa de UI pública nova, não só dado).
3. Validar com `npx tsc --noEmit` e `npm run build` antes de abrir PR (comandos na resposta de chat, não aqui).

## 13. O que foi executado na 2ª rodada (staging)

Por pedido explícito do Joaquim ("nível 4 pro núcleo de ensino ter gerenciamento individual, e a matrícula gravar unit_id de verdade... direto ao ponto, sem intervenção, de ponta a ponta"):

- **Fase 4 (professores/admin_roles nível 4):** investigação encontrou que `professores` já grava `unit_id` corretamente (não era o gap real). O gap era `admin_roles` nunca ser criado a partir do cadastro de professor. Adicionado campo opcional "E-mail de acesso" em `ProfessorForm.tsx` — quando preenchido, `addProfessorAction`/`updateProfessorAction` (via nova função `grantNucleoAccess`, mesmo padrão de `inviteStaffAction`/M9) convidam ou promovem a conta e gravam `admin_roles` com `level: 4`, `unit_id` = unidade escolhida no formulário, `role_title: "Responsável de núcleo de ensino"`. Upsert por `(user_id, unit_id)` — reenviar o cadastro com o mesmo e-mail não duplica.
- **Fase 5 (relatórios):** investigação encontrou que `ead_alunos.unit_id` **já era gravado corretamente** em ambos os fluxos de matrícula com igreja (`matricularDiretoAction` e ficha-rápida) desde antes desta sessão — o gap real não era gravação de dado, era a ausência de uma tela pra consumir esse dado. Criada `/admin/matriculas/relatorio-territorio`: soma matrículas subindo a árvore `units` (Campo → Sede → Setor/Regional → Igreja → Sub-unidade), com rótulo Setor/Regional vindo de `sectors.categoria`. Link adicionado na listagem de Matrículas.
- Matrículas de inscrição pública sem igreja informada (aluno "de fora") continuam de propósito fora da árvore de unidades — não entram nesse relatório, exatamente como o desenho original de `062_ead_alunos_unit_id.sql` já previa.
