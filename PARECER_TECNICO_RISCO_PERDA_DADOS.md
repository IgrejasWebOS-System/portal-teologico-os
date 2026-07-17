# Parecer Técnico — Risco de Perda de Dados

**Sistema:** Portal EAD de Teologia (CETADP)
**Projeto Supabase avaliado:** `portal-teologico-os` (ref. `toduvwtzklntyptcodkf`)
**Organização Supabase:** IgrejasWebOS-System (ref. `oeqlxqppsaavipjtfvdb`) — plano **Free**
**Data do parecer:** 16/07/2026
**Autor:** Levantamento técnico automatizado (inspeção direta do banco de produção e das plataformas de hospedagem)

---

## 1. Resposta direta à pergunta

> *"Até quando de dados neste momento podemos processar em ter risco de perder dados?"*

A resposta correta é **não é uma questão de volume**. O sistema hoje usa **15 MB de um limite de 500 MB** no banco de dados (3% de ocupação) — mesmo com crescimento real de alunos, matrículas, financeiro e avaliações, a folga de volume é confortável por pelo menos 1-2 anos de operação plena.

O risco de perda de dados **já existe hoje, com 15 MB**, e não vai aumentar gradualmente com o volume — ele é **binário e estrutural**: o plano Free do Supabase **não tem nenhum backup automático** (sem backup diário, sem Point-in-Time Recovery). Isso significa que um único evento — um `DELETE` sem `WHERE`, uma migration com erro, uma credencial de `service_role` vazada, uma falha do lado do Supabase — é **irrecuperável**, seja com 15 MB ou com 400 MB. Não existe um "ponto de virada" de dados a partir do qual o risco piora; ele é constante desde o primeiro registro gravado.

Portanto, o verdadeiro teto operacional deste stack não é "quantos MB de dados", e sim **"quantos dias sem um backup restaurável a instituição está disposta a arriscar antes do pitch e depois de virar produção real"**.

---

## 2. Metodologia

Este parecer foi produzido a partir de inspeção direta e ao vivo do projeto de produção (não é uma estimativa teórica):

- Consulta ao plano e aos limites da organização Supabase via API de gestão.
- Medição real do tamanho do banco (`pg_database_size`) e do tamanho de cada tabela.
- Contagem real de linhas em `auth.users`, `storage.objects` e nas tabelas de maior propensão a crescimento (`avaliacao_questoes`).
- Consulta ao `max_connections` configurado no compute atual.
- Consulta aos *advisors* de segurança nativos do Supabase.
- Inventário de todos os projetos Supabase existentes na mesma organização.
- Consulta aos limites publicados do plano Vercel Hobby (camada de aplicação, sem estado persistente).

---

## 3. Situação atual medida (fatos, não estimativas)

| Métrica | Valor medido | Limite do plano Free | Ocupação |
|---|---|---|---|
| Tamanho do banco de dados | 15 MB (16.051.347 bytes) | 500 MB | ~3% |
| Maior tabela | `ebd_lessons` — 1,4 MB / 199 linhas | — | — |
| Usuários (`auth.users`) | 9 | 50.000 MAU | <0,1% |
| Armazenamento de arquivos (`storage.objects`) | 2 objetos / 96 KB | 1 GB | ~0,01% |
| Conexões diretas ao Postgres | `max_connections = 60` | — (teto do compute Micro/Free) | — |
| Backup automático | **Nenhum** (sem backup diário, sem PITR) | — | — |
| Projetos ativos na organização | 2 (`portal-teologico-os` e o projeto original `swczhmhyqygpdzxwpvfo`) + 1 inativo | 2 projetos ativos simultâneos | **possivelmente no limite** |

A maior parte dos 15 MB atuais é **overhead fixo de schema** (mais de 60 tabelas, índices, sequências, funções) — não conteúdo real. Dados de negócio propriamente ditos (linhas de alunos, matrículas, financeiro) somam bem menos de 1 MB hoje.

---

## 4. O fator determinante: ausência total de backup (não é o volume)

Este é o achado central deste parecer, e o mais importante para a tomada de decisão institucional:

- O plano **Free do Supabase não inclui backups automáticos de nenhum tipo**. Não há backup diário, não há *Point-in-Time Recovery* (PITR), não há SLA de recuperação.
- Isso significa que, na configuração atual, a **única cópia dos dados é o próprio banco de produção em execução**.
- Qualquer um dos eventos abaixo causaria **perda permanente e sem possibilidade de restauração**:
  - Um comando `DELETE`/`UPDATE` sem cláusula `WHERE` executado por engano (inclusive pelo próprio administrador, via SQL Editor).
  - Uma migration aplicada incorretamente em produção.
  - Vazamento ou uso indevido da chave `service_role` (que ignora RLS por completo).
  - Um incidente técnico do lado da infraestrutura do Supabase.
  - Exclusão acidental do projeto no painel.
- Este risco **não é proporcional ao volume de dados**. Ele existe da mesma forma com 9 usuários ou com 9.000 usuários — a diferença é apenas o *tamanho do prejuízo* em caso de perda, não a *probabilidade* dela.

**Implicação prática:** para uma instituição que vai depender deste sistema para matrículas, mensalidades e histórico acadêmico oficial, operar sem nenhum backup automatizado é o maior risco técnico do projeto hoje — muito à frente de qualquer limite de armazenamento.

---

## 5. Vetores de crescimento a monitorar (mesmo com folga de volume)

Embora o limite de 500 MB esteja longe de ser um problema no curto prazo, alguns vetores de crescimento merecem acompanhamento por serem *ilimitados por regra de negócio*, não por volume de alunos:

- **`avaliacao_questoes`** (snapshot de questões por tentativa de simulado): média de ~219 bytes/linha. Como a regra de negócio permite **simulados com tentativas ilimitadas**, cada tentativa gera um novo snapshot completo de questões — este é o único vetor de crescimento hoje que não é limitado pelo número de alunos, e sim pelo número de tentativas. Ainda assim, seriam necessárias centenas de milhares de tentativas para impactar o limite de 500 MB.
- **Armazenamento de arquivos (Supabase Storage, limite de 1 GB, separado do banco)**: hoje praticamente vazio (96 KB), mas o schema já reserva campos para uso real (`arquivo_path` em produtos, `imagem_url`, `logo_url` de igrejas, apostilas em PDF, materiais de curso). Assim que o conteúdo real (PDFs de apostilas, fotos, materiais físicos da loja) começar a ser carregado, este é o limite que deve estourar **primeiro e mais rápido** — PDFs e imagens consomem MB por arquivo, não bytes por linha.

---

## 6. Restrição de infraestrutura independente do volume de dados

Um achado relevante e não relacionado a volume: a mesma organização Supabase já opera **outros dois projetos** além deste:

- `IgrejasWebOS-System's Project` (`swczhmhyqygpdzxwpvfo`) — status **ativo**, é o banco original compartilhado do qual este projeto foi desmembrado.
- `Igrejas-Web-System-OS` — status **inativo**.

O plano Free permite no máximo **2 projetos ativos simultâneos por organização**. Somando o projeto atual (`portal-teologico-os`, ativo) com o projeto original (`swczhmhyqygpdzxwpvfo`, ativo), **a organização já está no limite do plano**. Isso não é um risco de perda de dados em si, mas é uma restrição operacional que pode impedir a criação de um terceiro projeto (por exemplo, um ambiente de homologação/staging separado de produção) sem primeiro pausar ou excluir um dos existentes.

Adicionalmente, o plano Free **pausa automaticamente qualquer projeto após 7 dias sem atividade de API**. Os dados são preservados durante a pausa, mas o sistema fica indisponível até uma retomada manual — relevante para o projeto atualmente listado como inativo, e um risco operacional (não de perda de dados) a observar em qualquer projeto que fique sem uso por uma semana, inclusive entre o pitch e o início real de operação.

---

## 7. Achados de segurança correlatos (risco de integridade, não de volume)

Os *advisors* de segurança nativos do Supabase apontam itens abertos que, embora não sejam "perda de dados" no sentido de exclusão, são vetores de **alteração indevida de dados**:

- As funções `calcular_depreciacao_mensal` e `calcular_valor_contabil` são `SECURITY DEFINER` e estão expostas para chamada por usuários `anon`/`authenticated` **sem nenhuma verificação interna de autorização** — diferente das demais funções de numeração (`get_next_matricula_ead`, `get_next_certificado`, `get_next_tombamento`), que têm checagem de staff internamente.
- Duas funções de trigger (`check_matricula_unica`, `patrimony_movement_trigger`) estão com `search_path` mutável, uma prática insegura recomendada pelo próprio Postgres/Supabase para evitar sequestro de função via schema.
- A proteção contra senhas vazadas (*leaked password protection*) está desabilitada na autenticação.

Nenhum destes é, isoladamente, um risco de "perder dados" por exclusão — mas combinados com a ausência de backup (seção 4), qualquer exploração bem-sucedida de um desses pontos se torna **igualmente irreversível**.

---

## 8. Recomendações, em ordem de prioridade

1. **Antes de qualquer outra coisa: implementar rotina de backup manual do banco**, mesmo que rudimentar (`pg_dump` agendado, ou exportação periódica via Supabase para armazenamento externo), enquanto o projeto estiver no plano Free. Isto elimina o risco binário descrito na seção 4 e é o item de maior impacto por menor esforço deste parecer.
2. **Avaliar upgrade para o plano Pro do Supabase antes da virada para produção real** (pós-pitch): o plano Pro inclui backups diários automáticos e a opção de PITR, além de remover o auto-pause por inatividade — adequado ao momento em que o sistema passar a controlar matrícula, mensalidade e histórico acadêmico oficial de pessoas reais.
3. **Corrigir as funções `SECURITY DEFINER` sem checagem interna** (`calcular_depreciacao_mensal`, `calcular_valor_contabil`), replicando o mesmo padrão de guarda de staff já usado nas funções de numeração.
4. **Fixar `search_path`** nas duas funções de trigger apontadas pelo advisor.
5. **Habilitar a proteção contra senha vazada** na autenticação.
6. **Monitorar o uso do Supabase Storage** assim que materiais reais (PDFs, apostilas, imagens de produtos) começarem a ser carregados — este será o primeiro limite físico a ser sentido, não o banco de dados.
7. **Resolver a questão do projeto Supabase original (`swczhmhyqygpdzxwpvfo`)** — decidir entre desativar/excluir definitivamente ou manter, para não operar no limite de 2 projetos ativos do plano Free.

---

## 9. Conclusão

Com os dados medidos hoje, o sistema está **tecnicamente muito longe** de qualquer limite de volume (3% de um banco de 500 MB, armazenamento de arquivos praticamente zerado). O risco real de perda de dados não vem de "quantos dados cabem", e sim do fato de que, **enquanto o projeto estiver no plano Free do Supabase, não existe nenhuma rede de segurança contra erro humano, falha de infraestrutura ou incidente de segurança** — a exposição é a mesma agora, com dados de demonstração, e será a mesma no dia em que o sistema estiver com a base real de alunos da instituição.

A recomendação prática e imediata, independentemente do cronograma de pitch, é tratar a ausência de backup como o item de maior prioridade técnica do projeto — à frente de qualquer nova funcionalidade.
