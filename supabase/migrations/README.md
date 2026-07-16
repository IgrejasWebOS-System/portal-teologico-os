# supabase/migrations — pasta oficial (a partir de 13/07/2026)

Esta é a **única pasta de migrações ativa** deste projeto. Todo arquivo aqui
foi de fato aplicado ao projeto Supabase isolado `toduvwtzklntyptcodkf`
(criado em 13/07/2026, Fase 1 do plano de isolamento) via `apply_migration`
do MCP do Supabase — não via Supabase CLI.

| Arquivo | Conteúdo |
|---|---|
| `001_schema_base_isolado.sql` | Todas as tabelas, tipos, sequências, FKs e índices |
| `002_funcoes_triggers.sql` | Funções (`get_next_matricula*`, `handle_new_user`, etc.) e triggers |
| `003_rls_corrigida.sql` | RLS habilitada + políticas em todas as tabelas |
| `004_endurecimento_seguranca.sql` | Correção dos avisos (WARN) do advisor de segurança |
| `005_seed_campos_ministerios.sql` | Dados de referência (campos/ministérios do CETADP) |
| `006_dados_demonstracao.sql` | Cursos/aulas, EBD e inscrições pendentes para o ensaio do pitch (conteúdo placeholder) |
| `007_correcao_nome_cetadp.sql` | Correção do prefixo de matrícula: "CETADEP" → "CETADP" |
| `008_atualizacao_nomes_cursos_reais.sql` | Renomeia 3 dos 5 cursos de demonstração para nomes reais do catálogo (Curso Teológico Básico, Curso Teológico Médio, EBOM), com base na apresentação institucional em PDF |
| `009_turmas_edicoes_anuais.sql` | Tabela `course_editions` (turmas/edições anuais, ex: "Edição Dezembro 2026") + `enrollments.course_edition_id` (nullable) + RLS |
| `010_modulo_certificados.sql` | Tabela `certificates` (emissão, nº público, assinaturas) + RLS (SELECT público para validação, escrita só staff) |
| `011_correcao_grants_certificates.sql` | Corrige GRANT revogado por engano na 010, que teria bloqueado a secretaria de emitir certificados |
| `012_correcao_role_padrao_novo_usuario.sql` | **Correção de segurança:** `handle_new_user()` promovia todo usuário novo a `LOCAL_ADMIN` (staff/admin) por padrão. Corrigido para `MEMBER`; 2 perfis de teste de aluno afetados foram migrados |
| `013_loja_produtos_pedidos.sql` | Tabelas `products`, `orders`, `order_items` — loja de cursos avulsos, material físico e PDFs, com checkout via Mercado Pago (sandbox) + RLS |
| `014_seed_produtos_loja.sql` | 4 produtos de demonstração para a Loja (1 curso avulso, 1 material físico, 1 PDF grátis, 1 PDF pago) — conteúdo placeholder |
| `015_snapshot_comprador_orders.sql` | `orders.nome_comprador`/`email_comprador` — snapshot do comprador (profiles não tem policy de staff, só self-select) |
| `016_polos_presenciais_reais.sql` | 8 polos presenciais reais em `ead_campos_ministerios` (Centenário do Sul-PR, Caruaru-PE, Nova Andradina-MS, São Pedro-SP, Pau da Lima-BA, Piracicamirim-SP, São Francisco-SP, Kobaiat Líbano-SP) |
| `017_funcao_numero_certificado.sql` | Sequência + `get_next_certificado()` (staff-only, SECURITY DEFINER) — gera o número público `CETADP-CERT-AAAA-NNNN` |
| `018_cursos_preparatorios_avulsos.sql` | 9 cursos preparatórios reais (Diaconato, Presbitério, Dirigentes, Noivos, Casados, Tesouraria, EBD/Superintendente, Professores, Devocional) + produtos CURSO_AVULSO vinculados na Loja (preço placeholder R$40) |
| `019_pagamento_matricula_oficial.sql` | `ead_inscricoes` ganha `preco_matricula_centavos`, `mercadopago_preference_id`, `mercadopago_payment_id`, `pago_em` — matrícula do curso teológico oficial (Básico, R$25) passa a ser cobrada de verdade via Mercado Pago no ato da inscrição, antes da análise da secretaria |
| `020_cadastro_completo_aluno_cpf_unico.sql` | `ead_alunos` ganha ficha cadastral completa (RG, nascimento, gênero, estado civil, escolaridade, profissão, endereço, filiação) + índice único de CPF — uma pessoa = uma linha |
| `021_ead_matriculas.sql` | Nova tabela `ead_matriculas` (matrícula por curso, status EM_ANDAMENTO/APROVADO/REPROVADO/CANCELADO, origem INSCRICAO_PUBLICA/MATRICULA_DIRETA) + trigger que bloqueia matrícula duplicada no mesmo curso a não ser que a anterior tenha sido reprovada/cancelada. Backfill dos alunos já aprovados |
| `022_financeiro_plano_de_contas.sql` | Tabela `fin_categorias` (plano de contas hierárquico RECEITA/DESPESA) + seed inicial de categorias |
| `023_financeiro_caixa_diario.sql` | Tabelas `fin_caixa_diario` (abertura/fechamento por dia) e `fin_lancamentos` (entradas/saídas vinculadas a uma categoria) |
| `024_patrimonio_inventario.sql` | Módulo de patrimônio/inventário adaptado do igrejas-web-system-os: `patrimony_items`, `patrimony_movements`, `patrimony_depreciations` + numeração automática de tombamento (`get_next_tombamento`) + funções de cálculo de depreciação |
| `025_avaliacoes_simulados_provas.sql` | Simulados e provas — fase sem IA: `avaliacoes_banco_questoes` (banco estático por curso), `avaliacoes` (1 prova por matrícula via índice único parcial), `avaliacao_questoes` (snapshot sorteado/embaralhado por aluno). Seed de 12 questões de exemplo para o Curso Teológico Básico |
| `026_orders_telefone_comprador.sql` | `orders.telefone_comprador` — snapshot do telefone informado no checkout da loja |
| `027_financeiro_contas_a_receber.sql` | Tabela `fin_contas_receber` — parcelas de matrícula (presencial ou paga online), responsável pelo pagamento (aluno ou igreja, financiamento interno), baixa com taxa de operadora/antecipação de cartão. Vendas online (Loja/inscrição) entram aqui já baixadas pelo webhook, sem tocar no Caixa Diário físico. + categorias `SANGRIA` e `VENDAS_ONLINE` no plano de contas |
| `028_automatricula_sem_aprovacao_secretaria.sql` | `get_next_matricula_ead()` passa a aceitar chamadas `service_role` (rotinas confiáveis do servidor), além de staff — necessário pra matrícula não depender mais de aprovação manual. `ead_matriculas.origem` ganha o valor `AUTO_MATRICULA` |
| `029_seed_tabelas_auxiliares_configuracoes.sql` | Popula as tabelas auxiliares do módulo Igreja (Configurações): `settings_gender`, `settings_civil_status`, `settings_schooling`, `settings_professions`, `ecclesiastical_roles`, `departments` e `settings_custom_regions` (regiões administrativas do DF) — todas estavam vazias |
| `030_financeiro_contas_a_pagar.sql` | Tabela `fin_contas_pagar` — despesas com fornecedor/prestador e vencimento, espelhando `fin_contas_receber`. Baixa em dinheiro gera saída no Caixa Diário. + despesas de demonstração (aluguel, água/luz, professores, gráfica, contabilidade) |
| `031_curriculo_real_teologico_basico_medio.sql` | Substitui as aulas placeholder de "Curso Teológico Básico" e "Curso Teológico Médio" pelo currículo oficial (10 disciplinas cada, fev-nov com recesso em julho) e publica os dois cursos |
| `032_matriculas_demo_alunos_teologico.sql` | Matrícula de demonstração completa: 1 aluno no Básico, 1 no Médio — ficha `ead_alunos`/`ead_matriculas`, `enrollments`/`lesson_completions` (progresso parcial), 1 avaliação de exemplo e parcelas de mensalidade (uma delas como financiamento interno de igreja) |
| `033_caixa_diario_demo.sql` | Abre o Caixa Diário de hoje com lançamentos de exemplo (matrícula em dinheiro, venda avulsa, sangria) |
| `034_ajuste_contas_receber_maior_que_pagar.sql` | Recebível consolidado de demonstração pra Contas a Receber ficar maior que Contas a Pagar |
| `035_patrimonio_demo_carro_computador.sql` | 2 bens de demonstração no Patrimônio: 1 veículo e 1 computador, ambos adquiridos em 2020 |
| `036_certificado_demo_visual.sql` | 1 certificado de demonstração (curso avulso Diaconato) pra testar o novo modelo visual de certificado |
| `037_estoque_movimentacoes_produtos.sql` | Tabela `product_stock_movements` — histórico de entradas/saídas/ajustes de estoque dos produtos da Loja, com baixa automática nas vendas pagas via webhook |
| `038_leads_loja_funil_status.sql` | Tabela `loja_leads_crm` — funil de contato simples (Não contatado/Contatado/Convertido/Sem interesse) + observação para os Leads da Loja |

**Como aplicar uma migração nova daqui pra frente:**
1. Peça para o Claude aplicar via MCP do Supabase (`apply_migration`), **ou**
2. Cole o SQL manualmente no SQL Editor do projeto `toduvwtzklntyptcodkf`
   (https://supabase.com/dashboard/project/toduvwtzklntyptcodkf/sql/new).

Numere sempre sequencialmente (006, 007...) e descreva o conteúdo no nome
do arquivo, como já vinha sendo feito.

A pasta `sql/migrations/` e os 4 arquivos que já existiam nesta mesma pasta
antes de hoje (`ebd_module.sql`, `schema_introspection.sql`,
`002_video_content.sql`, `003_member_timeline.sql`) descrevem o **banco
antigo, compartilhado com o `Igrejas-Web-os`** (`swczhmhyqygpdzxwpvfo`).
Ficam mantidos como referência histórica — o conteúdo deles já está
incorporado em `001_schema_base_isolado.sql` — mas não devem mais ser
aplicados a este projeto. Veja `sql/migrations/README.md`.
