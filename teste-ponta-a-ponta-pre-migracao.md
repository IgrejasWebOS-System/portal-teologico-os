# Roteiro de Teste Ponta a Ponta — Pré-Migração

**Projeto:** portal-teologico-os · **Objetivo:** validar todos os módulos existentes antes de iniciar a tarefa #28 ([Pós-pitch] Migrar para igrejas-web-system-os). **Atualizado em:** 15/07/2026, após o pacote de matrícula direta, financeiro, patrimônio e simulados/provas.

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

**Não clique em "Aprovar" nem "Rejeitar" nessas três em `/admin/inscricoes`.** Para testar aprovação/rejeição (módulo 5) e o novo módulo de matrícula direta (módulo 5-B), use inscrições/matrículas novas e descartáveis, com um nome tipo `TESTE QA — APAGAR` e um e-mail que você controle de verdade (convites de acesso são enviados de verdade).

Além disso, a **prova de um curso só pode ser feita uma vez por matrícula** (regra nova, módulo 10) — ao testar o módulo de provas, use uma matrícula de teste, não uma que você queira reaproveitar depois.

### 0.2 Achado de segurança da rodada anterior — já corrigido

O roteiro anterior apontava que `/dashboard/*` (módulo Igreja) não checava `system_role`, permitindo que qualquer aluno externo acessasse a base de membros pela URL direta. **Isso foi corrigido**: o layout do grupo `(igreja)` agora exige papel de staff, com a mesma tela de "Acesso restrito" do `/admin/*`. Vale reconfirmar no módulo 14 (RBAC) abaixo.

### 0.3 Contas de teste disponíveis hoje

| E-mail | system_role | Uso sugerido no teste |
|---|---|---|
| `igrejaswebos@gmail.com` | LOCAL_ADMIN (staff) | Testar todos os painéis `/admin/*` e `/dashboard/*` |
| `joaquimmscoelhoam@gmail.com` | MEMBER | Testar `/portal` e módulos do aluno |
| `portalteologicoos@gmail.com` | MEMBER | Segunda conta de aluno, se precisar de dois usuários ao mesmo tempo |

Não existe hoje nenhuma conta com `GLOBAL_ADMIN` ou `SECTOR_ADMIN`. Os três papéis de staff têm exatamente o mesmo acesso em todo o sistema — não há hierarquia diferenciada implementada ainda entre eles (diferente do modelo de 5 níveis do projeto `igrejas-web-system-os`, que é outro sistema). Testar com a conta LOCAL_ADMIN cobre o comportamento de "staff" por completo.

### 0.4 Cartão de teste do Mercado Pago (sandbox)

- **Número:** 5031 4332 1540 6351 (Mastercard) · **Validade:** 11/30 · **CVV:** 123
- **CPF do titular:** 123.456.789-09
- **Nome do titular = `APRO`** → pagamento aprovado
- **Nome do titular = `OTHE`** → pagamento recusado (erro geral)

### 0.5 Mudança de modelo de dados a observar

Antes, `ead_alunos` guardava um curso por pessoa. Agora `ead_alunos` é só a identidade (1 linha por CPF) e cada curso feito vira uma linha em `ead_matriculas`. Ao testar, repare que:
- O mesmo CPF pode aparecer em mais de uma matrícula (cursos diferentes).
- O mesmo CPF **não pode** ter duas matrículas `EM_ANDAMENTO`/`APROVADO` no **mesmo** curso — só se a anterior foi `REPROVADO`/`CANCELADO`.

---

## 1. Módulo Institucional / Público

- [ ] `/` carrega, mostra os 4 números reais e o menu tem "Loja"
- [ ] `/sobre` carrega e mostra o bloco de Diretoria (7 grupos)
- [ ] Header público tem a mesma largura em todas as páginas públicas
- [ ] Layout responde bem em mobile

## 2. Módulo Autenticação

- [ ] `/login` carrega com o design padronizado; login com `igrejaswebos@gmail.com` funciona e redireciona para `/portal`
- [ ] Usuário logado que tenta acessar `/login` é redirecionado para `/portal`
- [ ] `/cadastro` cria conta nova (e-mail de teste real) → confirma e-mail → `/auth/callback` → `/portal`
- [ ] Novo usuário criado por `/cadastro` nasce com `system_role = MEMBER`
- [ ] Convite por e-mail (aprovação de inscrição ou matrícula direta) leva a `/definir-senha` e consegue logar depois

## 3. Módulo Inscrição EAD — curso gratuito

- [ ] `/inscricao` carrega, select de curso mostra o preço da matrícula só em "Teologia — Nível Básico"
- [ ] Preencher com `TESTE QA — APAGAR (gratuito)`, curso **Treinamento** → enviar → vai direto para `/inscricao/obrigado`
- [ ] Aparece em `/admin/inscricoes` com status `PENDENTE`

## 4. Módulo Inscrição EAD — matrícula paga (Mercado Pago)

- [ ] `TESTE QA — APAGAR (pago aprovado)`, curso **Teologia — Nível Básico** → pagar com titular `APRO` → `/inscricao/pagamento/[id]` mostra "Pagamento confirmado!" → vira `PENDENTE` em `/admin/inscricoes` com "Matrícula paga: R$ 25,00"
- [ ] Repetir com titular `OTHE` → "Pagamento não aprovado", status `PAGAMENTO RECUSADO`, sem botões de aprovar/rejeitar
- [ ] Confirmar que Mariana, Carlos e Fernanda continuam `PENDENTE`

## 5. Módulo Secretaria — aprovar/rejeitar inscrições

Use só as inscrições `TESTE QA — APAGAR` dos módulos 3 e 4.

- [ ] "Aprovar e gerar matrícula" na inscrição gratuita de teste → gera matrícula, cria `ead_alunos` (se CPF novo) + `ead_matriculas` (status `EM_ANDAMENTO`), convite chega por e-mail
- [ ] Repetir a inscrição de aprovação com o **mesmo CPF** de um teste anterior, **mesmo curso** (Teologia Básico) e tentar aprovar → deve **bloquear** com a mensagem de matrícula já em andamento/aprovada neste curso
- [ ] Com o mesmo CPF mas **curso diferente** → deve aprovar normalmente (reaproveita a identidade em `ead_alunos`, cria nova linha em `ead_matriculas`)
- [ ] "Rejeitar" na inscrição paga-aprovada de teste → status `REJEITADA`
- [ ] `/admin/inscricoes` bloqueado para MEMBER e para deslogado

## 5-B. Módulo Matrícula Direta (novo)

- [ ] `/admin/matriculas` lista todas as matrículas (inscrição pública + diretas), com status e origem
- [ ] `/admin/matriculas/nova`: preencher ficha completa (RG, nascimento, gênero, estado civil, escolaridade, profissão, endereço via CEP, filiação) + CPF de teste novo + selecionar um curso (ex: Diaconato) → "Gerar matrícula" → cria aluno + matrícula direta, convite de acesso enviado
- [ ] Tentar matricular o **mesmo CPF** no **mesmo curso** de novo → deve bloquear com a mensagem de matrícula já em andamento/aprovada
- [ ] Tentar matricular o mesmo CPF em **outro** curso → deve funcionar, reaproveitando a identidade (não reenvia convite se o aluno já tem login)
- [ ] Acesso restrito para MEMBER e deslogado

## 6. Módulo Portal do Aluno (hub)

- [ ] `/portal` carrega com os 6 cards: Igreja, Escola Teológica, Cursos & Treinamentos, EBD, Meus Certificados, **Simulados e Provas**

## 7. Módulo Escola Teológica

- [ ] `/escola` lista os cursos do módulo (todos em `DRAFT` hoje — confirmar se isso é esperado ou se a listagem deveria mostrar DRAFT também)
- [ ] `/escola/[id]` abre o curso e lista as aulas

## 8. Módulo Cursos & Treinamentos

- [ ] `/cursos` lista os 9 cursos preparatórios + Homilética + EBOM, todos `PUBLISHED`
- [ ] `/cursos/[id]` abre um curso e mostra as aulas

## 9. Módulo EBD

- [ ] `/ebd` carrega — **ainda não há trimestre cadastrado** (`ebd_quarters` vazia); esperado mostrar estado vazio

## 10. Módulo Certificados

- [ ] `/admin/certificados` lista alunos elegíveis e emite certificado de teste (número `CETADP-CERT-2026-000X`)
- [ ] `/portal/certificados` mostra o certificado emitido para o dono
- [ ] `/certificados` (público) valida pelo número; número inexistente retorna "não encontrado" sem erro

## 11. Módulo Loja

- [ ] `/loja` lista os produtos ativos (9 cursos avulsos R$40, Homilética R$150, livro R$45, PDF grátis, PDF pago R$30)
- [ ] Carrinho → checkout → login se necessário → pagar com `APRO` → `/loja/pedido/[id]` "Pagamento confirmado!"
- [ ] Curso avulso comprado libera `enrollment` automático; item físico aparece em `/admin/pedidos` como `AGUARDANDO_ENVIO`
- [ ] Staff marca pedido físico como enviado/entregue

## 12. Módulo Biblioteca

- [ ] `/biblioteca` lista PDFs; PDF pago bloqueado sem compra; PDF grátis liberado para qualquer logado
- [ ] Após comprar a Apostila (módulo 11), link de acesso libera via URL assinada

## 13. Módulo Igreja / Dashboard (legado)

- [ ] Logado como staff, `/dashboard` e subrotas (membros, igrejas, ocorrências, configurações) abrem normalmente
- [ ] **Logado como MEMBER, `/dashboard` (ou qualquer subrota) deve mostrar "Acesso restrito"** — esta é a correção da rodada anterior; confirmar que está valendo

## 14. Módulo Financeiro (novo)

- [ ] `/admin/financeiro` mostra saldo do caixa de hoje (ou "Ainda não aberto"), entradas/saídas do dia e atalhos
- [ ] `/admin/financeiro/plano-de-contas` lista as 12 categorias seed (5 receitas, 7 despesas); criar uma categoria nova; desativar/ativar uma existente
- [ ] `/admin/financeiro/caixa`: abrir o caixa do dia (saldo inicial sugerido = saldo final do último dia fechado, ou R$0 se nunca fechou); lançar uma ENTRADA e uma SAÍDA com categorias diferentes; conferir que o saldo atual bate (inicial + entradas − saídas)
- [ ] Fechar o caixa do dia → status vira `FECHADO`, saldo final calculado e exibido
- [ ] Tentar abrir o caixa de novo no mesmo dia → deve bloquear ("caixa de hoje já foi aberto")
- [ ] Acesso restrito para MEMBER e deslogado em todas as telas do financeiro

## 15. Módulo Patrimônio / Inventário (novo)

- [ ] `/admin/patrimonio` mostra o total de bens e valor total (ativos)
- [ ] Cadastrar um bem de teste (categoria, valor de aquisição, vida útil, taxa de depreciação) → gera número de tombamento `TOMB-00000X` automaticamente
- [ ] Registrar uma movimentação de **Transferência** → localização do bem atualiza
- [ ] Registrar uma **Manutenção** → status do bem vira `EM_MANUTENCAO`; depois **Retorno de manutenção** → volta para `ATIVO`
- [ ] Registrar uma **Baixa** → status vira `BAIXADO` e o bem some do total "ativos" no topo da página
- [ ] Acesso restrito para MEMBER e deslogado

## 16. Módulo Simulados e Provas (novo, sem IA)

Use uma matrícula de teste com curso **Teologia — Nível Básico** (único curso com banco de questões seed, 12 perguntas).

- [ ] Logado como o aluno dono da matrícula, `/portal/avaliacoes` mostra a matrícula com opções de Simulado e Prova
- [ ] Fazer um **Simulado** de 10 questões → responder tudo → finalizar → nota exibida na hora; simulado **não** muda o status da matrícula
- [ ] Refazer o simulado (com 15 ou 20 questões) → deve permitir sem limite
- [ ] Iniciar a **Prova** sem marcar a caixa de confirmação → deve bloquear
- [ ] Marcar a confirmação e iniciar a prova → responder todas as 10 questões → finalizar → nota exibida, `aprovado`/`reprovado` conforme nota ≥ 6,0
- [ ] Conferir que a matrícula em `/admin/matriculas` mudou de `EM_ANDAMENTO` para `APROVADO` ou `REPROVADO` conforme o resultado
- [ ] Tentar iniciar a prova de novo na mesma matrícula → deve bloquear ("só é permitida uma tentativa")
- [ ] Se a prova resultou em `REPROVADO`: tentar matricular esse mesmo CPF de novo no mesmo curso (via `/admin/matriculas/nova` ou aprovando uma nova inscrição) → **deve permitir**, pois a regra libera reprovados
- [ ] Testar com uma matrícula de curso **sem** banco de questões (ex: Diaconato) → tela deve avisar "ainda não há banco de questões cadastrado para este curso", sem erro feio

## 17. RBAC — matriz de acesso por papel

| Rota | MEMBER | Staff (LOCAL_ADMIN) |
|---|---|---|
| `/admin/inscricoes`, `/admin/certificados`, `/admin/pedidos`, `/admin/conteudo` | Acesso restrito | Acessa |
| `/admin/matriculas`, `/admin/matriculas/nova` | Acesso restrito | Acessa |
| `/admin/financeiro/*` | Acesso restrito | Acessa |
| `/admin/patrimonio` | Acesso restrito | Acessa |
| `/dashboard/*` | **Acesso restrito (corrigido)** | Acessa |
| `/dashboard/configuracoes/acessos/usuarios` | Acesso restrito | Acessa |
| `/portal`, `/portal/avaliacoes` | Acessa (dados só do próprio aluno) | Acessa |

- [ ] Confirmar cada linha acima com as contas da seção 0.3

## 18. Nota sobre módulos só de schema (sem tela ainda)

- **Turmas/edições anuais (`course_editions`)**: continua sem tela de cadastro — só inspecionável via Supabase direto.
- **Provas dissertativas + correção por IA**: arquitetura pronta (`gerarQuestoes()` isolado em `src/utils/avaliacoes/gerador.ts`), mas desativada até a `ANTHROPIC_API_KEY` ser configurada — por enquanto só múltipla escolha.

## 19. Resumo final

- [ ] Todos os itens acima revisados
- [ ] Lista de bugs encontrados:
  1.
  2.
  3.
- [ ] Limpeza: dados de teste identificados por "TESTE QA — APAGAR" podem ser apagados ou deixados como estão
- [ ] Confirmado que Mariana, Carlos e Fernanda continuam `PENDENTE` para o pitch
- [ ] Pronto para seguir com a tarefa #28 (migração para igrejas-web-system-os)
