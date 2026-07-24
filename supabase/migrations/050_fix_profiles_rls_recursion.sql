-- Corrige "infinite recursion detected in policy for relation profiles",
-- causado pelas policies profiles_select_staff / profiles_update_global_admin
-- (migrations 048/049) consultando a propria tabela profiles dentro da RLS
-- dela mesma. Isso derrubou toda consulta que toca profiles (login,
-- checkIsStaff, etc.) tanto local quanto na Vercel.
--
-- Padrao correto: funcao SECURITY DEFINER, que roda com o dono da funcao
-- (bypassa RLS), le o system_role do usuario logado sem re-disparar a
-- policy que estamos avaliando.

drop policy if exists "profiles_select_staff" on public.profiles;
drop policy if exists "profiles_update_global_admin" on public.profiles;

create or replace function public.current_system_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select system_role from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_staff"
on public.profiles
for select
to authenticated
using (
  public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
);

create policy "profiles_update_global_admin"
on public.profiles
for update
to authenticated
using ( public.current_system_role() = 'GLOBAL_ADMIN' )
with check ( public.current_system_role() = 'GLOBAL_ADMIN' );
