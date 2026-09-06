# Governança Global — ConnectionCyberOS

> Documento vivo. Esta primeira seção cobre o protocolo de desenvolvimento e
> versionamento, já em vigor. As demais seções (auditoria de igrejas/setores,
> planos de pagamento, padronização de formulários, domínio institucional
> etc.) serão adicionadas conforme cada decisão for fechada — ver backlog de
> tarefas em andamento no projeto.

## 1. Protocolo de Desenvolvimento e Versionamento — Staging-First

### 1.1 Estrutura de ambientes

| Ambiente | Pasta local | Branch git | Banco (Supabase) | Deploy |
|---|---|---|---|---|
| Produção | `{projeto}` | `main` | Projeto principal | Vercel Production — automático em push/merge na `main` |
| Staging/dev | `{projeto}-staging` | qualquer branch que não seja `main` | Branch Supabase `staging` | Vercel Preview — automático em push de qualquer branch |

Nenhum arquivo é alterado diretamente na pasta de produção. Todo
desenvolvimento, teste e validação acontece exclusivamente na pasta
staging.

### 1.2 Fluxo obrigatório

1. Alterar código somente na pasta staging.
2. Testar localmente (`npm run dev` / `localhost`) até validar o
   comportamento funcional, visual e estrutural.
3. Antes de qualquer commit, rodar `npx tsc --noEmit` e confirmar que não
   há erros de tipo. (Atenção: isso não cobre bugs de RLS/SQL — ver seção
   de regras técnicas no `AGENTS.md` de cada projeto.)
4. Commit → Push (branch nova, nunca direto em `main`) → Pull Request →
   revisão → Merge → Backup da produção → Deploy.
5. Produção só é tocada no passo de deploy — nunca para desenvolvimento ou
   teste direto.

### 1.3 Proteção técnica (branch protection)

A branch `main` de cada repositório de produção tem **"Require a pull
request before merging"** habilitado nas configurações do GitHub. Isso
bloqueia push direto na `main` de qualquer origem — é a barreira técnica
real por trás da regra "produção só recebe arquivo via merge".

Decisão registrada: **sem exigência de aprovação obrigatória**
("Require approvals" desmarcado). Motivo: o autor de um PR não pode
aprovar o próprio PR no GitHub — exigir aprovação travaria todo merge
esperando um segundo revisor que não existe neste projeto (equipe de uma
pessoa). A proteção de branch já garante a passagem pelo fluxo de PR, sem
adicionar espera manual desnecessária.

### 1.4 Auditoria de alterações

O histórico do git é a fonte da verdade — não existe (nem deve ser criado)
um arquivo de log paralelo. Para isso funcionar como auditoria pesquisável,
os commits seguem **Conventional Commits**:

```
tipo(escopo): descrição curta
```

com `tipo` em `feat | fix | chore | docs | refactor | test | style`.

### 1.5 Monitoramento pós-deploy

Sob pedido, não automático. Quando solicitado, verificar:
- Vercel: status do deployment, build logs, runtime errors.
- Supabase: advisors e logs de erro do ambiente correspondente.

### 1.6 Regras complementares de comunicação e conduta

- **Aviso antes, comando depois** — comunicar o comando/ação antes de
  executá-lo, especialmente quando houver efeito importante ou
  irreversível.
- **Nunca fabricar dado ou resultado** — verificar o estado real (banco,
  build, terminal, logs) antes de reportar qualquer coisa como certa ou
  resolvida.
- **Comunicação em português do Brasil** em toda documentação, commit, PR
  e interação.

### 1.7 Checklist de gate — M-Gate Versionamento

Antes de qualquer merge para produção, confirmar:

- [ ] Staging atualizado com a última mudança
- [ ] Testes locais aprovados (fluxo completo testado manualmente)
- [ ] `npx tsc --noEmit` sem erros
- [ ] Pull Request aberto e revisado
- [ ] Backup da produção realizado
- [ ] Deploy autorizado explicitamente
