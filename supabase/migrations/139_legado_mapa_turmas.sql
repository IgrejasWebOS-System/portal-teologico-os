-- ============================================================
-- 139_legado_mapa_turmas.sql  (17/10/2026)
-- Migracao do sistema antigo: mapa turma antiga -> IGREJA (e setor) do portal.
-- Motivo (pergunta do Joaquim): a migracao so resolvia o SETOR/REGIONAL; a igreja
-- da turma (ex.: "PQ. SAO JORGE" -> "PARQUE SAO JORGE") precisa ser preenchida
-- tambem. O script legado_migrar_ano.sql preenche esta tabela por nome
-- (normalizado) e so usa as linhas com confirmado = true.
--
-- Isolada como as demais legado_*: sem FK, RLS ligado sem policy (so service_role).
-- Guarda NOMES (nao ids), porque os ids de units diferem entre staging e producao.
-- ============================================================

create table if not exists public.legado_mapa_turmas (
  cod_turma          text primary key,
  ano                text,
  nome_turma         text,
  setor_legado_nome  text,            -- setor/regional do portal mapeado pela unidade antiga
  igreja_nome        text,            -- igreja escolhida (nome em units)
  igreja_setor_nome  text,            -- setor/regional PAI da igreja escolhida
  metodo             text not null,   -- EXATO_MESMO_SETOR | SUBCONJUNTO_MESMO_SETOR | OUTRO_SETOR_EXATO | AMBIGUO | SEM_MATCH | MANUAL
  candidatas         text,            -- para revisao humana
  confirmado         boolean not null default false,
  observacao         text
);
alter table public.legado_mapa_turmas enable row level security;
revoke all on public.legado_mapa_turmas from anon, authenticated;
