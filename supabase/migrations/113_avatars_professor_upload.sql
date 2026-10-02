-- ============================================================
-- 113_avatars_professor_upload.sql
--
-- 25/09/2026, achado em teste (Joaquim): a Nova Matrícula da Área do
-- Professor ganhou upload de foto do aluno (ver
-- ProfessorNovaMatriculaForm.tsx), igual ao padrão admin
-- (NovaMatriculaForm.tsx/EditarMatriculaForm.tsx). Só que a policy de
-- storage do bucket "avatars" (migration 091) só libera upload pra quem
-- tem profiles.system_role em ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')
-- — professor não é esse tipo de usuário (é identificado por
-- professores.user_id, migration 101), então o upload do professor
-- falharia silenciosamente com "Erro no upload da foto", do mesmo jeito
-- que já tinha acontecido com staff antes da 091.
-- ============================================================

drop policy if exists "avatars_professor_insert" on storage.objects;
create policy "avatars_professor_insert" on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and exists (
    select 1 from public.professores
    where professores.user_id = (select auth.uid())
  )
);
