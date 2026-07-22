-- 047_ebd_write_staff.sql
-- ebd_quarters/ebd_lessons só tinham política de leitura (authenticated).
-- Necessário pra construir o admin de EBD (cadastro de trimestre/lições):
-- staff (GLOBAL_ADMIN/SECTOR_ADMIN/LOCAL_ADMIN) ganha permissão de
-- escrita nas duas tabelas.

create policy ebd_quarters_write_staff on ebd_quarters
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.system_role in ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.system_role in ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

create policy ebd_lessons_write_staff on ebd_lessons
  for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.system_role in ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.system_role in ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));
