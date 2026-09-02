# Cronograma — Portal CETADP em 3 Idiomas (pt-BR / en-US / es-419)

**Hoje:** 15/08/2026 · **Meta técnica:** recurso pronto em `main` até 31/08/2026 · **Liberação aos usuários:** 01/09/2026 (decisão da diretoria)

## Minha avaliação do prazo

16 dias é um prazo confortável para a parte técnica: infraestrutura de i18n, tradução de toda a interface (menus, botões, formulários, mensagens) e do sistema autenticado inteiro dá tempo de sobra, inclusive com testes de regressão no login — o que seria arriscado fazer em poucos dias, mas não em duas semanas e meia.

O ponto de atenção real não é código, é **conteúdo doutrinário/institucional longo** (ementas de curso, declaração de fé, textos de "Sobre") — isso eu não recomendo traduzir em massa por IA sem revisão humana, dado o risco de erro teológico em outro idioma. Para não travar o prazo por causa disso, o cronograma abaixo entrega a plataforma 100% funcional nos 3 idiomas até 31/08 (interface, navegação, formulários, fluxos de matrícula/checkout), com o conteúdo institucional longo em fallback português + aviso discreto de "tradução em revisão", liberando o restante progressivamente depois do dia 01/09, conforme a diretoria for aprovando.

**Atualização (15/08):** o material dos cursos de teologia já foi traduzido para `en-US` por fora do sistema — isso reduz bastante o risco pro inglês, porque a tarefa deixa de ser "traduzir do zero" e passa a ser "importar + revisar terminologia contra o que já existe na plataforma". `es-419` continua sem material traduzido e segue sendo o item de maior risco de prazo pro conteúdo longo.

Tudo é feito primeiro em `portal-teologico-os-staging`, validado por Preview do Vercel, e só entra em `main` depois de aprovado — nada muda em produção antes de 31/08.

## Fase 0 — Fundação técnica (15/08 a 17/08, 3 dias)

| Item | Detalhe |
|---|---|
| Instalar e configurar `next-intl` | Middleware de locale encadeado com o middleware de autenticação já existente, sem quebrar o refresh de sessão do Supabase |
| Estrutura de namespaces | `common`, `auth`, `home`, `academy`, `financeiro`, `secretaria`, `admin`, `ebd` — um JSON por idioma por namespace |
| Tipagem TypeScript das chaves | Chave de tradução errada ou faltando vira erro de `tsc`, não texto quebrado em produção |
| Migration `locale` em `profiles` | Preferência de idioma persiste por usuário logado, além do cookie para visitante anônimo |
| Sincronização cookie ⇄ perfil | No login, o idioma salvo no perfil prevalece sobre o cookie do navegador |

**Entregável:** PR só de infraestrutura — nenhum texto visível muda ainda, o site continua idêntico ao de hoje em `pt-BR` (idioma padrão).
**Checkpoint crítico:** testar login, logout e uma rota protegida de cada nível de acesso (0 a 4) depois do middleware novo, pra garantir que RLS e sessão não regrediram.

## Fase 1 — Home e páginas públicas nos 3 idiomas (18/08 a 21/08, 4 dias)

| Dia | Escopo |
|---|---|
| 18/08 | Home + Login + Cadastro + Recuperar senha |
| 19/08 | Inscrição + Sobre |
| 20/08 | Loja + Carrinho |
| 21/08 | Seletor de idioma no header/footer + revisão geral + PR |

**Entregável:** Preview navegável em `/pt-BR`, `/en-US` e `/es-419` para todas as páginas públicas.
**Checkpoint:** você revisa a tradução do inglês e do espanhol dessas páginas antes de eu seguir pro sistema autenticado.

## Fase 2 — Sistema autenticado, módulo por módulo (22/08 a 28/08, 7 dias)

| Dia | Módulo |
|---|---|
| 22/08 | Dashboard + Membros |
| 23/08 | Igrejas + Configurações |
| 24/08 | Escola + Cursos — interface traduzida + importação do material já traduzido em `en-US` (revisão de terminologia, não tradução do zero) |
| 25/08 | EBD |
| 26/08 | Financeiro |
| 27/08 | Secretaria + Admin (painel super-master) |
| 28/08 | Revisão cruzada — textos que ficaram faltando, mensagens de erro/sucesso, e-mails transacionais |

Cada módulo entra como um PR pequeno e isolado (só o namespace daquele módulo), revisado e mesclado na staging incrementalmente — sem acumular um PR gigante de risco alto no fim.

### Item adicional — Escola/Avaliações: provas para aluno de outro país

Quando a nuvem com o banco de provas existente for disponibilizada e o embaralhamento de questões por aluno for implementado, aplicar as seguintes regras (frente separada, fora do banco de questões atual, que ainda é só em português):

- **Critério de idioma da prova = `locale` do perfil do aluno**, não o país onde ele mora. Idioma preferido é o que determina se ele consegue interpretar corretamente o enunciado.
- **Modelo de dados**: cada questão continua canônica (uma só, com a resposta certa e as métricas), e ganha uma tabela `question_translations` (question_id, locale, enunciado, alternativas, status) — sem duplicar a questão inteira por idioma.
- **Toda tradução de questão passa por revisão humana antes de virar "aprovada"** — o mesmo filtro já definido para conteúdo doutrinário, mas aqui com peso maior: uma tradução errada pode gerar nota incorreta pro aluno.
- **Regra do embaralhamento**: para aluno com `locale` diferente de `pt-BR`, só sortear questões com tradução "aprovada" naquele idioma. Nunca misturar português com outro idioma na mesma prova.
- **Fallback de cobertura baixa**: se o módulo ainda não tiver tradução aprovada suficiente, a prova desse aluno permanece em português (com aviso claro na tela) em vez de gerar uma prova incompleta ou mista.

## Fase 3 — QA e revisão de conteúdo (29/08 a 30/08, 2 dias)

- Teste ponta a ponta nos 3 idiomas: login, matrícula, emissão de certificado, checkout na loja.
- Revisão humana do conteúdo institucional/doutrinário que ainda estiver em fallback português.
- Ajustes de SEO: `hreflang`, metadados por idioma.
- Teste de regressão do middleware de autenticação combinado com locale (o ponto mais sensível de todo o projeto).

## Fase 4 — Merge final (31/08)

- Merge de `staging` para `main`.
- Validação final no Vercel Production.
- Recurso tecnicamente pronto e estável, aguardando a liberação formal aos usuários em 01/09 conforme decidido pela diretoria.

## Depois de 01/09

Conteúdo institucional/doutrinário longo que ainda não tiver passado por revisão humana continua sendo liberado progressivamente, sem bloquear o lançamento nem expor tradução não revisada de temas sensíveis.
