# Relatório Técnico — Separação de Ambientes (Produção × Staging)
### Portal CETADP — Sistema `portal-teologico-os`

**Data:** 17/08/2026
**Autor:** Documentação técnica gerada com apoio de Claude (Anthropic), a pedido de Joaquim Coelho

---

## 1. Objetivo deste documento

Este relatório registra formalmente por que o desenvolvimento do Portal CETADP passou a ser feito em um ambiente separado de **staging** (`C:\Projetos\portal-teologico-os-staging`), em vez de ser feito diretamente na pasta de **produção** (`C:\Projetos\portal-teologico-os`). Não havia, até esta data, um documento único consolidando essa decisão — a regra estava registrada apenas de forma operacional em `AGENTS.md`, dentro do próprio repositório. Este relatório complementa aquele arquivo, explicando o raciocínio por trás da regra, não apenas o procedimento.

## 2. Contexto — o problema que motivou a mudança

Até meados de agosto de 2026, alterações de código e de banco de dados eram feitas diretamente na pasta e no projeto de produção. Esse modelo gerou riscos concretos, já observados neste projeto:

- **Erros de banco de dados sem aviso em tempo de compilação.** Um bug de recursão infinita em política de RLS (Row Level Security) na tabela `profiles` (migrations 048/049) derrubou o acesso a login e checagem de permissões — um erro que `npx tsc --noEmit` não detecta, porque é um problema de SQL/Postgres, não de TypeScript. Se essa mudança tivesse sido aplicada direto em produção, todo usuário (aluno, secretaria, admin) teria ficado sem conseguir logar.
- **Histórico de migrations incompleto.** Foi necessário reconstruir migrations (030 a 039) por introspecção direta do banco de produção, porque o histórico local não estava mais alinhado com o que realmente existia em produção — sintoma de mudanças aplicadas sem um processo de validação e registro consistente.
- **Auditoria de segurança revelou pontos de atenção** no projeto Supabase de produção que precisavam de correção controlada, não de tentativa-e-erro no ambiente que os usuários reais acessam.
- **Introdução de i18n (3 idiomas) e reestruturação de rotas** — a mudança mais estrutural já feita no projeto (mover toda a árvore de `src/app/` para `src/app/[locale]/`, reescrever o middleware de autenticação) é exatamente o tipo de alteração que, testada errado, pode travar o login de todo mundo, de qualquer nível de acesso, silenciosamente.

Cada um desses casos reforça o mesmo ponto: alterações de código e de banco neste projeto têm potencial de indisponibilizar o sistema inteiro (autenticação, RLS, roteamento) sem gerar um erro óbvio durante o desenvolvimento — o erro só aparece em produção, com usuários reais.

## 3. A decisão — ambiente de staging espelhado

A partir de 14/08/2026, ficou definida a seguinte separação fixa:

| Ambiente | Pasta local | Branch Git | Banco (Supabase) | Deploy |
|---|---|---|---|---|
| **Produção** | `C:\Projetos\portal-teologico-os` | `main` | Projeto principal (`toduvwtzklntyptcodkf`) | Vercel Production — dispara automaticamente a cada push/merge em `main` |
| **Staging / desenvolvimento** | `C:\Projetos\portal-teologico-os-staging` | qualquer branch que não seja `main` | Branch Supabase `staging`, criada a partir do projeto principal (dados isolados, mesma estrutura) | Vercel Preview — dispara automaticamente a cada push de qualquer branch |

O ponto central da solução é que o ambiente de staging é um **espelho estrutural** da produção — mesma stack, mesmas migrations, mesmo schema — mas com dados e infraestrutura de execução completamente isolados. Isso permite testar mudanças de verdade (incluindo mudanças de banco e de autenticação) sem qualquer risco para quem usa o sistema em produção.

## 4. Fluxo de trabalho obrigatório

1. Todo desenvolvimento acontece na pasta staging — nunca editar direto na pasta de produção.
2. Validação local primeiro (`npm run dev`, checagem em `http://localhost:3000`).
3. Commit e push sempre em uma branch nova — nunca direto em `main`.
4. Cada push gera automaticamente um Vercel Preview, usado para validar a mudança "no ar", fora do ambiente local, antes de prosseguir.
5. Mudanças em `supabase/migrations/` são testadas primeiro contra a branch Supabase `staging`, nunca diretamente contra o banco de produção.
6. Só depois de validado nas três camadas (local, Preview, banco de staging), a branch é mesclada em `main` — esse merge é o único gatilho que deve, de fato, tocar produção.

Esse fluxo está registrado em `AGENTS.md`, no repositório, como regra permanente — inclusive para o assistente de IA que atua no projeto, que deve segui-lo por padrão em qualquer tarefa futura, sem precisar ser lembrado a cada vez.

## 5. Benefícios já observados na prática

- A reestruturação de rotas para suportar 3 idiomas (pt-BR, en-US, es-419) — a mudança de maior risco já feita no projeto — pôde ser desenvolvida, testada e corrigida (incluindo um bug real de redirecionamento de usuários autenticados) inteiramente em staging, sem nenhum instante de indisponibilidade em produção.
- Erros de CI/CD (dependência não declarada, lockfile inconsistente, regra de lint) foram detectados e corrigidos no Preview do Vercel antes de qualquer merge — o pipeline de CI (checks automáticos no GitHub) funciona como uma segunda camada de validação, adicional à validação manual.
- Foi possível criar uma conta de teste com nível de acesso "staff" diretamente no banco de staging para validar fluxos administrativos, sem qualquer risco de essa conta de teste existir em produção.
- A auditoria de segurança do projeto de produção pôde ser conduzida e as correções necessárias, planejadas com calma, em vez de aplicadas sob pressão diretamente no ambiente ativo.

## 6. Situação atual

Este é o modelo de trabalho vigente no projeto desde 14/08/2026 e continua sendo aplicado a toda mudança em andamento, incluindo a implementação de internacionalização (i18n) em curso. Não havia, antes deste relatório, um documento único reunindo o raciocínio completo por trás dessa decisão — apenas a regra operacional em `AGENTS.md`. Este documento supre essa lacuna e pode ser usado como referência para apresentar a decisão à diretoria do CETADP ou a qualquer novo colaborador técnico que entre no projeto.
