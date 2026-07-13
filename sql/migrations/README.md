# sql/migrations — pasta ARQUIVADA (desde 13/07/2026)

Os arquivos `009_configuracoes_module.sql`, `010_rls_policies_configuracoes.sql`
e `011_ead_inscricoes.sql` nesta pasta, junto com os 4 arquivos soltos em
`supabase/migrations/` (`ebd_module.sql`, `schema_introspection.sql`,
`002_video_content.sql`, `003_member_timeline.sql`), descrevem o schema do
**banco antigo, compartilhado com o `Igrejas-Web-os`** (projeto Supabase
`swczhmhyqygpdzxwpvfo`).

Numeração original nunca completa (faltavam sempre 001 e 004–008) porque
todo o schema real era aplicado manualmente pelo SQL Editor, sem arquivo de
migração — confirmado em 13/07/2026 ao conectar o Supabase e comparar o
schema real de produção com estes arquivos.

A partir da Fase 1 do plano de isolamento (13/07/2026), o
`portal-teologico-os` passou a usar um projeto Supabase próprio
(`toduvwtzklntyptcodkf`). O conteúdo real e completo desse banco está
versionado em `supabase/migrations/001_schema_base_isolado.sql` e
seguintes — essa é agora a única pasta ativa.

**Não aplique os arquivos desta pasta ao projeto novo.** Eles ficam aqui só
como referência histórica do banco antigo.
