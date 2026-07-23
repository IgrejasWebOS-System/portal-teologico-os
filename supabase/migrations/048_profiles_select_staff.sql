-- Corrige a Matriz de Usuários (/dashboard/configuracoes/acessos/usuarios):
-- a única policy de SELECT existente em profiles era profiles_select_own,
-- que só permite a cada usuário ver o próprio registro. Isso fazia a tela
-- (que lista todos os operadores) mostrar só o próprio usuário logado.
--
-- Segue o mesmo padrão já usado em sectors_write_staff / churches_write_staff:
-- staff (GLOBAL_ADMIN, SECTOR_ADMIN, LOCAL_ADMIN) pode ler todos os perfis.
create policy "profiles_select_staff"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
);
