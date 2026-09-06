-- Assinatura eletrônica simples (canvas) + PDF do formulário de matrícula.
-- Guardamos apenas o CAMINHO no storage (não a URL pública/assinada), porque
-- os buckets são privados — a URL de download é gerada sob demanda
-- (createSignedUrl), evitando link permanente pra um PDF com CPF/RG/endereço.

alter table public.ead_alunos
  add column if not exists assinatura_path text,
  add column if not exists assinatura_ip text,
  add column if not exists assinatura_user_agent text,
  add column if not exists assinado_em timestamptz,
  add column if not exists pdf_matricula_path text;

-- Buckets privados (não public=true como avatars — aqui tem CPF/RG/endereço)
insert into storage.buckets (id, name, public)
values ('assinaturas', 'assinaturas', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('matriculas-pdf', 'matriculas-pdf', false)
on conflict (id) do nothing;

-- Só staff (mesmo papel que já controla avatars) pode ler/escrever direto.
-- O fluxo público (Confirmar Cadastro) sempre usa o client admin/service-role,
-- que já ignora RLS — então essa policy é só pra acesso via sessão normal
-- (painel admin, futura área do aluno).
drop policy if exists "assinaturas_staff_all" on storage.objects;
create policy "assinaturas_staff_all" on storage.objects
for all
using (
  bucket_id = 'assinaturas'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
)
with check (
  bucket_id = 'assinaturas'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
);

drop policy if exists "matriculas_pdf_staff_all" on storage.objects;
create policy "matriculas_pdf_staff_all" on storage.objects
for all
using (
  bucket_id = 'matriculas-pdf'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
)
with check (
  bucket_id = 'matriculas-pdf'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
  )
);
