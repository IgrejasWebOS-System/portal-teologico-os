-- profiles só tem policy de SELECT da própria linha (profiles_select_own)
-- — não existe policy de staff para ver perfil de outro usuário. Em vez
-- de abrir essa visibilidade (mudança maior, afeta todo o app), seguimos
-- o mesmo padrão já usado em order_items.titulo_snapshot: gravar nome e
-- e-mail do comprador no momento do pedido, direto em orders.

ALTER TABLE public.orders
  ADD COLUMN nome_comprador text,
  ADD COLUMN email_comprador text;
