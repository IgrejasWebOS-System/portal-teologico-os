# Análise Técnica — Apresentação Institucional CETADP (24 slides, PDF 03/04/25)

Fonte: `Apresentação CETADP 03.04.25.pdf`, enviado pelo Joaquim como material de base para o Portal EAD. Este documento traduz o conteúdo institucional em requisitos técnicos concretos para o `portal-teologico-os`, aponta lacunas no schema já migrado (`supabase/migrations/001-007`) e prioriza o que cabe antes de 24/07 vs. o que fica para depois.

## 1. O que a apresentação revela (fatos institucionais)

- **Identidade**: CETADP = Centro Educacional Teológico das Assembleias de Deus em Piracicaba, ligado à Igreja Assembleia de Deus Ministério de Madureira, Campo de Piracicaba. Slogan: "Uma Igreja Voltada ao Ensino". Presidente: Pr. Dilmo dos Santos (posse desde 2003). Sede fundada em 1948, prédio próprio do CETADP inaugurado em 2022.
- **Escala do Campo de Piracicaba**: 388 igrejas, 22.126 membros, 4.150 obreiros, 731 ministros, presentes em 10 estados e 3 países (Brasil, Irlanda, EUA). Isso é maior do que qualquer dado fictício usado até agora nas demos — são números reais e fortes para o pitch.
- **Diretoria CETADP** (org chart real): Presidente, 1º e 2º Vice-Presidentes, Secretário (4 pessoas), Tesouraria (2), Conselho Fiscal (3), Conselho Teológico (3). Hoje isso não existe em lugar nenhum do site público.
- **Sistema atual da secretaria: WPENSAR** — um SaaS genérico de "gestão escolar" (não é feito para igreja) com os módulos: matrículas, controle financeiro, cadastro de notas, evolução do aluno, histórico do aluno, acesso remoto. É o concorrente direto que o Portal EAD substitui — e o diferencial nosso é integrar isso ao cadastro de membros/igrejas (`ministry_id`), coisa que um sistema de gestão escolar genérico não faz.
- **Cursos oferecidos** — dois grupos distintos:
  1. **Curso Teológico Básico** (10 disciplinas, calendário fixo fev-nov com recesso em jun/jul): Doutrina de Deus, Cristologia, Pneumatologia, Anjos/Homem/Pecado, Panorama do AT, Panorama do NT, História da Igreja, Escatologia, Ética Cristã, Bibliologia. 1 ano de duração.
  2. **Curso Teológico Médio** (10 disciplinas, mesmo formato de calendário): Família Cristã, Homilética, Hermenêutica, Teologia do Obreiro, Soteriologia, Eclesiologia, Educação Cristã, Apologética, Missiologia, Liderança Cristã. 1 ano de duração.
  3. **10 cursos preparatórios** avulsos, cada um com certificado próprio: Batismo, Diaconato, Presbitério, Dirigentes, EBOM (19 temas listados), Noivos, Casados, Tesouraria, EBD/Superintendente, Professores (+ um "Devocional" em desenvolvimento).
- **EAD** já tem um plano de edições anuais gravadas: "Dezembro 2026" (Básico) e "Dezembro 2027" (Médio) — ou seja, o modelo real é de **turmas/edições por ano**, não matrícula avulsa contínua.
- **Alunos reais**: 802 alunos no Brasil (662 Básico + 140 Médio), distribuídos por SP, MG, MS, PR, RS, BA, PE, AL, PB, AC — em polos presenciais específicos (Piracicaba, Centenário do Sul-PR, Caruaru-PE, Nova Andradina-MS, São Pedro-SP, Pau da Lima-BA, Piracicamirim-SP, São Francisco-SP, Kobaiat Líbano-SP).
- **Certificados**: já emitidos fisicamente hoje, assinados por Pr. Dilmo dos Santos (Presidente) e Pr. Marcelo Eduardo Trevisan (Coordenador Acadêmico), um por curso preparatório concluído + diploma de formatura (Básico/Médio). Já houve uma 1ª formatura formal (beca, culto, diplomação).
- **Financeiro**: preços reais — Curso Básico: matrícula R$25 + 12x R$65 (R$805 total). Curso Médio: sem matrícula + 12x R$80 (R$800 total). Pagamento por depósito, transferência ou PIX, com dados bancários (Banco do Brasil, agência/conta, chave PIX) estampados num cartão de pagamento.
- **Parceria**: currículo do CETADP já é usado por outra igreja (AD Piracicaba Brás) — ou seja, o modelo multi-tenant/multi-ministério não é hipotético, já existe na prática.

## 2. Mapeamento para o schema atual (o que já existe vs. o que falta)

Schema hoje (`supabase/migrations/001-007`, projeto isolado `toduvwtzklntyptcodkf`): `courses`, `lessons`, `enrollments`, `lesson_completions`, `ebd_quarters`, `ebd_lessons`, `ebd_lesson_progress`, `ead_campos_ministerios`, `ead_alunos`, `ead_inscricoes`, `members`, `churches`, `sectors`, `transactions`.

| Necessidade real (da apresentação) | Existe hoje? | Gap |
|---|---|---|
| Curso com **10 disciplinas fixas por calendário mensal** (fev-nov, recesso jun-ago) | `courses`/`lessons` existem, mas os dados de demo (5 cursos, 15 aulas) não seguem essa estrutura | Precisa remodelar `lessons` para representar disciplina+mês+ordem, ou aceitar que por ora é só conteúdo livre (ok para MVP, mas o dado de demo deveria refletir o calendário real) |
| **Cursos preparatórios avulsos** (Batismo, Diaconato, Presbitério, EBOM, Noivos, Casados etc.) | `courses.module` provavelmente só distingue "escola"/"cursos"/"ebd" | Confirmar se o enum `course_module` comporta os 10 tipos, ou se cabem todos em "cursos" com nome livre — provavelmente cabe, mas os dados de demo hoje não representam nenhum desses 10 |
| **Turmas/edições anuais** (Dezembro 2026, Dezembro 2027) | Não existe tabela de turma/cohort — `enrollments` liga aluno direto ao curso | Gap real. Para o pitch, pode ser simulado com o texto "Edição 2026" no nome do curso; para produção, vale uma tabela `course_editions` (ano, status aberta/encerrada) |
| **Certificados** (emissão, template, assinaturas, nº do certificado) | Existe rota `/certificados` no código, mas não confirmamos tabela dedicada nem geração de PDF com as assinaturas reais | Gap a verificar — se não existe tabela `certificates`, é a peça que falta para fechar o ciclo completo (inscrição → matrícula → conclusão → certificado) |
| **Diretoria/organograma público** | Não existe hoje na home nem em `/sobre` | Fácil de fechar antes do pitch — conteúdo estático, sem mudança de schema |
| **Números reais da rede** (22.126 membros, 388 igrejas, 802 alunos) | Home hoje usa números genéricos/placeholder | Troca de texto simples, alto impacto no pitch — recomendo prioridade alta |
| **Financeiro com preços reais + PIX/depósito/transferência** | `transactions` existe, mas sem regra de preço por curso nem integração de pagamento | Fora de escopo para 24/07 (é Fase 4). Manter fluxo manual (aprovação pela secretaria) como já está — é a decisão certa para o prazo |
| **Dados bancários (agência/conta/PIX) do CETADP** | — | **Atenção**: esses dados aparecem só no material de marketing/apresentação. Não devem ser hardcoded em nenhuma tela pública do portal nem em código-fonte. Se algum dia o portal precisar exibi-los (ex: tela de pagamento por PIX), isso deve vir de uma config administrável, não de texto fixo |
| **Multi-tenant real (parceria com outra igreja usando o currículo)** | Arquitetura `ministry_id` já cobre isso | Nenhum gap — na verdade valida a decisão arquitetural já tomada |

## 3. Recomendações priorizadas

**Antes de 24/07 (baixo esforço, alto impacto no pitch):**
1. Trocar números genéricos da home/`/sobre` pelos números reais (22.126 membros, 388 igrejas, 802 alunos EAD, 76 anos de história) — reforça credibilidade do pitch.
2. Adicionar um bloco "Diretoria/Liderança" em `/sobre` com os nomes reais da Diretoria CETADP.
3. Renomear os 5 cursos de demonstração para refletir nomes reais do catálogo (ex.: trocar 2-3 dos cursos placeholder por "Curso Teológico Básico", "Curso Teológico Médio", "EBOM") — deixa a demo mais alinhada ao que será mostrado como visão de produto.
4. Preparar 1-2 frases no roteiro do pitch comparando o WPENSAR (sistema atual, genérico) com o Portal EAD (integrado ao cadastro de membros/igrejas) — é um argumento de venda pronto, direto da própria apresentação da instituição.

**Pós-pitch (Fase 4, sem prazo):**
5. Modelar `course_editions`/turmas anuais se o CETADP quiser reproduzir o padrão real de "edição Dezembro-20XX".
6. Construir o módulo de certificados (se ainda não existir tabela dedicada) com template configurável de assinaturas.
7. Modelar preço por curso (`courses.price_matricula`, `courses.price_mensalidade`) e depois, só então, avaliar integração de pagamento — nunca embutir dados bancários reais em código.
8. Cadastrar os polos presenciais reais em `ead_campos_ministerios` (hoje só há 3 registros seed) para refletir a rede nacional.

## 4. Observação de segurança

O PDF expõe uma imagem de cartão com agência/conta bancária e chave PIX do CETADP. Esse material é para uso interno/institucional — não deve ser replicado em nenhuma página pública do portal, commit de código, ou documentação versionada no repositório. Trato essa informação apenas como contexto de negócio, não como dado a persistir em nenhum arquivo do projeto.
