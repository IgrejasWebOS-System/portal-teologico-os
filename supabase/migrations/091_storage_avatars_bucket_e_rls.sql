-- ============================================================
-- Bucket "avatars" (fotos de alunos/professores) — existia em
-- produção sem estar rastreado por nenhuma migration (mesma
-- categoria de dado que baseline nunca versionado, ver 058) e sem
-- NENHUMA policy de RLS em storage.objects, então o upload direto
-- pelo client autenticado (Nova Matrícula, admin/matriculas/nova)
-- sempre falhava silenciosamente com "Erro no upload da foto" —
-- só não travava tudo porque o outro fluxo (Confirmar Cadastro)
-- usa o client admin/service_role, que ignora RLS.
--
-- Cria o bucket (idempotente — no-op se já existir, cobre
-- produção) e adiciona a policy de staff que faltava, no mesmo
-- padrão já usado em biblioteca-pdfs.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_staff_all" on storage.objects;
create policy "avatars_staff_all" on storage.objects
for all
using (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
)
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
);

-- Leitura pública explícita também (bucket já é "public", mas isso
-- só libera a URL pública direta — sem essa policy, uma eventual
-- leitura autenticada via API/listagem continuaria bloqueada).
drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select" on storage.objects
for select
using (bucket_id = 'avatars');
