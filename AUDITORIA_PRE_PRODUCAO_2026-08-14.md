# Auditoria pré go-live — CETADP Portal EAD

**Data:** 14/08/2026 · **Go-live com cliente:** 20/08/2026 (6 dias)
**Escopo:** comparação `portal-teologico-os` (produção) vs `portal-teologico-os-staging` (staging), banco Supabase, Vercel, CI/GitHub Actions.

---

## 1. Confirmação da arquitetura (decisão do usuário)

- **GitHub:** repositório único `IgrejasWebOS-System/portal-teologico-os`, branch `main` = produção.
- **Supabase:** projeto único de produção (`toduvwtzklntyptcodkf`) **+** uma branch Supabase isolada `staging` (`cjxdroyyplpknygtcdgr`), criada na sessão anterior — mantida por decisão explícita do usuário (recomendado), mesmo custando ~R$0,07/hora enquanto existir, para não expor dados reais do CETADP (CPF, membros, pagamentos) a testes locais.
- **Vercel:** projeto único `portal-teologico-os`, Production dispara em push/merge na `main`, Preview dispara em push de qualquer outra branch.
- **Local:** `C:\Projetos\portal-teologico-os` (produção) e `C:\Projetos\portal-teologico-os-staging` (dev/teste), regra documentada em `AGENTS.md`.
- **Backup:** local + SSD externo + nuvem (OneDrive) via `scripts/backup-portal-teologico.ps1`, rodado manualmente até agora — **agendamento automático no Windows ainda não existe** (ver item 7).

---

## 2. Achados corrigidos nesta auditoria

### 2.1 `.env.example` sumia em clones novos (CRÍTICO — corrigido)
Causa raiz: `.gitignore` tinha o padrão `.env*`, que **também bloqueava `.env.example`** de ser versionado — apesar de ser um arquivo-modelo (sem segredo nenhum) que deveria estar no git. Resultado prático: a pasta staging, clonada do zero, ficou sem nenhuma documentação de quais variáveis de ambiente o projeto precisa.
**Corrigido** (só na pasta staging, aguardando PR): `.gitignore` ganhou a exceção `!.env.example`, e o arquivo foi recriado em `portal-teologico-os-staging/.env.example`.

### 2.2 Migrations 040 e 041 com UUID fixo (CRÍTICO — corrigido)
Mesmo bug já corrigido na migration 014 na sessão anterior, mas que continuava presente em:
- `040_seed_questoes_curso_medio.sql` — UUID fixo do curso "Curso Teológico Médio".
- `041_demo_aluno_com_simulados_e_provas.sql` — UUID fixo do curso "Curso Teológico Médio", "Curso Teológico Básico" e do campo "Campo Piracicaba Sede".

Um UUID fixo quebra a aplicação da migration em qualquer ambiente novo (branch, restauração de desastre, projeto novo), porque esses IDs são gerados dinamicamente toda vez que as migrations 005/006/008 rodam. **Corrigido**: os dois arquivos agora buscam o ID por nome/título (`SELECT id FROM courses WHERE title = '...'`), igual ao padrão já usado na 014.

### 2.3 `.env.local` da staging criado
Apontando para a branch Supabase `staging` (URL + anon key já preenchidos). **Falta você colar a `SUPABASE_SERVICE_ROLE_KEY` da branch** — não posso obter essa chave por ferramenta automatizada por política de segurança. Pegue em:
`https://supabase.com/dashboard/project/cjxdroyyplpknygtcdgr/settings/api-keys` (com a branch **staging** selecionada no topo do painel).

---

## 3. Achados pendentes (precisam de você ou de acesso que não tenho nesta sessão)

### 3.1 Migrations 030–039: existem em produção, mas nunca foram versionadas no git (ALTO)
Consultei diretamente o histórico de migrations rastreadas do Supabase de produção (`list_migrations`) e descobri que produção tem 10 migrations aplicadas pela esteira oficial que **não existem como arquivo em nenhuma das duas pastas locais**:
`030_financeiro_contas_a_pagar`, `031_curriculo_real_teologico_basico_medio`, `032_matriculas_demo_alunos_teologico`, `033_caixa_diario_demo`, `034_ajuste_contas_receber_maior_que_pagar`, `035_patrimonio_demo_carro_computador`, `036_certificado_demo_visual`, `037_estoque_movimentacoes_produtos`, `038_leads_loja_funil_status`, `039_limite_simulados_por_matricula`.

**Risco real:** baixo para desastre total (o `pg_dump` completo do backup já captura o schema real, independente da pasta de migrations). **Risco médio** para qualquer processo que dependa só dos arquivos locais (ex: criar um projeto Supabase novo do zero via `supabase db push`, sem ser branch) — ficaria com schema incompleto.
**Recomendação:** reconstruir esses 10 arquivos a partir de um `pg_dump --schema-only` da produção (o próprio script de backup já gera isso) antes do go-live, pra pasta `supabase/migrations/` voltar a ser fonte da verdade completa. Não fiz essa reconstrução agora porque exigiria acesso ao arquivo de dump mais recente, que fica salvo no OneDrive/HD externo, fora das pastas que tenho acesso nesta sessão.

### 3.2 Conector Vercel ainda sem escopo correto (MÉDIO)
`list_teams` encontra a organização (`igrejasweboss-projects`), mas `list_projects`/`get_project` retornam vazio/404 para o projeto real. Não consegui auditar variáveis de ambiente de produção nem status de deployments pela ferramenta. **Ação:** reconectar o conector Vercel (mesmo fluxo de reconexão que você já fez pro Supabase) ou conferir manualmente em vercel.com se as env vars de produção (as mesmas 8 do `.env.example`) estão todas cadastradas no projeto.

### 3.3 GitHub Actions Secrets — só 1 de 8 cadastrados (ALTO, bloqueia o fluxo que combinamos)
O `ci.yml` roda em todo Pull Request pra `main` e precisa de 8 secrets pra passar o `npm run build`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
Só `RESEND_API_KEY` foi cadastrado até agora. **Sem os outros 7, todo PR pra `main` vai falhar no CI** — trava exatamente o fluxo branch→push→preview→merge que combinamos. Não tenho conector do GitHub nesta sessão pra cadastrar por você; cadastre em **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, usando os valores de produção (não os de teste/sandbox).

### 3.4 Backup automático do Windows ainda não está agendado (MÉDIO)
Você mencionou "vamos programar o Windows para fazer esse backup de forma automática, com agendamento" — isso ainda não existe, o backup rodou manualmente até agora. Comando pra criar a tarefa agendada (diária, às 22h) está no item 7 abaixo.

### 3.5 Arquivo órfão `CETADEP_PORTAL_EAD.md` (BAIXO, cosmético)
Existe em produção e em staging um arquivo `CETADEP_PORTAL_EAD.md` cujo único conteúdo é um aviso de que ele foi substituído por `CETADP_PORTAL_EAD.md` (erro de digitação no nome da instituição, já corrigido em 13/07). Não apago automaticamente por política (nunca faço exclusão permanente sem confirmação) — pode apagar os dois manualmente quando quiser, ou me avisar que confirma a exclusão.

### 3.6 Não consegui rodar build/typecheck nesta sessão (bloqueio técnico)
O sandbox Linux desta sessão está indisponível (`HYPERVISOR_VIRT_DISABLED`), então não consegui rodar `npx tsc --noEmit` / `npm run build` pra validar as correções de fato compilando. **O script abaixo faz isso por você.**

---

## 4. O que fazer agora — um único script

Rode isto no PowerShell (Windows), do início ao fim:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Projetos\portal-teologico-os-staging\scripts\fix-2026-08-14-auditoria.ps1"
```

O script: cria uma branch nova a partir de `main` atualizada, adiciona só os 4 arquivos corrigidos (`.gitignore`, `.env.example`, `040_...sql`, `041_...sql`), commita, dá push, e roda `tsc --noEmit` + `lint` + `build` pra validar que compila antes de você abrir o PR. Segue exatamente o fluxo branch → push → Preview → validar → merge que já está em `AGENTS.md`.

---

## 5. Checklist final antes do dia 20/08

- [ ] Rodar o script do item 4 e confirmar que build/lint/typecheck passam
- [ ] Colar a `SUPABASE_SERVICE_ROLE_KEY` da branch staging em `portal-teologico-os-staging\.env.local`
- [ ] Abrir o PR gerado, validar o Vercel Preview, fazer merge em `main`
- [ ] Cadastrar os 7 secrets faltantes no GitHub Actions (item 3.3)
- [ ] Reconectar/conferir o Vercel (item 3.2) — env vars de produção completas
- [ ] Reconstruir migrations 030–039 a partir do `pg_dump` mais recente (item 3.1)
- [ ] Agendar o backup automático no Windows (item 7)
- [ ] Rodar `npm run dev` na staging e validar o fluxo de compra ponta a ponta (webhook Mercado Pago sandbox → e-mail Resend) antes de repetir em produção
- [ ] Página `/recuperar-senha` (aprovada, ainda não construída) — decidir se entra antes ou depois do dia 20

---

## 6. O que já está confirmado seguro

- Staging (branch Supabase) 100% espelhada com produção: 48 tabelas, RLS habilitado em todas, 73 migrations aplicadas.
- Advisors de segurança de **produção** revisados agora: só avisos estruturais pré-existentes (search_path mutável em 3 funções, algumas `SECURITY DEFINER` chamáveis por `anon`/`authenticated`, e "Leaked Password Protection" desligado no Auth) — nada crítico, mas vale ligar o "Leaked Password Protection" antes do go-live (Supabase Dashboard → Authentication → Policies).
- E-mail transacional (Resend + domínio `cetadp.teo.br`) verificado e testado ponta a ponta.
- Duplicidade de conta (`joaquimmscoelho@gmail.com`) removida.

---

## 7. Comando para agendar o backup automático (Windows Task Scheduler)

Rode no PowerShell **como Administrador**, de dentro de `C:\Projetos\portal-teologico-os`:

```powershell
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Projetos\portal-teologico-os\scripts\backup-portal-teologico.ps1`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 22:00
Register-ScheduledTask -TaskName "Backup Portal Teologico CETADP" -Action $Action -Trigger $Trigger -Description "Backup diario (local + SSD externo + nuvem + Supabase) do portal-teologico-os" -RunLevel Highest
```

Isso cria uma tarefa que roda todo dia às 22h. Pra testar imediatamente sem esperar o horário: abra o Agendador de Tarefas do Windows, ache "Backup Portal Teologico CETADP" e clique em "Executar".
