-- 118_admin_roles_menu_restrito.sql
-- Pedido do Joaquim (28/09/2026): alguns GLOBAL_ADMIN (ex.: josias, marcelo,
-- pandolfo) precisam ver só um menu enxuto — Dashboard, Turmas, Matrículas,
-- Professores, Alunos, Financeiro, Caixa e Configurações (acessos) — e ficar
-- de fato IMPEDIDOS de acessar qualquer outra área administrativa (Conteúdo/
-- EBD, Loja, Patrimônio, Inscrições, Certificados, FAQ), mesmo digitando a
-- URL direto. Não é um nível novo de hierarquia (continuam level 0, mesma
-- permissão de dado/RLS de sempre) — é só uma bandeira de UI + bloqueio de
-- rota, aplicada no middleware (src/utils/supabase/middleware.ts).
alter table admin_roles
  add column if not exists menu_restrito boolean not null default false;

comment on column admin_roles.menu_restrito is
  'true = admin vê só o menu curado (Dashboard/Turmas/Matrículas/Professores/Alunos/Financeiro/Caixa/Configurações) e é bloqueado (redirecionado) de qualquer outra rota administrativa, mesmo por URL direta. Não muda o nível/RLS — só o gate de rota no middleware.';
