# Erros Comuns de IA — Portal Teológico OS

Registre aqui somente padrões de falha recorrentes e suas prevenções. Não inclua segredos, credenciais ou dados pessoais.

| Data | Área | Padrão de erro | Causa confirmada | Prevenção obrigatória | Evidência | Estado |
|---|---|---|---|---|---|---|
| 2026-09-10 | Supabase/RLS | Policy consulta diretamente a própria tabela e causa recursão infinita | Auto-referência em policy de `profiles` | Usar função `SECURITY DEFINER`, `search_path` fixo e teste como `authenticated` | Migrations 048–050 e `AGENTS.md` | Controlado |

## Regra de registro

Adicione uma linha quando a mesma classe de erro ocorrer novamente ou quando uma prevenção reutilizável for confirmada. Vincule commit, teste, migration, issue ou evidência correspondente.
