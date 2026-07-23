# Detalhamento Técnico-Analítico — Módulo Configurações

**Portal EAD de Teologia — CETADP**
Atualizado em 22/07/2026 · base de referência: projeto Supabase `toduvwtzklntyptcodkf`

Este documento detalha, card a card, a tela `/dashboard/configuracoes` (14 cards). Cada seção traz a rota, a(s) tabela(s) reais por trás do card, os campos-chave, os relacionamentos com outras tabelas, o volume de dados hoje na base de produção e observações/riscos identificados na leitura do código. O mapa visual (diagrama) já foi apresentado na conversa, com a mesma contagem de registros usada aqui.

---

## 1. Hierarquia Territorial e Eclesiástica

Os cards **Setores, Igrejas, Sub-congregações, Células e Região** formam uma única hierarquia. Um detalhe estrutural importante: **Igreja, Sub-congregação e Célula são o mesmo registro de banco** — a tabela `churches` — diferenciados apenas pelo campo `church_type` (`CHURCH` / `SUB` / `CELL`). Não são três tabelas distintas.

### 1.1 Setores

- **Rota:** `/dashboard/configuracoes/setores`
- **Tabela:** `sectors` (15 registros)
- **Campos-chave:** `id`, `name`, `regiao_id` (FK → `regioes`), `mother_church_id` (FK → `churches`, define o líder do setor), `headquarters_id`, `status`, e a coluna legada `region` (texto livre)
- **Relacionamento:** cada Setor pertence a exatamente 1 Região (`regiao_id`); pode ter uma Igreja-mãe/líder (`mother_church_id`)
- **CRUD:** completo, via componente `SetoresManager.tsx`
- **Estado atual:** 15 setores cadastrados, todos já vinculados a uma das 7 regiões (0 setores sem região)
- **Observação:** a coluna `sectors.region` (texto) ainda existe no banco mas nenhuma tela lê mais dela — o vínculo real usado hoje é `regiao_id`. É um campo legado, candidato a limpeza em uma migração futura.

### 1.2 Igrejas

- **Rota:** `/dashboard/configuracoes/igrejas`
- **Tabela:** `churches`, filtro `church_type = 'CHURCH'` (ou nulo)
- **Campos-chave:** `sector_id` (FK), `parent_id` (auto-relacionamento, usado por Sub-congregações/Células), `is_sede`, `is_headquarters`, `pastor_name`, `pastor_phone`, `pastor_role`
- **Relacionamento:** cada Igreja pertence a 1 Setor; pode ser "mãe" de Sub-congregações e Células via `parent_id`
- **CRUD:** leitura na listagem + formulário dedicado em `/igrejas/nova`
- **Estado atual:** 2 igrejas cadastradas

### 1.3 Sub-congregações

- **Rota:** `/dashboard/configuracoes/sub-congregacoes`
- **Tabela:** `churches`, filtro `church_type = 'SUB'`
- **Campos exibidos:** nome, responsável (`pastor_name/role/phone`), Setor (`sectors.name`), Igreja-mãe (`parent_id`)
- **CRUD:** leitura + formulário em `/sub-congregacoes/nova`
- **Estado atual:** 0 registros

### 1.4 Células

- **Rota:** `/dashboard/configuracoes/celulas`
- **Tabela:** `churches`, filtro `church_type = 'CELL'` — estrutura idêntica à de Sub-congregações
- **Estado atual:** 0 registros

### 1.5 Região

- **Rota:** `/dashboard/configuracoes/regioes`
- **Tabela:** `regioes` (7 registros), com vínculo em `sectors.regiao_id`
- **CRUD:** completo — cadastrar/excluir região, e vincular/desvincular um Setor a uma Região diretamente na tela
- **Estado atual:** 7 regiões; os 15 setores já estão distribuídos entre elas

---

## 2. Pessoas e Papéis

### 2.1 Cargos

- **Rota:** `/dashboard/configuracoes/cargos`
- **Tabela:** `ecclesiastical_roles` (13 registros) — possui colunas `suggested_fee` e `hierarchy_level` que existem no banco mas não aparecem na tela
- **CRUD:** genérico (cadastrar/remover por nome)
- **Observação:** não foi encontrada nenhuma FK de outra tabela apontando para `ecclesiastical_roles`. O campo `professores.cargo`, por exemplo, é texto livre — não referencia este cadastro. Ou seja, a lista de Cargos existe mas hoje não é obrigatoriamente usada em nenhum formulário do sistema.

### 2.2 Departamentos

- **Rota:** `/dashboard/configuracoes/departamentos`
- **Tabela:** `departments` (13 registros)
- **CRUD:** genérico, mesmo padrão de Cargos
- **Observação:** mesma lacuna — nenhuma FK de consumo confirmada em outra tabela lida no código.

### 2.3 Professores

- **Rota:** `/dashboard/configuracoes/professores` (+ `/novo`)
- **Tabela:** `professores`
- **Campos-chave:** `sector_id` (FK), `church_id` (FK), `member_id` (FK opcional para o cadastro de membro/pessoa), `matricula`, `cargo` (texto livre), `telefone`
- **Relacionamento:** vinculado a 1 Setor e 1 Igreja
- **Estado atual:** 0 registros
- **Observação:** assim como em Cargos, o campo `cargo` aqui é texto livre — não é FK para `ecclesiastical_roles`.

---

## 3. Cadastros de Apoio (usados em Membros e Matrícula)

Os quatro cards abaixo seguem o mesmo padrão genérico de CRUD (`SimpleSettingsCRUD`: cadastrar por nome, remover por id) e **são efetivamente consumidos** — confirmado no código — pelos formulários `NovoMembroForm.tsx` / `EditarMembroForm.tsx` (módulo Membros) e `NovaMatriculaForm.tsx` (Matrícula Direta), como opções de seleção.

### 3.1 Profissões
- **Rota:** `/dashboard/configuracoes/profissoes` · **Tabela:** `settings_professions` · **53 registros**

### 3.2 Escolaridade
- **Rota:** `/dashboard/configuracoes/escolaridades` · **Tabela:** `settings_schooling` · **10 registros**

### 3.3 Estado Civil
- **Rota:** `/dashboard/configuracoes/estado-civil` · **Tabela:** `settings_civil_status` · **6 registros**

### 3.4 Sexo
- **Rota:** `/dashboard/configuracoes/genero` · **Tabela:** `settings_gender` · **2 registros**

### 3.5 Regiões DF

- **Rota:** `/dashboard/configuracoes/regioes-df`
- **Tabela:** `settings_custom_regions`, filtrada por `state_uf = 'DF'` (33 registros)
- **Uso:** consumida pelo autocomplete de Naturalidade quando a UF selecionada é DF — substitui a lista de municípios do IBGE, que só retorna "Brasília" como município oficial do Distrito Federal (as regiões administrativas, como Taguatinga e Ceilândia, não são municípios no IBGE, por isso este cadastro paralelo existe).

---

## 4. Administração Global e Acessos

- **Rota:** `/dashboard/configuracoes/acessos`
- A tela exibe o aviso "Área restrita. Apenas administradores Master e Super Master têm acesso completo" — mas esse é apenas um texto informativo. Não foi encontrada, no código desta página específica, uma checagem de nível de acesso (`assertLevel`/`requireAuthContext`) — a proteção real depende do middleware/layout pai.

Este card se desdobra em 4 painéis:

### 4.1 Campos / Ministérios
- **Tabela:** `churches`, `church_type = 'CHURCH'` (os mesmos 2 registros do card "Igrejas")
- **Funcional:** botão "Novo Campo" leva a `/igrejas/nova` (formulário real). O botão "Gerenciar" de cada linha não tem ação conectada (sem `href`/`onClick`).

### 4.2 Sedes Regionais
- **Tabela:** `churches`, condição `is_sede = true OR is_headquarters = true`
- **Estado atual:** 0 registros
- **Observação:** o botão "Promover Igreja a Sede" e o botão "Gerenciar" de cada linha não têm ação conectada — tela hoje é somente leitura. Também: o texto de estado vazio da própria tela avisa "(Requer coluna `is_sede boolean` na tabela `churches`)", mas essa coluna **já existe** no banco — o aviso está desatualizado.

### 4.3 Líderes de Setor
- **Tabela:** `sectors.mother_church_id`
- **Estado atual:** 0 dos 15 setores têm líder definido
- **Observação:** botões "Definir Líder" e "Alterar" não têm ação conectada — somente leitura.

### 4.4 Matriz de Usuários (RBAC)
- **Tabela:** `profiles` (`system_role`, `church_id`) — 11 perfis cadastrados no banco
- **Observação — achado relevante:** a única política de RLS de leitura em `profiles` é `profiles_select_own`, que permite a cada usuário ver **apenas o próprio registro**. Ou seja, hoje, quem abrir esta tela (fora de um bypass de service role) provavelmente vai ver só a si mesmo na lista, não os 11 usuários. Para a tela funcionar como "matriz" de fato, falta uma política de SELECT adicional liberando leitura para os papéis de staff (mesmo padrão `..._select_authenticated` usado nas demais tabelas deste módulo). O botão "Editar" também não tem ação conectada.

---

## 5. Síntese de Riscos e Recomendações

1. **Telas somente leitura em "Administração Acessos":** Sedes Regionais, Líderes de Setor e Matriz de Usuários têm botões de ação (Promover, Definir Líder, Alterar, Editar) sem handler — são protótipos visuais ainda não conectados a Server Actions.
2. **RLS de `profiles` bloqueia a Matriz de Usuários:** falta política de SELECT para staff — hoje a tela não cumpre sua função de listar todos os operadores.
3. **Cargos e Departamentos são cadastros desconectados:** existem e podem ser preenchidos, mas nenhum formulário do sistema hoje os referencia por FK (os campos equivalentes usam texto livre).
4. **Coluna legada `sectors.region`:** convive com `regiao_id` (a relação real usada hoje); candidata a remoção em migração futura, evitando confusão sobre qual campo é a fonte da verdade.
5. **Texto desatualizado na tela de Sedes:** menciona que a coluna `is_sede` "seria necessária", mas ela já existe — ajustar ou remover o aviso.
6. **Tabelas estruturalmente prontas mas ainda vazias na base real:** Sub-congregações, Células, Professores e Sedes Regionais (0 registros cada) — não são bugs, apenas refletem que a operação ainda não populou esses níveis.

---

## 6. Contagem de registros na base de produção (22/07/2026)

| Card | Tabela | Registros |
|---|---|---|
| Setores | `sectors` | 15 |
| Igrejas | `churches` (CHURCH) | 2 |
| Sub-congregações | `churches` (SUB) | 0 |
| Células | `churches` (CELL) | 0 |
| Região | `regioes` | 7 |
| Cargos | `ecclesiastical_roles` | 13 |
| Departamentos | `departments` | 13 |
| Professores | `professores` | 0 |
| Profissões | `settings_professions` | 53 |
| Escolaridade | `settings_schooling` | 10 |
| Estado Civil | `settings_civil_status` | 6 |
| Sexo | `settings_gender` | 2 |
| Regiões DF | `settings_custom_regions` (DF) | 33 |
| Usuários (perfis) | `profiles` | 11 |
