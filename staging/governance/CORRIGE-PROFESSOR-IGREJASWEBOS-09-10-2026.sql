-- CORRIGE-PROFESSOR-IGREJASWEBOS-09-10-2026.sql  (v2, por id exato)
-- 09/10/2026, achado do Joaquim gravando video de cadastro: o professor
-- "JOAQUIM MARIO SOARES COELHO" (login igrejaswebos@gmail.com, SETOR 001)
-- entrou no /admin com menu de staff e /professor dizia "convite pendente".
-- Causa: a rotina antiga (grantNucleoAccess) promovia profiles.system_role a
-- LOCAL_ADMIN (vira "staff") e nunca gravava professores.user_id/email.
-- O codigo foi corrigido (PR proprio). Este SQL corrige o DADO ja gravado.
--
-- v1 abortou (guarda funcionou): professores.email estava NULO, entao a busca
-- por e-mail nao achou o cadastro. v2 usa os ids exatos mapeados em
-- 09/10/2026 (somente leitura):
--   profiles / auth.users  0313b433-9d2e-4502-8ad4-78379231430c (igrejaswebos@gmail.com, LOCAL_ADMIN)
--   admin_roles            nivel 4 / CETADP / unidade 65ea05cf-f2ff-4da3-b40f-8e94df394f39
--   professores            6ff1f5af-ef7f-4ffd-86e6-b7a70f485d24 (email nulo, user_id nulo, PENDENTE)
--
-- NAO e migration. Backup ja feito (pre-corrige-professor). Atomico: se o
-- estado for diferente do esperado, aborta sem alterar nada.

do $$
declare
  v_user constant uuid := '0313b433-9d2e-4502-8ad4-78379231430c';
  v_prof constant uuid := '6ff1f5af-ef7f-4ffd-86e6-b7a70f485d24';
  v_unit constant uuid := '65ea05cf-f2ff-4da3-b40f-8e94df394f39';
  v_role text;
  n_altos int; n_prof int; n_outro_prof int;
begin
  select system_role into v_role from public.profiles
   where id = v_user and lower(email) = 'igrejaswebos@gmail.com';
  select count(*) into n_altos from public.admin_roles where user_id = v_user and level <= 3;
  select count(*) into n_prof from public.professores
   where id = v_prof and user_id is null and unit_id = v_unit;
  select count(*) into n_outro_prof from public.professores where user_id = v_user;

  if v_role is distinct from 'LOCAL_ADMIN' or n_altos <> 0 or n_prof <> 1 or n_outro_prof <> 0 then
    raise exception 'Estado diferente do esperado (system_role=%, acessos nivel 0-3=%, professor=%, ja vinculado=%). Nada foi alterado.',
      v_role, n_altos, n_prof, n_outro_prof;
  end if;

  update public.profiles set system_role = 'MEMBER' where id = v_user;
  update public.professores
     set user_id = v_user, email = 'igrejaswebos@gmail.com',
         convite_status = 'ENVIADO', convite_erro = null
   where id = v_prof;

  raise notice 'Corrigido: system_role=MEMBER e professor vinculado ao login.';
end
$$;

-- Verificacao (esperado: system_role = MEMBER, professor_vinculado = 1):
select p.email, p.system_role,
       (select count(*) from public.professores pr where pr.user_id = p.id) as professor_vinculado
  from public.profiles p
 where p.id = '0313b433-9d2e-4502-8ad4-78379231430c';
