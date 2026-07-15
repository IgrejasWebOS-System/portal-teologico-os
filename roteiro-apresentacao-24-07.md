# Roteiro de Apresentação — Portal EAD CETADP (24/07/2026)

Roteiro de apoio para o ensaio e a apresentação. Baseado no
`CETADP_PORTAL_EAD.md` (documento institucional completo) — aqui o foco é
a sequência de fala e a demonstração ao vivo.

Tempo estimado total: 13–16 minutos (ajuste conforme o tempo disponível).

---

## 1. Abertura (1 min)

"O CETADP forma membros, obreiros e líderes das Assembleias de Deus em
Piracicaba há 76 anos — hoje são 388 igrejas, 22.126 membros e mais de 800
alunos em formação teológica pelo Brasil. Essa formação hoje é presencial
— o que limita quem pode participar a quem consegue se deslocar até um
dos polos. O que vou apresentar resolve isso: um portal que leva a mesma
formação oficial do CETADP para qualquer campo ou ministério, a
distância, sem abrir mão do controle que uma instituição de ensino
precisa ter sobre quem se matricula."

## 2. O problema, em uma frase (30 seg)

"Hoje, formação teológica de qualidade e ensino a distância com controle
de matrícula são duas coisas que não existem juntas para o CETADP. O
portal une as duas."

## 3. O que o CETADP já usa hoje (1 min)

"A secretaria do CETADP já usa um sistema — o WPENSAR — para matrícula,
controle financeiro, notas e histórico do aluno. É um sistema de gestão
escolar genérico, feito para qualquer escola, não para uma rede de
igrejas. Ele não sabe o que é um campo, um ministério, ou um membro — só
sabe 'aluno'. O Portal EAD não reinventa isso: ele parte do mesmo
princípio (matrícula, financeiro, histórico), mas nasce integrado ao
cadastro de membros e igrejas que o CETADP já tem. Um aluno aqui já é, ao
mesmo tempo, um membro de uma igreja específica, dentro de um campo
específico — informação que o WPENSAR simplesmente não enxerga."

## 4. Demonstração ao vivo — parte 1: o site institucional (2 min)

Abrir a home pública (`/`).

- Mostrar o hero e a frase-chave: **"presencial e a distância, para todos
  os campos e ministérios"**.
- Passar rapidamente pelos 4 serviços (Cursos Oficiais, Reciclagem,
  Teologia em Níveis, Treinamentos).
- Abrir `/sobre` — "Quem Somos".
- Mencionar a Biblioteca (`/biblioteca`) como distribuidora de material
  (livros, apostilas, Revista Escola Dominical, Jornal Semeador) — deixar
  claro que o catálogo em si é o próximo passo, hoje é apresentação.

## 5. Demonstração ao vivo — parte 2: o fluxo de inscrição (3 min)

**Preparação prévia:** já existem 3 inscrições de demonstração pendentes
no banco (Mariana Alves Ferreira, Carlos Eduardo Lima, Fernanda Souza
Ribeiro) — não precisa preencher o formulário ao vivo se quiser economizar
tempo, mas preencher é mais impactante. Escolha uma das duas abordagens:

**Opção A — mostrar o formulário sendo preenchido:**
1. Abrir `/inscricao`, preencher com um dado fictício na hora.
2. Enviar → mostrar a tela de confirmação (`/inscricao/obrigado`).

**Opção B — ir direto para a aprovação (mais rápido):**
1. Fazer login como secretaria.
2. Abrir `/admin/inscricoes` — mostrar as 3 inscrições pendentes já carregadas.
3. Clicar em **"Aprovar e gerar matrícula"** numa delas, ao vivo.
4. Mostrar a matrícula gerada automaticamente (formato `CETADP-2026-XXXX`).

Falar durante a ação: "A secretaria não perde o controle — toda matrícula
passa por aprovação humana antes de existir. O sistema só automatiza a
parte mecânica: gerar o número, criar o acesso e mandar o e-mail."

## 6. Demonstração ao vivo — parte 3: a área do aluno (2 min)

Login com um usuário de teste já matriculado (ou o próprio usuário
demonstrador).

- Mostrar o hub `/portal` com os módulos (Escola, Cursos, EBD).
- Entrar em **Escola Teológica** → mostrar os cursos, já com nomes reais
  do catálogo (Curso Teológico Básico, Curso Teológico Médio,
  Hermenêutica Bíblica).
- Abrir um curso, mostrar a lista de aulas.
- Passar rapidamente pela **EBD** — trimestre "A Igreja e sua Missão", 4
  lições carregadas.

## 7. O que já está pronto vs. o que falta (1 min)

Ser direto e honesto aqui — gera confiança:

- **Pronto:** site institucional, inscrição pública, aprovação da
  secretaria, matrícula automática, convite por e-mail, login, três
  módulos de conteúdo com dados de demonstração, banco de dados próprio e
  seguro (isolado, não compartilhado com outros sistemas).
- **Falta:** catálogo real da Biblioteca, emissão de certificado,
  conteúdo curricular definitivo (o que está carregado hoje é
  placeholder), abertura para outras igrejas/campos.

## 8. O ponto de governança (1 min — importante, não pular)

"Um ponto de transparência: o fornecedor já está construindo, em
paralelo, um sistema de gestão eclesiástica de próxima geração
(`igrejas-web-system-os`), com controle de acesso mais robusto e pensado
desde o início para várias igrejas. A decisão foi apresentar hoje sobre a
base que já está pronta e testada, e migrar este Portal EAD para essa
arquitetura nova logo após a aprovação — sem colocar o prazo de hoje em
risco. Já existe um plano técnico documentado para essa migração."

## 9. Fechamento e pedido (30 seg)

"O que eu preciso da liderança hoje é a aprovação para: 1) seguir
operando o piloto com o CETADP, 2) planejar a extensão para uma segunda
igreja depois que o piloto estiver validado. Dúvidas?"

---

## Perguntas prováveis (preparar respostas)

- **"Isso substitui a formação presencial?"** — Não, complementa. O
  próprio hero da home já diz "presencial e a distância".
- **"E se o aluno não tiver e-mail ou não souber usar?"** — A secretaria
  aprova e orienta; o fluxo é o mesmo de qualquer sistema acadêmico com
  e-mail e senha.
- **"Quanto custa manter isso rodando?"** — O banco de dados novo está no
  plano gratuito do Supabase hoje; hospedagem via Vercel. Custo cresce
  conforme uso real (alunos, dados).
- **"Quando dá pra abrir pra outra igreja?"** — Depois de validar o
  piloto com o CETADP e migrar para a arquitetura multi-tenant nova —
  não antes, para não repetir o problema de isolamento que já resolvemos
  aqui.

---

## Se a venda fechar: o que falta para produção real (material de apoio — não ler ao vivo)

Guardar esta seção para responder se a liderança perguntar "e se a gente
fechar hoje, o que falta pra valer?". Separado em técnico (o que eu
resolvo) e institucional (o que só o CETADP decide).

**Técnico, para o portal rodar de verdade:**
- Domínio próprio (ex: `portal.cetadp.com.br`) — hoje está no subdomínio
  gratuito da Vercel. Além de mais profissional, é o que permite
  configurar o envio de e-mail com autenticação de domínio (SPF/DKIM),
  melhorando a entrega e evitando spam.
- Conta Mercado Pago em modo **produção** (não sandbox/teste), vinculada
  ao CNPJ do CETADP, com conta bancária para recebimento — troca as
  credenciais de teste pelas de produção.
- Conta de envio de e-mail transacional (Resend recomendado — mais
  apropriado que usar um Gmail pessoal, que tem limite baixo e não foi
  feito para esse volume) com o domínio verificado.
- Definir quem paga e administra Supabase e Vercel daqui pra frente —
  hoje estão no plano gratuito; com uso real (mais alunos, mais dados,
  mais tráfego) alguns desses planos podem precisar virar pagos.

**Institucional — decisão do CETADP, não técnica:**
- Quem é o dono das contas de serviço (Mercado Pago, Supabase, Vercel,
  domínio, e-mail) — a própria instituição, ou o fornecedor operando
  como serviço para eles? É modelo de negócio, não escolha técnica.
- Política de privacidade e termos de uso — o portal coleta CPF, dados
  pessoais e agora processa pagamento (produtos físicos e digitais).
  Vale revisão jurídica (LGPD, Código de Defesa do Consumidor). Isso não
  é algo que o desenvolvedor substitui — precisa de um advogado.
- Quem mantém e alimenta conteúdo real (aulas, PDFs, apostilas) depois do
  piloto — hoje o conteúdo carregado é só demonstração.
