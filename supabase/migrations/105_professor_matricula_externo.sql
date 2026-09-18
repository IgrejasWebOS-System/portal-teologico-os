-- Código de cadastro automático pro "Professor de fora" — 15/09/2026.
--
-- Mesmo padrão já usado em ead_alunos (get_next_matricula_ead): sequência
-- própria + função que só a secretaria (ou rotina de servidor) pode
-- chamar. Professor MEMBRO continua usando a matrícula copiada do
-- cadastro de Membros (sem mudança) — isso aqui é só pro Professor
-- EXTERNO, que hoje fica sem nenhum código de identificação.

create sequence if not exists professor_matricula_seq start 1;

create or replace function get_next_matricula_professor()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo bigint;
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.system_role in ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) then
    raise exception 'Apenas a secretaria ou uma rotina confiável do servidor pode gerar matrícula.';
  end if;
  proximo := nextval('professor_matricula_seq');
  return 'CETADP-PROF-' || to_char(now(), 'YYYY') || '-' || lpad(proximo::text, 4, '0');
end;
$$;
