-- ============================================================
-- 137_legado_mapa_unidades.sql  (16/10/2026)
-- Migracao do sistema antigo - FASE 2: mapa unidade antiga -> setor/regional do portal.
--
-- ISOLADA como a 136: sem FK, RLS ligado sem policy (so service_role).
-- portal_unit_id / portal_unit_nome guardam o id/nome da unit de PRODUCAO como texto
-- (somente referencia para a conciliacao; nada aponta de verdade para tabelas vivas).
-- Regra: "SETOR 003.1 JD GLORIA" -> setor-pai "SETOR 003" (a igreja especifica e
-- resolvida depois, pelo nome da turma). "SEDE", "SEDE.1", "SEDE.2" -> SEDE.
-- Tudo que nao casar fica SEM_MAPA / NAO_EXISTE_NO_PORTAL para decisao manual.
-- ============================================================

create table if not exists public.legado_mapa_unidades (
  cod_legado        text primary key,
  nome_legado       text,
  tipo_legado       text,            -- SEDE | SETOR | REGIONAL | OUTRO
  numero_legado     int,
  e_subunidade      boolean,         -- true quando tem sufixo .x (igreja dentro do setor)
  portal_unit_id    text,
  portal_unit_nome  text,
  situacao          text not null,   -- MAPEADO | NAO_EXISTE_NO_PORTAL | SEM_MAPA | REVISAR
  confirmado        boolean not null default false,
  observacao        text
);
alter table public.legado_mapa_unidades enable row level security;
revoke all on public.legado_mapa_unidades from anon, authenticated;

with portal(unit_id, nome) as (values
('e36d8f34-4b89-4892-ae7f-cab030306db2','AD Brás Piracicaba — Sede'),
('972ae6dd-8663-4f0d-9cbf-8e673eda9329','REGIONAL 001'),('009585fd-2674-4659-bd90-8286c187b275','REGIONAL 002'),
('ff352c1b-54d9-46ff-9faa-54bf22321410','REGIONAL 003'),('330c7035-13df-4ac3-ba53-eb7b64343e90','REGIONAL 004'),
('aea3abdd-4d9c-4b37-a37b-677ee6d9b82a','REGIONAL 005'),('9eae9137-ccd3-42a2-b05c-3e4fd06ddd07','REGIONAL 006'),
('62de6903-446d-493c-abfa-a7b79bcadfbf','REGIONAL 007'),('b58a6cb4-da11-4b82-b6c5-4b773f48c12e','REGIONAL 008'),
('bdefd709-aaba-4a32-b7bb-e54106a2bb65','REGIONAL 009'),('bbf69ca3-9ad0-4d64-a348-50d0096c58b4','REGIONAL 010'),
('b21bbb7e-5f9b-4034-b4c2-cd4f192259fe','REGIONAL 012'),('7ec3b51b-c5f3-44b9-9aab-27a0fb878154','REGIONAL 013'),
('c78671a5-7ebc-46e7-bfca-fb4c38084fd1','REGIONAL 015'),('b99b8147-c959-4ba9-b0ee-534741f0f9bf','REGIONAL 016'),
('46360d30-70bc-4461-b453-c51474ad8b55','REGIONAL 017'),('3a366e1e-5d7b-4152-9003-4b1a31c2655e','REGIONAL 018'),
('aed51579-b488-4420-b9d4-3c76e6efbac8','REGIONAL 019'),('ef790ad0-6e3d-4941-90cd-a208526a22f9','REGIONAL 020'),
('fe0dc9fb-2f3c-4997-a244-9f230cba0848','REGIONAL 021'),('ecf14f08-660c-4aa9-a60b-ef221a1103a6','REGIONAL 022'),
('2a30baaf-f63c-4504-960c-fad101f57fa6','REGIONAL 023'),('0c875d86-4881-4eb8-8479-af58a9444f4a','REGIONAL 025'),
('750cc549-9290-46c2-b194-8915cda2e885','REGIONAL 026'),
('c5f52522-6633-4ef2-9335-986fc819536c','SETOR 001'),('da01bf0e-cd20-487d-9b41-38bd36e731d9','SETOR 002'),
('1dc6571c-e357-41ca-8356-70c08e112b85','SETOR 003'),('572441ee-580b-4fe0-ab96-3f9c489714bb','SETOR 004'),
('6c14a5d5-63e4-4a5e-8d2a-7af448b3f72b','SETOR 005'),('ac90d314-d007-4b10-9504-fbf74c60b9e1','SETOR 006'),
('5a29c4b1-2753-4d8f-99a2-d0d5e6b3769b','SETOR 007'),('aef55f76-1e54-4c57-9dd8-2ce00a529705','SETOR 008'),
('7de2fdd3-1d4c-42a3-9e40-94516248c607','SETOR 009'),('aba63582-f685-4921-82ae-8691eace9757','SETOR 010'),
('3261ddeb-36a3-414a-8e24-48e57bc00e44','SETOR 011'),('f0a9fe9a-c4ab-4627-bc1d-1c63c04257ae','SETOR 012'),
('7313c728-a182-4350-95da-32765347111e','SETOR 013'),('a3b4c2cf-3203-4849-b55b-4605a336a5a3','SETOR 014'),
('abd6d1b2-5d4e-4daa-b13b-3baaaa214de4','SETOR 015')
),
base as (
  select u.codigo, u.nome,
    substring(upper(btrim(u.nome)) from '^(SETOR|REGIONAL|SEDE)') as tipo,
    nullif(substring(upper(btrim(u.nome)) from '^(?:SETOR|REGIONAL)\s*0*(\d+)'),'')::int as num,
    (upper(btrim(u.nome)) ~ '^(SETOR|REGIONAL)\s*0*\d+\.\d') as sub
  from public.legado_unidades u
)
insert into public.legado_mapa_unidades
  (cod_legado, nome_legado, tipo_legado, numero_legado, e_subunidade, portal_unit_id, portal_unit_nome, situacao, observacao)
select b.codigo, btrim(b.nome), coalesce(b.tipo,'OUTRO'), b.num, coalesce(b.sub,false),
  p.unit_id, p.nome,
  case
    when p.unit_id is not null then 'MAPEADO'
    when b.tipo in ('SETOR','REGIONAL') then 'NAO_EXISTE_NO_PORTAL'
    else 'SEM_MAPA'
  end,
  case
    when b.nome ilike '%teste%' then 'Unidade de teste do sistema antigo'
    when b.tipo = 'SEDE' then 'SEDE e sub-sedes (ex.: SEDE.1 ADILSON) -> SEDE'
    when b.sub then 'Sub-unidade (igreja) dentro do setor/regional'
    else null
  end
from base b
left join portal p on
  (b.tipo = 'SEDE' and p.nome like 'AD Br%')
  or (b.tipo in ('SETOR','REGIONAL') and b.num is not null
      and p.nome = b.tipo || ' ' || lpad(b.num::text, 3, '0'))
on conflict (cod_legado) do nothing;
