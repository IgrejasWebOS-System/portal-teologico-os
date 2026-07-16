-- Adiciona telefone do comprador ao pedido (snapshot, capturado no
-- checkout da loja junto com nome/e-mail — ver 015_snapshot_comprador_orders.sql).
ALTER TABLE public.orders ADD COLUMN telefone_comprador text;
