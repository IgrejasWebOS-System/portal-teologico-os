-- BUG DE SEGURANÇA CORRIGIDO: handle_new_user() inseria TODO usuário novo
-- com system_role = 'LOCAL_ADMIN', que é um papel de staff (checkIsStaff
-- trata GLOBAL_ADMIN/SECTOR_ADMIN/LOCAL_ADMIN como admin). Ou seja, todo
-- aluno aprovado virava administrador com acesso a /admin/conteudo.
-- Corrige o default para 'MEMBER' (não-staff, já permitido pelo check
-- constraint profiles_system_role_check) e migra os 2 perfis de teste de
-- aluno que foram afetados. A conta real da secretaria
-- (igrejaswebos@gmail.com) foi mantida como LOCAL_ADMIN.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, system_role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'MEMBER');
  RETURN new;
END;
$function$;

UPDATE profiles
SET system_role = 'MEMBER'
WHERE email IN ('joaquimmscoelhoam@gmail.com', 'portalteologicoos@gmail.com')
  AND system_role = 'LOCAL_ADMIN';
