# Ordem Técnica e Cronológica — Isolamento do Portal EAD e Migração Futura

**Data:** 13/07/2026 · **Decisão registrada:** finalizar `portal-teologico-os` isolado, apresentar em 24/07, migrar para dentro do `igrejas-web-system-os` depois do pitch.

---

## Levantamento que embasa este plano

Antes de definir a ordem, confirmei via leitura de código exatamente quais tabelas do banco compartilhado (`swczhmhyqygpdzxwpvfo`) o `portal-teologico-os` realmente usa:

**Usadas pelo código (21 tabelas + bucket `avatars`):** `profiles`, `members`, `churches`, `sectors`, `ecclesiastical_roles`, `departments`, `settings_civil_status`, `settings_schooling`, `settings_custom_regions`, `settings_professions`, `settings_gender`, `member_timeline`, `transactions`, `courses`, `lessons`, `enrollments`, `lesson_completions`, `ebd_quarters`, `ebd_lessons`, `ebd_lesson_progress`, `ead_campos_ministerios`, `ead_alunos`, `ead_inscricoes`.

**Existem no banco mas NÃO são usadas pelo código deste projeto:** `department_types`, `church_departments`, `receivables` (as 3 com RLS desligado do achado de segurança), além de `admin_roles`, `ministries`, `occurrence_types`, `member_occurrences`. São resíduo de outro escopo — provavelmente planejamento do fornecedor para um módulo que nunca chegou a este projeto.

Isso significa: o projeto Supabase isolado do `portal-teologico-os` só precisa recriar as 21 tabelas da primeira lista — mais enxuto do que o banco atual, e sem herdar os 3 riscos críticos que não pertencem a este app.

---

## Fase 1 — Isolar o banco (13–14/07)

1. Criar um projeto Supabase novo, dedicado só ao `portal-teologico-os`.
2. Recriar nesse projeto apenas as 21 tabelas listadas acima, mais as funções necessárias (`get_next_matricula_ead`, `handle_new_user`, `update_updated_at`, etc.) e o bucket `avatars`.
3. Escrever a RLS corrigida desde o início — sem políticas `USING (true)` soltas nas tabelas administrativas, sem tabela sem RLS.
4. Atualizar `.env.local` (e as variáveis de ambiente na Vercel) para apontar para o projeto novo.
5. Testar localmente o fluxo inteiro: login, Igreja/Membros, Escola, Cursos, EBD, inscrição → aprovação → matrícula → convite → definir senha.
6. Deploy de teste na Vercel já apontando para o banco novo.

## Fase 2 — Fechar lacunas funcionais (15–19/07)

7. Estender a checagem real de `profiles.system_role` para `/admin/conteudo` e `/admin/conteudo/trilhas` (hoje só `/admin/inscricoes` está protegido).
8. Consolidar as duas pastas de migração (`sql/migrations` e `supabase/migrations`) num histórico único, batendo com o schema real do banco isolado.
9. Popular dados de demonstração: cursos/aulas reais em Escola/Cursos/EBD, 1–2 alunos aprovados de teste.

## Fase 3 — Ensaio e pitch (20–24/07)

10. Teste de ponta a ponta como usuário real (inscrição pública → aprovação pela secretaria → e-mail real de convite → definir senha → login → acesso aos módulos).
11. Revisão final de textos e telas para a apresentação.
12. Ensaio do pitch — incluindo, no material, o roadmap declarado de migração para o `igrejas-web-system-os`.

## Fase 4 — Migração real para o `igrejas-web-system-os` (a partir de 25/07, sem pressão de prazo)

13. Modelar aluno como `party_role` dentro do Party Pattern (em vez da tabela `ead_alunos` própria criada nesta sessão).
14. RBAC via `admin_roles` / `getAuthContext` / `assertLevel`, com isolamento por `ministry_id`.
15. Portar as telas (home institucional, inscrição, matrícula, design system) para a estrutura de rotas do `igrejas-web-system-os`.
16. Migrar os dados reais acumulados (inscrições e alunos matriculados) do banco isolado para o banco do `igrejas-web-system-os`.
17. Só então integrar a segunda igreja cliente, já na arquitetura multi-tenant real.

---

*A Fase 4 fica fora do escopo de 24/07 — é o roadmap pós-aprovação, não uma tarefa do cronograma de pitch.*
