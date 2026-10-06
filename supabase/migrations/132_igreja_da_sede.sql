-- 132_igreja_da_sede.sql
-- 05/10/2026 — achado em produção (professora LUCIANE BRISOTTI): nos
-- formulários /professor/matricula, /professor/configuracoes e Nova
-- Matrícula do admin, a opção "SEDE" é montada a partir da igreja cujo
-- churches.unit_id é a unidade do tipo SEDE. A unidade SEDE existia
-- ("AD Brás Piracicaba — Sede"), mas NENHUMA linha de churches apontava para
-- ela — a opção sumia, e o professor da Sede ficava com church_id nulo (sem
-- matrícula, Caixa e Financeiro do núcleo).
--
-- Esta migration cria a "igreja-ponte" de cada unidade SEDE que ainda não
-- tem uma. Idempotente (só insere onde falta); churches só tem o trigger de
-- updated_at.
--
-- STATUS: em PRODUÇÃO a linha foi criada em 05/10/2026 colando o INSERT no
-- SQL Editor (id d023f7ae-5e20-4fb9-8dd6-f3523d529b28), ANTES de existir este
-- arquivo — regularizada aqui (ver ERROS-COMUNS-IA.md, 06/10/2026). Backup
-- prévio validado: portal-teologico_PROD_2026-10-05_2326_PRE-pre-igreja-sede.dump.
-- Em produção, rodar de novo é no-op.

insert into public.churches (name, unit_id, sector_id, is_sede, church_type, status)
select u.name, u.id, null, true, 'CHURCH', 'ACTIVE'
  from public.units u
 where u.type = 'SEDE'
   and not exists (select 1 from public.churches c where c.unit_id = u.id);
