-- Correção: o REVOKE de INSERT/UPDATE/DELETE para `authenticated` na
-- migração 010 bloquearia também a secretaria (staff), já que no
-- Postgres/Supabase todo usuário logado usa a mesma role `authenticated`
-- — quem diferencia staff de aluno é só a política RLS, não a role.
-- Repondo os grants de tabela; a segurança continua inteiramente nas
-- políticas certificates_write_staff/update_staff/delete_staff.
GRANT INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
