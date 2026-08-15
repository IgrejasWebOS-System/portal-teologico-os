-- 074_profiles_locale.sql
-- Fase 0 do i18n (pt-BR / en-US / es-419): preferencia de idioma por usuário.
-- Coluna puramente de apresentação — não influencia RLS, admin_roles nem
-- nenhuma regra de autorização. Default pt-BR preserva o comportamento
-- atual para todo usuário já existente.

alter table public.profiles
  add column if not exists locale text not null default 'pt-BR';

alter table public.profiles
  add constraint profiles_locale_check
  check (locale in ('pt-BR', 'en-US', 'es-419'));

comment on column public.profiles.locale is
  'Idioma preferido do usuário para a interface (pt-BR | en-US | es-419). Sincronizado com o cookie NEXT_LOCALE no login.';
