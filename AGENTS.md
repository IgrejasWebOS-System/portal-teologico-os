<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RLS — regra obrigatória: nunca auto-referenciar a mesma tabela

Uma policy de RLS em `public.profiles` que consulta `public.profiles` dentro
dela mesma (ex: `exists (select 1 from profiles where id = auth.uid() and
system_role = ...)`) derruba a tabela inteira com `infinite recursion
detected in policy for relation "profiles"` — e isso quebra qualquer rota
que toque `profiles` (login, checagem de staff, etc.), local e em produção
ao mesmo tempo, sem nenhum erro de `tsc` ou de deploy pra avisar. Já
aconteceu uma vez neste projeto (migrations 048/049, corrigido em 050).

**Regra:** toda vez que uma policy de RLS precisar checar uma condição na
própria tabela em que a policy está (ex: "só GLOBAL_ADMIN pode ver todos os
perfis" numa policy de `profiles`), usar uma função `SECURITY DEFINER` como
intermediária, nunca uma subquery direta na mesma tabela:

```sql
create or replace function public.current_system_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select system_role from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_staff" on public.profiles
for select to authenticated
using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));
```

**Antes de considerar qualquer migração de RLS "pronta"**, testar de verdade
simulando um usuário autenticado (não só rodar a query como service role,
que ignora RLS):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-de-um-usuario-real>","role":"authenticated"}';
select ...; -- a query que a policy deveria proteger
rollback;
```

`npx tsc --noEmit` não pega esse tipo de erro — é um bug de SQL/Postgres,
não de TypeScript. Rodar apenas o tsc como critério de "pronto" não é
suficiente quando a mudança envolve RLS.
