# Parecer Técnico — Formulário de Matrícula e Provas Reais (Pneumatologia)

**Data:** 21/07/2026 · **Fontes:** `FORMULARIO DE MATRICULA.pdf` e `Provas Pneumatologia.pdf` (documentos físicos reais do CETADP, anexados por Joaquim). **Natureza:** só análise — nenhuma alteração de código ou banco foi feita a partir deste parecer.

Verifiquei os dois documentos direto contra o schema hoje em produção
(`toduvwtzklntyptcodkf`), tabela por tabela, para não especular.

---

## 1. Formulário de Matrícula — Curso Teológico (Básico/Médio)

### 1.1 O que o papel pede vs. o que o sistema já guarda

| Campo no papel | Existe em `ead_alunos`/`ead_matriculas`? |
|---|---|
| Nome, telefone, e-mail | ✅ `nome_completo`, `telefone`, `email` |
| Endereço completo (rua, nº, bairro, cidade, UF, CEP) | ✅ `endereco`, `endereco_numero`, `bairro`, `cidade`, `estado`, `cep` |
| Data de nascimento | ✅ `data_nascimento` |
| Naturalidade | ✅ `naturalidade_cidade`, `naturalidade_estado` |
| **Nacionalidade** | ❌ Não existe nenhuma coluna — hoje não há onde guardar |
| Sexo | 🟡 Existe `genero`, mas o papel usa especificamente "Sexo: Masculino/Feminino" — vale confirmar se é o mesmo conceito ou se o sistema já foi além (mais opções) |
| Estado civil | ✅ `estado_civil` |
| RG (+ órgão emissor, UF) | ✅ `rg`, `rg_orgao_emissor`, `rg_uf` |
| CPF | ✅ `cpf` (único por aluno, já validado nesta sessão) |
| Escolaridade, profissão | ✅ `escolaridade`, `profissao` |
| Filiação (nome do cônjuge/mãe/pai) — não aparece neste formulário específico, mas está no roteiro de teste como campo do cadastro | ✅ `nome_conjuge`, `nome_mae`, `nome_pai` — já existem, mesmo não estando neste modelo de papel |
| **Núcleo (Setor)** | ✅ `campo_ministerio_id`/`campo_ministerio_nome` |
| **Igreja** (campo separado do Núcleo, no papel) | ❌ Não existe campo próprio — o schema só guarda o campo/ministério, não a igreja local específica do aluno dentro dele |
| Curso (Básico/Médio) | ✅ `ead_matriculas.course_id` |
| **Consentimento LGPD** (declaração explícita, art. 7º/11 da Lei 13.709/2018, assinada) | ❌ Não existe nenhuma coluna de consentimento (aceite + data/hora) em `ead_alunos` nem `ead_matriculas` |
| Pagamento da matrícula/material (valor, sim/não, data) | 🟡 Existe módulo Financeiro (caixa, contas a receber) separado, mas não confirmei se cada lançamento financeiro é vinculado à matrícula/aluno individual — não há coluna de pagamento na própria `ead_matriculas` |

### 1.2 Ponto que já bate exatamente com o sistema

Os valores do papel conferem com o que já está documentado no projeto:
**Básico** = matrícula R$25 + 12x R$65; **Médio** = isento de matrícula +
12x R$80. Isso já tinha sido levantado na análise institucional anterior
— o papel confirma que são os valores oficiais em uso hoje, não uma
estimativa.

### 1.3 O que isso significa

- O cadastro digital (`/admin/matriculas/nova` e o fluxo de auto-matrícula) já cobre a maior parte dos campos do papel — é mais completo, inclusive, que o próprio formulário físico (guarda filiação, que o papel nem pede).
- Faltam três coisas específicas: **nacionalidade**, **igreja local (separada do Núcleo/Setor)** e, principalmente, **o registro formal de consentimento LGPD** — este último é o mais sensível, porque o papel tem uma declaração jurídica explícita e o fluxo digital, hoje, não deixa claro se replica essa mesma garantia.
- O pagamento da matrícula/mensalidade ainda não parece ter um vínculo direto e rastreável por aluno dentro do schema de matrícula — hoje o Financeiro é um módulo mais genérico (caixa/contas a receber), não uma "ficha financeira do aluno" com status de parcelas.

---

## 2. Provas Pneumatologia — formato real vs. motor de avaliações do sistema

### 2.1 O que o documento real mostra

É um caderno de **4 testes**, um a cada duas lições (Lições 1-2, 3-4,
5-6, 7-8) — não uma prova única por curso. Cada teste tem:

- Cabeçalho com Nome, Nº, Núcleo, Data (preenchido à mão).
- 15 a 17 questões de **Certo/Errado** (afirmações teológicas para marcar C ou E).
- Nos testes 1 e 3, um bloco adicional de **associação de colunas** (ligar item da Coluna A a uma opção da Coluna B — inclusive com repetição: em uma das listas, 5 itens da coluna A se distribuem entre só 2 opções da coluna B).

### 2.2 O que o motor de avaliações do sistema suporta hoje

Consultei a tabela `avaliacoes_banco_questoes` diretamente: as colunas
são `enunciado`, `opcoes` (lista) e `resposta_correta_index` (um único
índice correto). Ou seja, **hoje o sistema só sabe fazer múltipla
escolha com uma resposta certa entre várias opções** — nada de
Certo/Errado nem associação de colunas. Além disso, o modelo atual gera
**um simulado/prova por curso inteiro** (10 questões sorteadas do banco
do curso), não um teste por par de lições como no papel.

### 2.3 Tabela-resumo do gap

| Característica | Papel (real, em uso) | Sistema hoje |
|---|---|---|
| Tipo de questão | Certo/Errado + associação de colunas | Múltipla escolha (índice único) |
| Unidade de avaliação | Por par de lições (4 testes por disciplina) | Por curso inteiro (1 simulado/1 prova) |
| Quantidade de questões | 15–20 por teste | 10 por tentativa |
| Correção | Manual (professor, com gabarito à parte) | Automática (comparação de índice) |
| Identificação do aluno no teste | Nome + Nº + Núcleo, escrito à mão | Vinculado à sessão logada do aluno |

### 2.4 O que isso significa

O motor de avaliações que construímos (simulados/provas, migração 025 em
diante) foi modelado como um exame único e cumulativo por curso, no
formato mais simples de implementar (múltipla escolha). O material real
do CETADP usa um formato pedagógico diferente — testes curtos e
frequentes por lição, com Certo/Errado e associação — que é mais
próximo de como a instituição realmente ensina e avalia hoje
(fisicamente). São dois modelos válidos, mas **não é o mesmo modelo**:
se a intenção é que o Portal EAD substitua (ou espelhe) a avaliação real
da disciplina de Pneumatologia como está no papel, o banco de questões
e a engine de correção precisariam ser estendidos para suportar pelo
menos o tipo Certo/Errado, e possivelmente associação de colunas — hoje
não suportam.

---

## 3. Riscos e gaps priorizados

1. **Consentimento LGPD não registrado digitalmente** — é o ponto de maior risco jurídico dos dois documentos, porque o papel tem uma cláusula formal e assinada, e o fluxo digital hoje não deixa rastro equivalente (aceite + timestamp).
2. **Tipo de questão limitado a múltipla escolha** — bloqueia usar o banco de questões real de Pneumatologia (e provavelmente de outras disciplinas no mesmo padrão) sem reescrever o enunciado/opções para forçar um formato de múltipla escolha que não é o original.
3. **Granularidade da avaliação** (por curso vs. por par de lições) — decisão de produto, não só técnica: manter o simulado/prova amplo (mais simples) ou migrar para testes curtos por lição (mais fiel ao material real e ao hábito pedagógico do CETADP).
4. **Campos faltantes no cadastro** (nacionalidade, igreja local separada do Núcleo) — baixo esforço técnico, mas preciso confirmar se são realmente necessários para o CETADP ou se o papel só está desatualizado frente ao que a instituição pede hoje.
5. **Rastreabilidade financeira por aluno** — hoje o Financeiro é genérico; não há uma "ficha" clara de quais parcelas cada aluno já pagou, o que o papel resolve fisicamente com o campo Sim/Não + data.

---

## 4. Perguntas em aberto (para decidir antes de qualquer implementação)

- O Portal EAD deve reproduzir exatamente este modelo de teste (Certo/Errado + associação, por par de lições), ou o simulado/prova atual (múltipla escolha, por curso) é intencional e deve continuar assim, tratando o papel como um material de apoio à parte?
- Vale a pena estender o cadastro para capturar nacionalidade e igreja local, ou isso é um detalhe do formulário antigo que pode ficar de fora?
- O consentimento LGPD deve virar um campo formal no fluxo de matrícula digital (checkbox + texto legal + timestamp), espelhando a cláusula do papel?
- Existem mais provas reais como esta (de outras disciplinas) que ajudariam a confirmar se o padrão Certo/Errado + associação é geral ou específico de Pneumatologia?
- O pagamento da matrícula/mensalidades deve ganhar um vínculo direto e visível por aluno/matrícula, ou o Financeiro genérico já resolve o que o CETADP precisa?

Nenhuma dessas perguntas foi respondida neste parecer — fica para quando
você quiser avançar.

---

## 5. Reavaliação — 22/07/2026

Desde a data deste parecer (21/07), boa parte das lacunas da seção 1 foi fechada. A seção 2 (provas) não mudou nada.

### 5.1 Cadastro — quase tudo resolvido

| Gap original | Status hoje |
|---|---|
| Nacionalidade ❌ | ✅ Resolvido — `ead_alunos.nacionalidade`, default "Brasileira", campo editável no formulário (migração 045) |
| Igreja local separada do Núcleo ❌ | ✅ Resolvido, com um modelo diferente do que o parecer imaginava: em vez de um campo dentro do Campo/Ministério, o vínculo virou Setor → Igreja (`ead_alunos.sector_id`, `ead_alunos.church_id`, migração 044), usando a estrutura real de 15 setores/7 regiões de Piracicaba levantada com você. Campo/Ministério continua existindo à parte, para os campos fora de Piracicaba |
| Consentimento LGPD ❌ | ✅ Resolvido — checkbox obrigatório com o texto legal do art. 7º/11 da Lei 13.709/2018, `consentimento_lgpd_aceito` + `consentimento_lgpd_data` (migração 045). Bloqueia envio no navegador e a Server Action revalida no servidor antes de gerar a matrícula |
| Sexo 🟡 (dúvida de nomenclatura) | Rótulo do campo trocado de "Gênero" para "Sexo" no formulário e no painel de configurações — mesma coluna por trás, só ajuste de rótulo |
| Rastreabilidade financeira por aluno 🟡 | Parcial — `fin_contas_receber` já linkava por `aluno_id`/`origem_id` desde antes deste parecer; agora também aceita cobrança única via link de pagamento do Mercado Pago (mesmo padrão da Loja), com baixa automática pelo webhook quando pago. Ainda não existe uma tela de "ficha financeira do aluno" consolidada — o dado já dá pra consultar, mas não há uma visão dedicada por aluno |

Fora do escopo original do parecer, também foram adicionados: vínculo de Turma (`course_editions`) e Professor na matrícula, e busca de cidade/UF por Naturalidade (API do IBGE).

### 5.2 Provas — gap segue aberto, sem mudança

O motor de avaliações continua só múltipla escolha, um exame por curso inteiro (não por par de lições, sem Certo/Errado nem associação de colunas). Nada mudou aqui desde 21/07 — permanece o maior gap identificado no parecer original.

### 5.3 Riscos priorizados — atualização

1. ~~Consentimento LGPD não registrado~~ — **resolvido**.
2. Tipo de questão limitado a múltipla escolha — **aberto**, agora o maior risco/gap remanescente do parecer.
3. Granularidade da avaliação (por curso vs. por par de lições) — **aberto**, decisão de produto ainda pendente.
4. ~~Campos faltantes no cadastro~~ (nacionalidade, igreja local) — **resolvido**.
5. Rastreabilidade financeira por aluno — **parcial**: dado já existe e agora cobre também cobrança online, falta a visão consolidada por aluno.

### 5.4 Perguntas em aberto — o que já foi respondido na prática

- Nacionalidade e igreja local: respondidas — foram implementadas.
- Consentimento LGPD: respondida — virou campo formal, obrigatório.
- Reproduzir o modelo real de prova (Certo/Errado + associação, por par de lições) vs. manter o simulado/prova atual (múltipla escolha, por curso): **ainda sem resposta** — é a decisão de maior impacto que falta tomar, porque envolve reescrever o banco de questões e a engine de correção.
- Mais provas reais de outras disciplinas para confirmar se o padrão é geral: **ainda não verificado**.
- Ficha financeira por aluno como tela dedicada: **ainda sem decisão** — o dado já suporta, falta decidir se vale construir a tela.
