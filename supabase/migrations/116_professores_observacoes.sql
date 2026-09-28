-- 116_professores_observacoes.sql
-- Pedido do Joaquim (27/09/2026): campo de observação livre na ficha do
-- professor, dentro da caixa "Acesso ao núcleo de ensino" no formulário
-- da secretaria. Sem RLS nova — já coberto pelas policies existentes de
-- professores (migration 111).
alter table professores add column if not exists observacoes text;
