# Erros Comuns de IA — Portal Teológico OS

Registre aqui somente padrões de falha recorrentes e suas prevenções. Não inclua segredos, credenciais ou dados pessoais.

| Data | Área | Padrão de erro | Causa confirmada | Prevenção obrigatória | Evidência | Estado |
|---|---|---|---|---|---|---|
| 2026-09-10 | Supabase/RLS | Policy consulta diretamente a própria tabela e causa recursão infinita | Auto-referência em policy de `profiles` | Usar função `SECURITY DEFINER`, `search_path` fixo e teste como `authenticated` | Migrations 048–050 e `AGENTS.md` | Controlado |
| 2026-09-12 | Organização de pastas / DevOps | Código novo (migrations, actions, telas) escrito na pasta de produção (`portal-teologico-os`) em vez da pasta staging (`portal-teologico-os-staging`); numeração de migration nova colidiu com migrations já existentes na pasta correta (`095`/`096` já usados por `ministerios`/`campo_ministerio_id`) | A regra de ambientes já estava documentada em `AGENTS.md`, mas a seção ficava no meio do arquivo (não logo no início) e não foi consultada antes de começar o trabalho; numeração da migration nova foi decidida sem conferir o `Glob` da pasta staging | Seção "Ambientes" movida pro início do `AGENTS.md` (logo após "Área obrigatória de trabalho"); antes de numerar migration nova, sempre conferir o maior número já existente na pasta staging via `Glob`; skill de conta "confirmar-ambiente-antes-de-codar" força essa checagem em toda sessão, em qualquer projeto | Migrations `099`/`100` (renumeradas de `095`/`096`), código copiado pra `portal-teologico-os-staging` em 12/09/2026 | Controlado |

## Regra de registro

Adicione uma linha quando a mesma classe de erro ocorrer novamente ou quando uma prevenção reutilizável for confirmada. Vincule commit, teste, migration, issue ou evidência correspondente.
