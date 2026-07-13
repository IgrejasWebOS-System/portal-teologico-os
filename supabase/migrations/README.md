# supabase/migrations — pasta oficial (a partir de 13/07/2026)

Esta é a **única pasta de migrações ativa** deste projeto. Todo arquivo aqui
foi de fato aplicado ao projeto Supabase isolado `toduvwtzklntyptcodkf`
(criado em 13/07/2026, Fase 1 do plano de isolamento) via `apply_migration`
do MCP do Supabase — não via Supabase CLI.

| Arquivo | Conteúdo |
|---|---|
| `001_schema_base_isolado.sql` | Todas as tabelas, tipos, sequências, FKs e índices |
| `002_funcoes_triggers.sql` | Funções (`get_next_matricula*`, `handle_new_user`, etc.) e triggers |
| `003_rls_corrigida.sql` | RLS habilitada + políticas em todas as tabelas |
| `004_endurecimento_seguranca.sql` | Correção dos avisos (WARN) do advisor de segurança |
| `005_seed_campos_ministerios.sql` | Dados de referência (campos/ministérios do CETADP) |
| `006_dados_demonstracao.sql` | Cursos/aulas, EBD e inscrições pendentes para o ensaio do pitch (conteúdo placeholder) |
| `007_correcao_nome_cetadp.sql` | Correção do prefixo de matrícula: "CETADEP" → "CETADP" |

**Como aplicar uma migração nova daqui pra frente:**
1. Peça para o Claude aplicar via MCP do Supabase (`apply_migration`), **ou**
2. Cole o SQL manualmente no SQL Editor do projeto `toduvwtzklntyptcodkf`
   (https://supabase.com/dashboard/project/toduvwtzklntyptcodkf/sql/new).

Numere sempre sequencialmente (006, 007...) e descreva o conteúdo no nome
do arquivo, como já vinha sendo feito.

A pasta `sql/migrations/` e os 4 arquivos que já existiam nesta mesma pasta
antes de hoje (`ebd_module.sql`, `schema_introspection.sql`,
`002_video_content.sql`, `003_member_timeline.sql`) descrevem o **banco
antigo, compartilhado com o `Igrejas-Web-os`** (`swczhmhyqygpdzxwpvfo`).
Ficam mantidos como referência histórica — o conteúdo deles já está
incorporado em `001_schema_base_isolado.sql` — mas não devem mais ser
aplicados a este projeto. Veja `sql/migrations/README.md`.
