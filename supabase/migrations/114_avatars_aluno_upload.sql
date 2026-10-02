-- 25/09/2026, achado em teste (Joaquim): aluno logado tentando subir foto
-- em /completar-cadastro recebia "new row violates row-level security
-- policy" no bucket `avatars`. A migration 113 já tinha resolvido isso
-- pra PROFESSOR (professores.user_id) mas o mesmo problema nunca tinha
-- sido corrigido pro próprio ALUNO subindo a própria foto — só
-- staff (avatars_staff_all) e professor (avatars_professor_insert)
-- tinham policy de INSERT.
drop policy if exists "avatars_aluno_insert" on storage.objects;
create policy "avatars_aluno_insert" on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.ead_alunos
    where ead_alunos.user_id = (select auth.uid())
  )
);

-- Aluno também precisa poder ATUALIZAR a própria foto (trocar depois de já
-- ter subido uma vez) — sem isso, um upload de re-troca falha do mesmo
-- jeito, só que em UPDATE em vez de INSERT.
drop policy if exists "avatars_aluno_update" on storage.objects;
create policy "avatars_aluno_update" on storage.objects
for update
using (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.ead_alunos
    where ead_alunos.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.ead_alunos
    where ead_alunos.user_id = (select auth.uid())
  )
);
