-- Habilita a ação "Editar nível" na Matriz de Usuários
-- (/dashboard/configuracoes/acessos/usuarios). Antes desta migração,
-- profiles não tinha NENHUMA policy de UPDATE — qualquer tentativa de
-- alterar system_role seria bloqueada silenciosamente pela RLS.
--
-- Restrito a GLOBAL_ADMIN (não a todo staff) porque alterar o nível de
-- acesso de outro usuário é uma ação sensível de escalonamento de
-- privilégio — consistente com o aviso já exibido na própria tela
-- ("Área restrita. Apenas administradores Master e Super Master...").
create policy "profiles_update_global_admin"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.system_role = 'GLOBAL_ADMIN'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.system_role = 'GLOBAL_ADMIN'
  )
);
