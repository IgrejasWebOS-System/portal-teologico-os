-- Limpeza de dados de teste confirmada pelo Joaquim (01/09/2026).
-- Escopo: alunos, matriculas, inscricoes publicas, membros, professores,
-- financeiro (contas a receber + caixa diario) e pedidos da loja.
-- Fora do escopo (mantido): courses, products, churches/sectors/units,
-- admin_roles, settings_*.
-- ead_matriculas/avaliacoes (cascade de ead_alunos), order_items
-- (cascade de orders), member_functions/member_timeline (cascade de
-- members) sao apagados automaticamente pelas FKs ON DELETE CASCADE.

DELETE FROM public.ead_inscricoes;
DELETE FROM public.ead_alunos;
DELETE FROM public.fin_contas_receber;
DELETE FROM public.fin_caixa_diario;
DELETE FROM public.orders;
DELETE FROM public.members;
DELETE FROM public.professores;
