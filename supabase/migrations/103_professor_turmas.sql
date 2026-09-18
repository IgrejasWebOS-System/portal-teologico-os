-- Vínculos de Professor × Turma × Turno × Dia da semana — 15/09/2026.
--
-- Um professor pode dar aula em mais de uma turma (mesma igreja ou
-- igrejas diferentes, mesmo curso ou cursos diferentes), em turnos e
-- dias da semana distintos. Ex.: Professor 1 dá aula na Sede, segunda
-- de manhã, Turma 1 - Classe A do Básico, e também terça à noite,
-- Turma 2 do Médio. Cada linha aqui é UM vínculo (professor + turma +
-- turno + dia) — mesmo padrão de granularidade decidido com o Joaquim
-- (AskUserQuestion, 15/09/2026).

create table if not exists professor_turmas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references professores(id) on delete cascade,
  course_edition_id uuid not null references course_editions(id) on delete cascade,
  turno text not null check (turno in ('MANHA', 'TARDE', 'NOITE')),
  dia_semana text not null check (dia_semana in ('DOMINGO','SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO')),
  created_at timestamptz not null default now(),
  unique (professor_id, course_edition_id, turno, dia_semana)
);

comment on table professor_turmas is
  'Vínculo de um professor com uma turma (course_edition) num turno e dia da semana específicos. Um professor pode ter vários vínculos.';

alter table professor_turmas enable row level security;

-- Mesmo padrão de RLS de professores: leitura livre pra autenticado,
-- escrita só pra staff (GLOBAL_ADMIN/SECTOR_ADMIN/LOCAL_ADMIN).
create policy professor_turmas_select_authenticated
  on professor_turmas for select
  to authenticated
  using (true);

create policy professor_turmas_write_staff
  on professor_turmas for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.system_role = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN'])
    )
  );
