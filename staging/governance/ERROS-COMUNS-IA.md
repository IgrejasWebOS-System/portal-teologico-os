# Erros Comuns de IA — Portal Teológico OS

Registre aqui somente padrões de falha recorrentes e suas prevenções. Não inclua segredos, credenciais ou dados pessoais.

| Data | Área | Padrão de erro | Causa confirmada | Prevenção obrigatória | Evidência | Estado |
|---|---|---|---|---|---|---|
| 2026-09-10 | Supabase/RLS | Policy consulta diretamente a própria tabela e causa recursão infinita | Auto-referência em policy de `profiles` | Usar função `SECURITY DEFINER`, `search_path` fixo e teste como `authenticated` | Migrations 048–050 e `AGENTS.md` | Controlado |
| 2026-09-10 | Documentação/AGENTS.md | Bloco inteiro de governança (Escopo e autoridade → Disciplina de desenvolvimento assistido por IA) duplicado em sequência no `AGENTS.md` | PR de IA (#22, commit `38f1d86`) gerou o novo bloco sem checar se o conteúdo já estava presente no arquivo final antes do commit | Antes de commitar edição em arquivo de governança/instrução, revisar o diff completo (não só o trecho adicionado) e confirmar que não há repetição do bloco inteiro | PR #22 (`main`), corrigido via branch `docs/corrige-governanca-duplicada` | Controlado |

## Regra de registro

Adicione uma linha quando a mesma classe de erro ocorrer novamente ou quando uma prevenção reutilizável for confirmada. Vincule commit, teste, migration, issue ou evidência correspondente.
