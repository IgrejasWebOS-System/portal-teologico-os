-- 108_mutirao_cadastro_professor_aluno.sql
--
-- Módulo "Mutirão de cadastro" — 18/09/2026, pedido do Joaquim: dois links
-- de autocadastro público, um pro professor (cria login + suas próprias
-- turmas) e um pro aluno (vinculado a um professor+turma específicos,
-- gerado a partir do link do professor). Ver parecer técnico discutido no
-- chat antes desta migration.
--
-- Todo o fluxo novo roda com o cliente admin (service_role) do lado do
-- servidor, então nenhuma policy de RLS precisa ser afrouxada pra "anon"
-- aqui — mesmo padrão já usado em /inscricao e /confirmar-cadastro.

-- ============================================================
-- professores: e-mail persistido (hoje só passava pelo form, não era
-- gravado) + rastreio de convite, pro autocadastro público e pra dar um
-- jeito de reenviar se o e-mail de convite falhar.
-- ============================================================
alter table public.professores
  add column if not exists email text,
  add column if not exists convite_status text check (convite_status in ('PENDENTE','ENVIADO','FALHOU')) default 'PENDENTE',
  add column if not exists convite_enviado_em timestamptz,
  add column if not exists convite_erro text,
  add column if not exists cadastro_publico boolean not null default false;

comment on column public.professores.cadastro_publico is
  'true = veio do link público /cadastro-professor, sem a secretaria ter cadastrado antes.';
comment on column public.professores.convite_status is
  'PENDENTE = ainda não tentou enviar convite de acesso; ENVIADO = e-mail de convite saiu (ou conta já existia e foi promovida); FALHOU = tentou e não conseguiu, ver convite_erro.';

-- ============================================================
-- professor_turmas: link público (token opaco) pra turma que o próprio
-- professor criou -- é o que vai no link enviado ao aluno.
-- ============================================================
alter table public.professor_turmas
  add column if not exists link_token uuid not null default gen_random_uuid(),
  add column if not exists link_ativo boolean not null default true;

create unique index if not exists professor_turmas_link_token_key
  on public.professor_turmas (link_token);

comment on column public.professor_turmas.link_token is
  'Token opaco usado no link público /matricula-turma/<token> -- não é o id da linha de propósito, pra não dar pra adivinhar o link de outro professor por tentativa.';
comment on column public.professor_turmas.link_ativo is
  'Professor pode desativar o link (turma lotada/encerrada) sem apagar o vínculo nem o histórico de quem já se matriculou por ele.';

-- ============================================================
-- ead_alunos: vínculo "soft" com members (nunca bloqueia o cadastro,
-- só enriquece quando bate por CPF) + rastreio de convite, mesmo padrão
-- de professores acima.
-- ============================================================
alter table public.ead_alunos
  add column if not exists member_id uuid references public.members(id) on delete set null,
  add column if not exists matricula_membro_informada text,
  add column if not exists convite_status text check (convite_status in ('PENDENTE','ENVIADO','FALHOU')) default 'PENDENTE',
  add column if not exists convite_enviado_em timestamptz,
  add column if not exists convite_erro text;

comment on column public.ead_alunos.member_id is
  'Preenchido só quando o CPF digitado no autocadastro bate com um membro já cadastrado -- best-effort, nunca obrigatório.';
comment on column public.ead_alunos.matricula_membro_informada is
  'Matrícula de membro que a própria pessoa digitou (se lembrava) -- puramente informativo, nunca usado pra bloquear ou validar o cadastro, mesmo que não bata com nada em members.';

-- ============================================================
-- ead_matriculas.origem ganha 'MUTIRAO_LINK' -- distingue no relatório
-- da secretaria quem veio do link de turma do professor vs. inscrição
-- pública tradicional vs. matrícula direta manual.
-- ============================================================
alter table public.ead_matriculas drop constraint if exists ead_matriculas_origem_check;
alter table public.ead_matriculas add constraint ead_matriculas_origem_check
  check (origem = any (array['INSCRICAO_PUBLICA','MATRICULA_DIRETA','AUTO_MATRICULA','MUTIRAO_LINK']));

-- Backfill: professor já cadastrado com e-mail concedido via
-- grantNucleoAccess (nível 4, "Responsável de núcleo de ensino") não usa
-- este novo convite_status -- é um mecanismo de acesso diferente (staff
-- amplo, não a área leve /professor). Só marca ENVIADO quem já tem
-- user_id hoje, pra não aparecer como "PENDENTE" indevidamente.
update public.professores set convite_status = 'ENVIADO' where user_id is not null and convite_status = 'PENDENTE';
update public.ead_alunos set convite_status = 'ENVIADO' where user_id is not null and convite_status = 'PENDENTE';
