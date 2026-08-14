# Banco de dados — migrations

## Duas pastas de migration — não confundir

- **`supabase/migrations/`** → a pasta **ativa**, real, usada pelo projeto
  Supabase isolado (`toduvwtzklntyptcodkf`). 73 arquivos, `001` a `073`.
- **`sql/migrations/`** → pasta **arquivada** (README próprio avisa isso desde
  13/07/2026). Descreve o banco antigo, compartilhado com o `Igrejas-Web-os`
  (projeto Supabase `swczhmhyqygpdzxwpvfo`). **Não aplicar esses arquivos no
  projeto atual** — ficam só como referência histórica.

Este documento cobre apenas `supabase/migrations/`.

## Observação sobre numeração

Existe uma lacuna entre `029` e `040` (não há `030`–`039` no repositório) e dois
arquivos concorrentes com número `003` (`003_member_timeline.sql` e
`003_rls_corrigida.sql`). Isso é consistente com o padrão já visto no banco antigo
(numeração aplicada manualmente, nem sempre sequencial) — vale confirmar em algum
momento se essa faixa foi aplicada direto no SQL Editor sem gerar arquivo, igual
aconteceu no projeto anterior.

## Agrupamento por área (por nome de arquivo — conteúdo não aberto migration a migration)

**Fundação do banco isolado**
`001_schema_base_isolado`, `002_funcoes_triggers`, `003_rls_corrigida`,
`004_endurecimento_seguranca`, `005_seed_campos_ministerios`

**Ajustes iniciais / dados de demonstração**
`006_dados_demonstracao`, `007_correcao_nome_cetadp`,
`008_atualizacao_nomes_cursos_reais`, `009_turmas_edicoes_anuais`

**Certificados**
`010_modulo_certificados`, `011_correcao_grants_certificates`,
`017_funcao_numero_certificado`

**Loja**
`013_loja_produtos_pedidos`, `014_seed_produtos_loja`,
`015_snapshot_comprador_orders`, `026_orders_telefone_comprador`

**Matrícula / EAD**
`016_polos_presenciais_reais`, `018_cursos_preparatorios_avulsos`,
`019_pagamento_matricula_oficial`, `020_cadastro_completo_aluno_cpf_unico`,
`021_ead_matriculas`, `028_automatricula_sem_aprovacao_secretaria`,
`044_matricula_setor_igreja_turma_professor`

**Financeiro**
`022_financeiro_plano_de_contas`, `023_financeiro_caixa_diario`,
`027_financeiro_contas_a_receber`, `046_contas_receber_mercadopago`

**Patrimônio**
`024_patrimonio_inventario`

**Avaliações**
`025_avaliacoes_simulados_provas`, `068_pode_escanear_provas`

**Configurações auxiliares / dados demográficos**
`029_seed_tabelas_auxiliares_configuracoes`, `045_nacionalidade_consentimento_lgpd`,
`067_members_nationality`, `071_uppercase_complementos`,
`072_expandir_profissoes`, `073_estados_regiao_ibge`

**Seeds extras / demo (após a lacuna 030–039)**
`040_seed_questoes_curso_medio`, `041_demo_aluno_com_simulados_e_provas`

**Regiões e professores**
`042_regioes_professores_matricula`, `043_regiao_no_setor_dados_reais`,
`069_professores_unit_id`

**EBD e FAQ**
`047_ebd_write_staff`, `051_faq_modulo`

**Perfis, papéis e permissões (RBAC)**
`048_profiles_select_staff`, `049_profiles_update_global_admin`,
`050_fix_profiles_rls_recursion`, `052_funcoes_membros`,
`053_seed_function_roles`, `059_admin_roles_e_escopo`,
`060_migrar_profiles_para_admin_roles`, `063_must_change_password`

**Hierarquia territorial (Campo → Sede → Setor → Igreja → Célula) / `units`**
`054_units_hierarquia`, `055_seed_campo_sede_piracicaba`,
`056_migrar_sectors_para_units`, `057_expandir_unit_type`,
`058_migrar_churches_para_units`, `061_rls_escopo_churches_sectors_members_transactions`,
`062_ead_escopo_territorial`, `064_units_write_scoped`, `065_novos_campos_sedes`,
`066_churches_email`, `_diagnostico_campos` (sem número — script de diagnóstico),
`070_povoar_campos_novos`

## Como aplicar / gerenciar

```bash
supabase login
supabase init
supabase link --project-ref toduvwtzklntyptcodkf
supabase db push        # aplica migrations pendentes no projeto linkado
```

Ver `docs/infrastructure/github-supabase-vercel.md` para a connection string e as
chaves de API.
