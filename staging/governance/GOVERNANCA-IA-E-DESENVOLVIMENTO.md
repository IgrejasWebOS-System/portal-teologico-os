# Governança de IA e Desenvolvimento — Portal Teológico OS

## 1. Objetivo

Este documento estabelece o processo obrigatório para mudanças assistidas por IA no Portal Teológico OS. Ele complementa o `AGENTS.md` e preserva as regras específicas de Next.js, RLS, Supabase, Vercel, LGPD e separação entre staging e produção.

## 2. Fontes de verdade

1. Código, migrations e testes versionados.
2. `AGENTS.md` da raiz e instruções mais específicas de subdiretórios.
3. Decisões e evidências registradas em `staging/`.
4. Histórico Git e Pull Requests.
5. Memória da IA apenas como contexto auxiliar, nunca como autoridade operacional.

## 3. Estrutura obrigatória de staging

- `staging/plans/`: escopo, critérios de aceite, riscos e rollback antes da execução.
- `staging/decisions/`: ADRs e decisões arquiteturais permanentes.
- `staging/evidence/`: resultados de testes, auditorias, screenshots sanitizados e validações.
- `staging/governance/`: políticas, checklists e padrões de falha recorrente.

Código-fonte continua em `src/` e migrations continuam exclusivamente em `supabase/migrations/`.

## 4. Processo cronológico M0–M4

### M0 — Entrada

- Definir objetivo, escopo, itens fora do escopo e critérios de aceite.
- Identificar dados pessoais, autenticação, autorização, RLS, pagamentos e integrações afetadas.
- Registrar plano quando a mudança não for trivial.

### M1 — Estrutura

- Ler a documentação do Next.js instalada antes de usar APIs sujeitas a mudanças.
- Revisar contratos TypeScript, limites de módulo, migrations e compatibilidade.
- Definir testes, observabilidade e rollback antes da implementação.

### M2 — Execução

- Implementar a menor alteração coerente.
- Executar `npm run lint`, `npm run type-check` e `npm run build`.
- Para RLS, testar como usuário `authenticated`; execução como `service_role` não constitui evidência.
- Para fluxos críticos, executar integração/E2E e casos negativos de autorização.

### M3 — Conformidade

- Registrar comandos, resultados, riscos residuais e evidências em `staging/evidence/`.
- Executar auditoria de dependências, segredos e licenças aplicável.
- Registrar dívida técnica com severidade, responsável, prazo e critério de encerramento.

### M4 — Liberação

- Exigir vulnerabilidades Críticas conhecidas = 0 e Altas conhecidas = 0.
- Exigir segredos expostos = 0 e controles obrigatórios aprovados = 100%.
- Exigir dívida Crítica/Alta vencida = 0, dívida sem responsável = 0 e crescimento líquido da dívida na entrega <= 0.
- Validar local, Vercel Preview e Supabase staging antes do Pull Request para `main`.
- Promover a produção somente por Pull Request, preservando rollback e evidências.

## 5. Segurança e conformidade

- Aplicar privilégio mínimo e negação por padrão.
- Nunca confiar em `role`, identificador territorial ou escopo recebido diretamente do navegador.
- Proibir policies RLS que consultem diretamente a própria tabela; usar função `SECURITY DEFINER` revisada, `search_path` fixo e teste autenticado.
- Manter `service_role` somente no servidor e fora de logs, screenshots, prompts e documentação.
- Minimizar dados pessoais e sanitizar evidências conforme a LGPD.
- Revisar dependências e licenças antes de introduzir novo pacote.

## 6. Exceções

Vulnerabilidade Crítica não admite exceção para produção. Uma exceção emergencial de severidade Alta deve conter justificativa técnica, impacto, controles compensatórios verificáveis, responsável nominal, prazo máximo, aprovação formal e bloqueio automático após vencimento.

## 7. Critério de conclusão

Uma tarefa somente está concluída quando alteração, testes, segurança, documentação, evidência e estado Git forem verificáveis. Resultado presumido, memória da IA ou compilação isolada não substituem evidência proporcional ao risco.
