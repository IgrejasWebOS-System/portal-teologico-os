# Parecer Técnico — Nível Ministério, Formulário de Campo e Revisão Geral

Data: 08/09/2026
Escopo: `portal-teologico-os` (staging). Este documento responde ao pedido de parecer antes de qualquer modificação, ao pedido de revisão geral do que já foi construído, e às dúvidas levantadas no arquivo `Modificaçõesv2`.

## 1. Sumário executivo

Nenhuma modificação estrutural foi feita ainda — só um bug trivial e sem ambiguidade (botão "Voltar" da tela de Campos, ver seção 4). O resto — nível Ministério, redesenho do formulário de Campo — depende de decisões suas, explicadas abaixo com uma recomendação clara em cada uma.

O ponto mais importante deste parecer: **hoje não existe "Ministério" como entidade no banco.** `Campo` é a raiz da árvore (`units.type = 'CAMPO'`, sem `parent_id`). Existe uma tabela chamada `ead_campos_ministerios`, mas ela não tem nada a ver com o que você está pedindo — é uma lista solta de "áreas de interesse" (ex: "Ministério de Jovens", "Ministério de Missões") usada só como rótulo no formulário público de inscrição em cursos. É a mesma armadilha de nome que encontramos antes com `regioes` (que também não é a mesma coisa que "Regional"). Vou tratar isso como um ponto de atenção, não como algo pra mexer agora.

## 2. Como gerenciar mais de um Ministério hoje (resposta direta)

Hoje, sem a entidade Ministério, o que existe é gerenciamento por Campo: a tabela `admin_roles` guarda linhas de `(usuário, nível, unit_id)`, e nada impede um mesmo usuário ter várias linhas — uma para cada Campo que ele administra. Ou seja, **o procedimento de hoje pra alguém administrar mais de um "ministério" é dar a ele nível 1 (Master de Campo) em cada Campo separadamente**, em `/dashboard/configuracoes/acessos/usuarios`. Funciona, mas tem duas limitações que parecem ser exatamente o que você sentiu falta:

- Não existe um agrupamento visual/relatório que junte "Campo Piracicaba" e "Campo São Paulo" como pertencentes ao mesmo "Ministério Madureira" — cada Campo aparece solto na listagem.
- Não existe um nível de acesso "administra todos os Campos de um Ministério de uma vez" — hoje só dá pra conceder Campo por Campo.

A seção 5 propõe como resolver isso.

## 3. Documento de revisão geral — o que já está construído hoje

Pra te reorientar, aqui está o mapa completo de como a estrutura territorial e de acesso está montada hoje em staging (produção está no mesmo estado, já que o PR mais recente foi mergeado):

**Árvore territorial (`units`, recursiva por `parent_id`):**
`Campo` (raiz) → `Sede` (1 por campo, é uma igreja) → `Setor` (inclui as "Regionais" — mesmo `unit_type`, diferenciadas só por um rótulo `sectors.categoria = 'SETOR' | 'REGIONAL'`) → `Igreja` → `Sub-congregação` / `Ponto de Pregação` / `Célula` (essas três penduradas na Igreja; Célula também pode pendurar em Sub-congregação/Ponto).

**Acesso (`admin_roles`):** nível 0 (Super-Master, sem unidade) → 1 (Master de Campo) → 2 (Admin de Sede) → 3 (Admin de Setor) → 4 (Usuário Local — igreja/sub-unidade). Cada linha é `(usuário, nível, unit_id)`, e a função `get_accessible_unit_ids()` calcula toda a sub-árvore que aquele nível/unidade alcança. Isso já tem RLS real aplicado em `churches`, `sectors`, `members`, `transactions`.

**Cadastro de professor / núcleo de ensino:** desde a última rodada, o formulário de Professor tem um campo opcional de e-mail — se preenchido, convida ou promove a conta e grava `admin_roles` nível 4 na unidade escolhida, dando ao professor gerenciamento individual do próprio núcleo.

**Matrícula por território:** `ead_alunos.unit_id` é gravado corretamente sempre que a matrícula tem igreja associada (matrícula direta e ficha rápida). `/admin/matriculas/relatorio-territorio` soma essas matrículas subindo a árvore.

**Coisas com nome parecido mas que NÃO são a mesma coisa** (documentando pra você não se confundir de novo, como quase aconteceu agora):
- `regioes` / `sectors.regiao_id`: agrupamento geográfico plano (Centro/Norte/Sul...) só dos 15 Setores locais de Piracicaba — não é hierárquico, não é "Regional".
- `ead_campos_ministerios`: lista de interesse do aluno no formulário público de inscrição — não é "Ministério" administrativo.

## 4. Bug corrigido: botão "Voltar" em Campos

Confirmado e corrigido: a tela `/dashboard/configuracoes/acessos/campos` tinha `backHref` apontando pra `/dashboard/configuracoes/acessos` (a tela de Administração Global e Acessos), mas o card que leva até ela hoje está em `/dashboard/configuracoes/ministerio-setores-igrejas`. Corrigido para apontar pra lá. Sem ambiguidade, sem impacto em dado — já ajustado, falta só validar e subir junto com o resto.

## 5. Proposta: nível Ministério acima de Campo

Duas formas de fazer isso, com implicações bem diferentes:

**Opção A — Ministério dentro da árvore `units`** (novo `unit_type = 'MINISTERIO'`, raiz da árvore, Campo passa a ter `parent_id`). Isso dá a Ministério o mesmo poder que Setor/Regional tem hoje: pode virar escopo de segurança real (`admin_roles` nível "Master de Ministério" enxergando só os Campos dele). Mas é uma mudança de fundação: o trigger `validate_unit_hierarchy`, a função `get_accessible_unit_ids`, e todo lugar do código que hoje assume "Campo é a raiz" (o cadastro de Campo, os formulários em cascata de Matrícula e Professor, os relatórios) precisam ser revisados. É a opção certa **se** o que você quer é controle de acesso real por Ministério (alguém de fora não enxerga Campos de outro Ministério).

**Opção B — Ministério como rótulo de agrupamento, fora da árvore de segurança** (tabela nova `ministerios`, e uma coluna `ministerio_id` no Campo). Não mexe no trigger, no RLS, nem em nenhuma tela que já funciona — é aditivo puro, no mesmo padrão que já usamos pra `sectors.regiao_id`: agrupa e filtra pra relatório/organização, mas não vira escopo de permissão. Resolve exatamente o que você descreveu no exemplo (Ministério Madureira com Campo Piracicaba e Campo São Paulo, Ministério Belém com Campo Bauru e Minas Gerais) sem risco pro que já está funcionando.

**Minha recomendação é a Opção B**, pelo mesmo motivo que usamos o padrão de rótulo pra Regional dentro de Setor: menor risco, aditivo, e resolve o problema real que você descreveu (organizar e enxergar Campos agrupados por Ministério). A Opção A só vale a pena se você realmente precisa que um Master de Ministério não veja os Campos de outro Ministério — e essa é uma decisão sua, não técnica.

## 6. Redesenho do formulário de Campo

O que você pediu: na tela de editar Campo, dividir "Identificação" em duas colunas — à esquerda o Nome do Campo (como já está), à direita "Igreja Sede do Campo" (renomeando de "Nome da Sede"), buscando a igreja do banco de dados de igrejas em vez de aceitar texto livre.

Isso é uma mudança de comportamento, não só de layout: hoje, ao criar um Campo, o formulário sempre cria uma igreja nova do zero com o nome digitado (`criarCampoAction` insere direto em `churches`). Pra virar uma busca na base existente, preciso decidir com você: uma igreja já cadastrada (com todos os membros, dados etc.) pode virar Sede de um Campo, e nesse caso ela some da listagem comum de Igrejas ou continua aparecendo nas duas telas? E pode uma mesma igreja ser Sede de mais de um Campo (você mencionou isso), ou é sempre uma Sede por igreja? Preciso dessa resposta antes de tocar no formulário, porque muda a modelagem (hoje `sede.legacy_church_id` é 1:1).

## 7. Risco na migração do número de matrícula legado

Fui conferir e sua preocupação é procedente: a tabela `members` (membros de igreja) tem dois campos candidatos a "número de matrícula" — `matricula` (texto livre, sem nenhuma trava de duplicidade) e `registration_number` (que tem uma trava `UNIQUE` **global**, banco inteiro). Se o sistema antigo gera matrícula por igreja (ex: cada igreja começa do 1), importar direto pro `registration_number` vai falhar na segunda igreja que repetir um número que a primeira já usou. Recomendo, quando formos migrar de fato, gravar o número legado num campo separado com unicidade **por igreja** (`church_id` + número), não reaproveitar `registration_number` como está. Fica registrado aqui pra não esquecer na hora da migração — não fiz nenhuma mudança de schema agora, é só o diagnóstico que você pediu.

## 8. Plano de validação faseada

Como você pediu — uma validação de cada vez, sem empacotar tudo junto. Decisão registrada: Opção B confirmada (Ministério é rótulo de agrupamento, não escopo de permissão); prioridade é o `portal-teologico-os` funcionando até 18/09/2026; investigação do `igrejas-web-system-os` (multi-tenant real, pra comercializar) fica pra depois dessa data.

1. **Cadastro de Ministérios (Opção B) — [FEITO, validado por você].**
2. **Vínculo Campo → Ministério — [FEITO nesta rodada, aguardando sua validação]:** migration `096_campo_ministerio_id.sql` (coluna `units.ministerio_id`, nula por padrão — Campos existentes ficam sem Ministério até você atribuir). Formulário de Campo (criar e editar) ganhou o select "Ministério" ao lado do Nome do Campo; a listagem de Campos mostra o Ministério em uma etiqueta ao lado do nome. **Valide isto antes de eu seguir pra Fase 3.**
3. **Redesenho do formulário de Campo — [FEITO nesta rodada]:** confirmado que a Sede sempre já existe como igreja (não tem promoção de Igreja de Setor pra Sede). O campo "Igreja Sede do Campo" agora tem duas abas: "Igreja já cadastrada" (busca em `churches` com `unit_id` livre, só liga o vínculo, nunca sobrescreve endereço/contato/pastor dela) e "Cadastrar nova" (fluxo antigo, texto livre). Ao trocar de igreja, a antiga é desvinculada e a nova entra no lugar. Seções de Endereço/Contato somem quando é igreja já cadastrada, porque esses dados já existem lá.
4. **Botão "Voltar" corrigido**: já feito (seção 4), validado.

## 8.1 Achado novo: a Sede como igreja de verdade (gerenciamento próprio)

Você levantou um ponto que não estava coberto: a Sede não é só um endereço/contato — ela é uma igreja completa (departamentos, atividades, mais de uma turma de teologia, professores próprios). Fui conferir o formulário de Professor e confirmei um buraco real: a cascata Campo→Setor→Igreja nunca deixava escolher a própria Sede como unidade final, porque na árvore ela fica *acima* do Setor, não *dentro* dele — então um professor que dá aula na Sede (não numa Igreja de um Setor) não tinha como ser cadastrado corretamente. **Corrigido nesta rodada:** o formulário de Professor agora mostra uma opção "Atua na própria Igreja Sede do Campo" que usa a Sede direto como unidade, sem precisar escolher Setor/Igreja. O backend já aceitava isso sem mudança (a igreja da Sede já é ligada por `unit_id` desde a criação do Campo).

Na Matrícula direta, a igreja da Sede já aparece na lista normalmente (ela é uma linha comum em `churches`) — só não aparece se você primeiro filtrar por Setor, porque ela não pertence a nenhum. Pra matricular alguém na Sede, é só não usar o filtro de Setor.

Fica registrado como pendência maior (não resolvida agora, fora do prazo de 18/09): turmas de curso (`course_editions`) ainda não têm nenhuma amarração de território na tela de cadastro — hoje não dá pra dizer "esta turma é da Sede" vs "esta turma é de tal Igreja". Isso limita relatórios por território quando o aluno é de uma turma, não de uma matrícula direta.

## 8.2 Tela de Setores/Regionais ganhou o roster de igrejas

Pedido: o card vira "Setores/Regionais" e a página `/dashboard/configuracoes/setores` passa a mostrar, por Setor/Regional, a mesma informação que você já tinha em outro relatório (Igreja, Dirigente, Celular, Membros, Endereço), puxada do cadastro de igreja e de membro — não digitada à mão.

Feito: cada linha de Setor/Regional agora tem uma seta pra expandir e mostrar esse roster (dados reais de `churches`/`members`, contagem de membros por igreja). Adicionei também uma estrela clicável pra marcar a igreja "Líder Setorial"/"Líder Regional" direto dali — descobri que já existia uma tela e uma ação prontas pra isso (`/dashboard/configuracoes/acessos/lideres-setor`, campo `sectors.mother_church_id`), então a estrela só chama essa mesma ação — não criei um segundo mecanismo concorrente (a primeira versão que eu tinha escrito usava uma coluna `churches.is_sector_head` sem uso nenhum no resto do sistema; troquei pra reaproveitar o que já existia).

Você também apontou a duplicidade entre a "região" desta tela (nosso agrupamento interno, `regioes`/`sectors.regiao_id`) e a região que aparece no cadastro de igreja (calculada a partir do CEP/UF, `regiaoPorUf`). São coisas diferentes hoje e nenhuma foi alterada nesta rodada — fica registrado como a mesma duplicidade de nome já apontada na seção 3, sem ação por enquanto.

## 9. Decisões que preciso de você pra seguir

- Uma igreja pode ser Sede de mais de um Campo, ou é sempre 1 Sede por igreja? (única pendência real antes da Fase 3)
- Depois de validar a Fase 1, sigo pra Fase 2 (vínculo Campo → Ministério)?
