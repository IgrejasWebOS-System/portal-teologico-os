# Comparativo — Análise Institucional (PDF) vs. o que está implementado

Atualização de `analise-tecnica-apresentacao-institucional.md` (a análise técnica das 24 slides do PDF institucional do CETADP) contra o estado real do projeto hoje. Verificado direto no banco de produção (`toduvwtzklntyptcodkf`), não por suposição.

## 1. Recomendações "antes de 24/07" (baixo esforço, alto impacto)

| Recomendação original | Status | Observação |
|---|---|---|
| Trocar números genéricos da home/`/sobre` pelos números reais | ✅ Feito | Home mostra 388 igrejas, 22.126 membros, 802 alunos, 76 anos — direto do PDF |
| Adicionar bloco "Diretoria/Liderança" em `/sobre` | ✅ Feito | 7 grupos reais (Presidente, Vice-Presidentes, Secretário, Tesouraria, Conselho Fiscal, Conselho Teológico) |
| Renomear 2-3 cursos de demonstração para nomes reais | ✅ Feito | Curso Teológico Básico, Curso Teológico Médio, EBOM — Escola Bíblica de Obreiros e Membros |
| Argumento WPENSAR vs. Portal EAD no roteiro do pitch | ✅ Feito | Seção 3 do roteiro, com números reais na abertura |

Os 4 itens de curto prazo estão 100% concluídos.

## 2. Recomendações "pós-pitch" (Fase 4, sem prazo)

| Recomendação original | Status | Observação |
|---|---|---|
| Modelar `course_editions`/turmas anuais | ✅ Schema pronto | Tabela existe, RLS ativa, `enrollments.course_edition_id` ligado — mas **0 edições cadastradas** ainda (nenhuma "Edição Dezembro 2026" foi criada de fato) |
| Construir módulo de certificados | 🟡 Schema pronto, sem fluxo de emissão | Tabela `certificates` existe com assinaturas configuráveis e validação pública por número — mas **0 certificados emitidos**, não existe ainda a tela/ação que gera um certificado ao concluir um curso. `/certificados` continua sendo o placeholder original |
| Modelar preço por curso / avaliar pagamento (sem hardcode de dados bancários) | ✅ Superado | Foi além do previsto: construímos loja completa com Mercado Pago (sandbox), checkout e webhook — não só "modelar preço", mas processar pagamento de verdade. Nenhum dado bancário do CETADP foi exposto em código, como recomendado |
| Cadastrar polos presenciais reais em `ead_campos_ministerios` | ❌ Não feito | Ainda só 3 registros de seed (Campo Piracicaba Sede, Ministério de Jovens, Ministério de Missões) — a rede real de polos do PDF (Centenário do Sul-PR, Caruaru-PE, Nova Andradina-MS, São Pedro-SP, Pau da Lima-BA, Piracicamirim-SP, São Francisco-SP, Kobaiat Líbano-SP) não está cadastrada |

## 3. Gaps identificados na análise original (tabela "schema atual vs. necessidade real")

| Necessidade real (do PDF) | Status |
|---|---|
| Curso com 10 disciplinas fixas por calendário mensal (fev-nov, recesso jun-ago) | ❌ Não feito — `lessons` ainda não reflete o calendário real de nenhum curso |
| 10 cursos preparatórios avulsos (Batismo, Diaconato, Presbitério, Dirigentes, Noivos, Casados, Tesouraria, EBD/Superintendente, Professores, Devocional) | 🟡 Parcial — a Loja (`products`) já suporta "curso avulso" genericamente, e EBOM foi criado; os outros 9 cursos preparatórios específicos ainda não existem como produto/curso |
| Turmas/edições anuais | ✅ Ver seção 2 |
| Certificados | 🟡 Ver seção 2 |
| Organograma público (Diretoria) | ✅ Feito |
| Números reais da rede | ✅ Feito |
| Financeiro com preços reais + PIX/depósito/transferência | 🟡 Parcial — a Loja processa pagamento real via Mercado Pago (cursos avulsos, material físico, PDFs); o fluxo **oficial** de matrícula (`ead_inscricoes`) continua gratuito/manual, sem cobrar a matrícula/mensalidade real do curso teológico oficial (R$25 + 12x R$65, por exemplo) |
| Dados bancários do CETADP não expostos | ✅ Respeitado — nenhuma chave PIX/conta bancária foi hardcoded; todo pagamento passa pelo Mercado Pago |
| Multi-tenant real (parceria com AD Piracicaba Brás) | ⏸ Sem mudança — segue validado só pela arquitetura (`ministry_id` no projeto novo), migração real é a Fase 4 (tarefa pendente, pós-pitch) |

## 4. O que foi construído além do que a análise original previa

A análise original recomendava, com cautela, apenas "modelar preço por curso" e "avaliar pagamento" — o pedido seguinte do Joaquim (cursos avulsos para público externo, biblioteca vendendo material físico e PDFs) foi bem além disso e resultou em:
- Cadastro público autosserviço para quem não é membro do ministério
- Loja completa (catálogo, carrinho, checkout)
- Integração real de pagamento (Mercado Pago sandbox) com liberação automática de acesso
- Storage de PDFs com controle de acesso (download vs. leitura protegida)
- Painel da secretaria para gestão de pedidos físicos (envio/entrega)
- Correção de um bug de segurança real encontrado no caminho (todo usuário novo nascia administrador)

## 5. Prioridades sugeridas a partir daqui

Nenhum destes é bloqueante para 24/07 — todos são Fase 4 (pós-pitch):

1. Cadastrar os polos presenciais reais em `ead_campos_ministerios` — baixo esforço, mesmo padrão dos dados de demonstração.
2. Construir a tela/ação de emissão de certificado — fecha o ciclo inscrição → matrícula → conclusão → certificado, hoje só o schema existe.
3. Decidir se o curso teológico oficial (matrícula) passa a cobrar de verdade via Mercado Pago, ou continua gratuito/manual como está.
4. Modelar os 9 cursos preparatórios avulsos restantes (Diaconato, Presbitério, Dirigentes, Noivos, Casados, Tesouraria, EBD/Superintendente, Professores, Devocional) como produtos na Loja.
