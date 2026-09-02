-- ============================================================
-- Limpeza de dados de teste em produção — confirmado pelo Joaquim
-- em 01/09/2026: todos os alunos/matrículas/membros/professores/
-- financeiro/pedidos existentes até aqui eram de demonstração.
--
-- Escopo apagado: ead_inscricoes, ead_alunos (cascade →
-- ead_matriculas → avaliacoes), fin_contas_receber, fin_caixa_diario,
-- orders (cascade → order_items), members (cascade →
-- member_functions, member_timeline), professores.
--
-- Fora do escopo (mantido de propósito): courses (14), products (13),
-- churches/sectors/units (24/35/67 — aguardando decisão sobre
-- reimportar via os 2 PDFs de igrejas), admin_roles, settings_*.
--
-- Nota: 2 movimentações de estoque (product_stock_movements) ligadas
-- a pedidos de teste agora ficam com order_id NULL (SET NULL, não
-- cascade) — se o produto afetado for real (não teste), o estoque
-- atual pode estar contando essas saídas de teste. Verificar
-- manualmente se precisa repor.
-- ============================================================

DELETE FROM public.ead_inscricoes;
DELETE FROM public.ead_alunos;
DELETE FROM public.fin_contas_receber;
DELETE FROM public.fin_caixa_diario;
DELETE FROM public.orders;
DELETE FROM public.members;
DELETE FROM public.professores;
