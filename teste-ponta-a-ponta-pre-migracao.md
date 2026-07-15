# Roteiro de Teste Ponta a Ponta — Pré-Migração

**Projeto:** portal-teologico-os · **Objetivo:** validar todos os módulos existentes antes de iniciar a tarefa #28 ([Pós-pitch] Migrar para igrejas-web-system-os). **Data de referência:** 15/07/2026.

Este roteiro é para ser seguido manualmente, um item por vez, marcando `[x]` no que passou e anotando o que falhou. Rode-o no ambiente que for migrar (produção Vercel, de preferência — é o estado real que será levado para o novo sistema).

---

## 0. Antes de começar

### 0.1 Dados sensíveis — NÃO mexer

As 3 inscrições de demonstração usadas no roteiro do pitch (24/07) **precisam continuar com status `PENDENTE`** depois deste teste:

| Nome | Curso | Status atual |
|---|---|---|
| Mariana Alves Ferreira | Teologia — Básico | PENDENTE |
| Carlos Eduardo Lima | Treinamento / Capacitação | PENDENTE |
| Fernanda Souza Ribeiro | Curso Oficial | PENDENTE |

**Não clique em "Aprovar" nem "Rejeitar" nessas três em `/admin/inscricoes`.** Para testar o fluxo de aprovação/rejeição (módulo 5), crie uma inscrição nova e descartável através do próprio formulário público, com um nome tipo `TESTE QA — APAGAR` e um e-mail que você controle de verdade (o convite de acesso é enviado para esse e-mail).

### 0.2 Achado de segurança identificado ao montar este roteiro

Ao mapear os módulos, encontrei o seguinte: as páginas do módulo **Igreja** (`/dashboard`, `/dashboard/membros`, `/dashboard/igrejas`, `/dashboard/ocorrencias`, `/dashboard/configuracoes/*`) só verificam se existe um usuário logado — **nenhuma delas verifica `system_role`**, com exceção de `/dashboard/configuracoes/acessos/usuarios`. Isso quer dizer que hoje, qualquer pessoa que se cadastrar pelo `/cadastro` público (um aluno externo comprando um curso avulso, por exemplo) consegue digitar `/dashboard/membros` na barra de endereço e ver a base de membros da igreja — nomes, CPF, status financeiro etc.

Isso é testado no módulo 14 (RBAC) abaixo, mas já aviso aqui porque é um achado que merece decisão sua: quer que eu feche esse acesso (adicionar a mesma checagem de staff que já existe em `/admin/*`) antes do dia 24, ou isso fica para depois da migração? Não fiz a correção sozinho porque não foi pedida — só sinalizando, como já fiz outras vezes nesta sessão.

### 0.3 Contas de teste disponíveis hoje

| E-mail | system_role | Uso sugerido no teste |
|---|---|---|
| `igrejaswebos@gmail.com` | LOCAL_ADMIN (staff) | Testar todos os painéis `/admin/*` e `/dashboard/*` |
| `joaquimmscoelhoam@gmail.com` | MEMBER | Testar `/portal` e módulos do aluno |
| `portalteologicoos@gmail.com` | MEMBER | Segunda conta de aluno, se precisar de dois usuários ao mesmo tempo |

Não existe hoje nenhuma conta com `GLOBAL_ADMIN` ou `SECTOR_ADMIN`. No código atual, os três papéis de staff (`GLOBAL_ADMIN`, `SECTOR_ADMIN`, `LOCAL_ADMIN`) têm exatamente o mesmo acesso em todo o sistema — não existe hierarquia diferenciada entre eles implementada ainda (isso é diferente do modelo de 5 níveis 0–4 do projeto `igrejas-web-system-os`, que é outro projeto). Por isso, testar com a conta LOCAL_ADMIN já cobre o comportamento de "staff" por completo; não é necessário criar contas GLOBAL_ADMIN/SECTOR_ADMIN separadas a menos que você quera confirmar visualmente que o texto do papel aparece correto em algum lugar da interface.

### 0.4 Cartão de teste do Mercado Pago (sandbox)

Use qualquer um destes dados de cartão. O **resultado do pagamento é definido pelo nome do titular**, não pelo número do cartão:

- **Número:** 5031 4332 1540 6351 (Mastercard) · **Validade:** 11/30 · **CVV:** 123
- **CPF do titular:** 123.456.789-09
- **Nome do titular = `APRO`** → pagamento aprovado
- **Nome do titular = `OTHE`** → pagamento recusado (erro geral)

---

## 1. Módulo Institucional / Público

- [ ] `/` carrega, mostra os 4 números reais (388 igrejas, 22.126 membros, 802 alunos, 76 anos) e o menu tem "Loja"
- [ ] `/sobre` carrega e mostra o bloco de Diretoria (7 grupos)
- [ ] Header público (`PublicHeader`) tem a mesma largura em todas as páginas públicas (checar em `/`, `/sobre`, `/loja`)
- [ ] Rodapé e links de navegação do header funcionam (Início, Sobre, Loja, Biblioteca, Certificados, Login)
- [ ] Layout responde bem em mobile (redimensionar a janela ou usar modo responsivo do navegador)

## 2. Módulo Autenticação

- [ ] `/login` carrega com o design padronizado
- [ ] Login com `igrejaswebos@gmail.com` funciona e redireciona para `/portal`
- [ ] Usuário já logado que tenta acessar `/login` é redirecionado para `/portal` automaticamente
- [ ] `/cadastro` carrega, tem link a partir de `/login`
- [ ] Preencher `/cadastro` com um e-mail de teste real → recebe e-mail de confirmação → link leva para `/auth/callback` → `/confirme-email` ou direto para `/portal`
- [ ] Novo usuário criado por `/cadastro` nasce com `system_role = MEMBER` (checar na tabela `profiles` ou tentar acessar `/admin/inscricoes` — deve dar "Acesso restrito")
- [ ] Fluxo de convite por e-mail (quando a secretaria aprova uma inscrição) leva a `/definir-senha` e depois consegue logar

## 3. Módulo Inscrição EAD — curso gratuito (fluxo antigo)

- [ ] `/inscricao` carrega, lista de campos/ministérios aparece no select
- [ ] Select de curso mostra o preço da matrícula ao lado de "Teologia — Nível Básico" e nenhum preço nos demais
- [ ] Preencher com nome `TESTE QA — APAGAR (gratuito)`, curso **Treinamento / Capacitação** (sem preço) → enviar
- [ ] Redireciona direto para `/inscricao/obrigado`, sem passar por pagamento
- [ ] Nova linha aparece em `/admin/inscricoes` com status `PENDENTE` (logado como staff)

## 4. Módulo Inscrição EAD — matrícula paga (fluxo novo, Mercado Pago)

- [ ] Preencher `/inscricao` com nome `TESTE QA — APAGAR (pago aprovado)`, curso **Teologia — Nível Básico** → enviar
- [ ] Redireciona para o Checkout Pro do Mercado Pago (sandbox), valor R$ 25,00
- [ ] Pagar com cartão de teste, titular `APRO` (ver seção 0.4) → aprovado
- [ ] Redireciona para `/inscricao/pagamento/[id]` mostrando "Pagamento confirmado!"
- [ ] Em `/admin/inscricoes`, essa inscrição aparece como `PENDENTE` (não mais "aguardando pagamento") com a linha extra "Matrícula paga: R$ 25,00 em [data]"
- [ ] Repetir o formulário com nome `TESTE QA — APAGAR (pago recusado)`, mesmo curso, mas pagar com titular `OTHE` → recusado
- [ ] Redireciona para `/inscricao/pagamento/[id]` mostrando "Pagamento não aprovado", com botão "Tentar novamente"
- [ ] Em `/admin/inscricoes`, essa segunda inscrição aparece com status "PAGAMENTO RECUSADO" (badge vermelho) e **sem** botões de aprovar/rejeitar
- [ ] Confirmar que Mariana, Carlos e Fernanda continuam `PENDENTE` (não foram tocadas)

## 5. Módulo Secretaria — aprovar/rejeitar inscrições

Use **só** as inscrições `TESTE QA — APAGAR` criadas nos módulos 3 e 4 — nunca Mariana/Carlos/Fernanda.

- [ ] Logado como staff, `/admin/inscricoes` mostra a lista ordenada com pendentes primeiro
- [ ] Clicar "Aprovar e gerar matrícula" na inscrição gratuita de teste → gera matrícula `CETADP-...`, cria linha em `ead_alunos`, muda status para `APROVADA`
- [ ] E-mail de convite chega na caixa de entrada usada no teste
- [ ] Clicar "Rejeitar" na inscrição paga-aprovada de teste → pede/aceita motivo, muda status para `REJEITADA`
- [ ] Tentar acessar `/admin/inscricoes` logado como MEMBER → tela "Acesso restrito"
- [ ] Tentar acessar `/admin/inscricoes` deslogado → redireciona para `/login`

## 6. Módulo Portal do Aluno (hub)

- [ ] Logar com uma conta MEMBER (`joaquimmscoelhoam@gmail.com`) → `/portal` carrega com saudação e os cards dos módulos
- [ ] Todos os 5 cards (Igreja, Escola Teológica, Cursos & Treinamentos, EBD, Meus Certificados) estão clicáveis e levam à página certa

## 7. Módulo Escola Teológica

- [ ] `/escola` lista os cursos do módulo `escola` (Curso Teológico Básico, Curso Teológico Médio, Hermenêutica Bíblica) — hoje todos em status `DRAFT`
- [ ] **Atenção:** cursos em `DRAFT` podem não aparecer se a listagem filtrar por `PUBLISHED` — se a lista vier vazia para o aluno, confirmar se é esperado (curso ainda não publicado) ou bug
- [ ] `/escola/[id]` abre o curso e lista as aulas (lessons), se o curso estiver acessível
- [ ] Marcar uma aula como concluída (`lesson_completions`) e ver o progresso mudar em `enrollments.progress_percent`

## 8. Módulo Cursos & Treinamentos

- [ ] `/cursos` lista os cursos do módulo `cursos` (Diaconato, Presbitério, Dirigentes, Noivos, Casados, Tesouraria, EBD-Superintendente, Professores, Devocional, Homilética, EBOM) — todos `PUBLISHED`
- [ ] `/cursos/[id]` abre um curso publicado e mostra as aulas
- [ ] Confirmar que os 9 cursos preparatórios novos (task #47) aparecem certinho, com os nomes reais do catálogo

## 9. Módulo EBD

- [ ] `/ebd` carrega — **hoje não existe nenhum trimestre cadastrado (`ebd_quarters` está vazia)**, então é esperado que a tela mostre estado vazio ("nenhum trimestre disponível") em vez de erro
- [ ] Se quiser testar o fluxo completo, cadastre um trimestre de teste via SQL/Supabase antes, abra `/ebd/[quarterId]` e depois `/ebd/[quarterId]/[lessonId]`, e depois apague os dados de teste

## 10. Módulo Certificados

- [ ] Logado como staff, `/admin/certificados` carrega e lista os alunos elegíveis (`ead_alunos`)
- [ ] Emitir um certificado de teste para um dos alunos de teste já aprovados (não use os dados reais de Mariana/Carlos/Fernanda porque eles ainda não têm matrícula gerada)
- [ ] Número gerado segue o formato `CETADP-CERT-2026-000X`
- [ ] Logado como o aluno dono do certificado, `/portal/certificados` mostra o certificado emitido
- [ ] `/certificados` (público, sem login) permite buscar pelo número gerado e confirma a validade
- [ ] Buscar um número inexistente em `/certificados` retorna "não encontrado", sem erro
- [ ] **Nota:** a tabela `certificates` está zerada hoje — o primeiro certificado emitido em produção "de verdade" pode ser interessante guardar para o dia do pitch; se preferir não gastar o número de sequência antes da hora, pule este módulo e só confirme visualmente que a tela abre sem erro

## 11. Módulo Loja (comércio externo)

- [ ] `/loja` lista os produtos ativos: 9 cursos avulsos (R$ 40 cada), Homilética avulso (R$ 150), livro físico "Família Cristã" (R$ 45), PDF grátis "Cartilha de Boas-Vindas", PDF pago "Apostila Hermenêutica" (R$ 30)
- [ ] Adicionar 1 curso avulso + o livro físico ao carrinho → badge do carrinho no header atualiza
- [ ] `/loja/carrinho` mostra os itens certos e pede endereço de entrega (por causa do item físico)
- [ ] Finalizar compra sem estar logado → pede login primeiro
- [ ] Logado, finalizar compra → cria pedido com status `AGUARDANDO_PAGAMENTO` e redireciona para o Mercado Pago
- [ ] Pagar com titular `APRO` → volta para `/loja/pedido/[id]` com "Pagamento confirmado!"
- [ ] O curso avulso comprado aparece automaticamente em `enrollments` do usuário (liberação automática)
- [ ] O item físico aparece em `/admin/pedidos` com `fulfillment_status = AGUARDANDO_ENVIO`
- [ ] Logado como staff, marcar o pedido físico como enviado/entregue em `/admin/pedidos`
- [ ] Repetir uma compra só do PDF pago, pagar com `APRO`, e confirmar que dá para baixar/visualizar o PDF depois (módulo 12)

## 12. Módulo Biblioteca (PDF download x virtual)

- [ ] `/biblioteca` lista os PDFs disponíveis (grátis e pago)
- [ ] Sem ter comprado, tentar acessar o PDF pago "Apostila Hermenêutica" → bloqueado
- [ ] O PDF grátis "Cartilha de Boas-Vindas" está acessível para qualquer usuário logado, sem precisar comprar
- [ ] Depois de comprar a Apostila (módulo 11), o link de acesso libera e gera uma URL assinada
- [ ] Confirmar que o PDF "download" baixa o arquivo, e o PDF "virtual" abre em modo visualização (sem opção de salvar, se essa distinção estiver implementada na tela)

## 13. Módulo Igreja / Dashboard (legado, pré-EAD)

- [ ] Logado como staff, `/dashboard` mostra os KPIs (membros ativos, pendentes, aniversariantes etc.)
- [ ] `/dashboard/membros` lista membros, `/dashboard/membros/novo` cria um novo, `/dashboard/membros/editar/[id]` edita
- [ ] `/dashboard/igrejas` lista as igrejas cadastradas
- [ ] `/dashboard/ocorrencias` carrega
- [ ] `/dashboard/configuracoes` e as sub-telas (setores, regiões, departamentos, cargos, profissões, escolaridades, estado civil, gênero, igrejas) abrem sem erro
- [ ] `/dashboard/configuracoes/acessos` e `/dashboard/configuracoes/acessos/usuarios` (a única tela deste módulo com checagem de papel) — confirmar que bloqueia quem não é staff

## 14. RBAC — matriz de acesso por papel

Testar cada linha logado com a conta correspondente (seção 0.3):

| Rota | MEMBER deveria... | Staff (LOCAL_ADMIN) deveria... |
|---|---|---|
| `/admin/inscricoes` | ver "Acesso restrito" | acessar normalmente |
| `/admin/certificados` | ver "Acesso restrito" | acessar normalmente |
| `/admin/pedidos` | ver "Acesso restrito" | acessar normalmente |
| `/admin/conteudo` | ver "Acesso restrito" | acessar normalmente |
| `/dashboard/membros` | **hoje: consegue acessar (achado da seção 0.2)** | acessar normalmente |
| `/dashboard/configuracoes/acessos/usuarios` | ver "Acesso restrito" | acessar normalmente |
| `/portal` | acessar normalmente | acessar normalmente |

- [ ] Confirmar cada linha da tabela acima e marcar se o comportamento bateu com o esperado
- [ ] Se a linha de `/dashboard/membros` realmente deixar o MEMBER entrar, decidir com a diretoria/CETADP se corrige antes do dia 24 ou depois da migração

## 15. Nota sobre módulos só de schema (sem tela ainda)

- **Turmas/edições anuais (`course_editions`)**: a tabela existe (task #35) mas não há nenhuma tela `/admin/...` para cadastrar edições ainda — está zerada (0 linhas). Não há o que testar via navegador; só é possível inspecionar/criar registros direto no Supabase. Se isso for necessário para o pitch ou para a migração, é um módulo a construir, não a testar.

## 16. Resumo final

- [ ] Todos os itens acima revisados
- [ ] Lista de bugs encontrados (anexar aqui ou em conversa separada):
  1.
  2.
  3.
- [ ] Limpeza: apagar as inscrições/pedidos/certificados de teste criados neste roteiro (ou deixá-los, já identificados pelo prefixo "TESTE QA — APAGAR")
- [ ] Confirmado que Mariana, Carlos e Fernanda continuam `PENDENTE` para o pitch
- [ ] Pronto para seguir com a tarefa #28 (migração para igrejas-web-system-os)
