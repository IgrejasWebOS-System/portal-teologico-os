-- ============================================================
-- M7.1 — Primeira leva de RLS com escopo real (get_accessible_unit_ids)
--
-- Troca a checagem "é algum tipo de staff" (bloco único, sem olhar
-- QUAL igreja/setor) por "é staff E a unidade do registro está
-- dentro do que essa pessoa pode acessar", em 4 tabelas:
--   • churches   → só a escrita (leitura continua aberta, é a
--                  estrutura da árvore, mesmo espírito de units)
--   • sectors    → só a escrita (idem)
--   • members    → leitura E escrita (dado de pessoa é sensível)
--   • transactions → só a leitura (nunca existiu policy de escrita
--                  pra "authenticated" nessa tabela — grants hoje
--                  são só via service role/Server Action; não vou
--                  criar uma escrita nova que não existia)
--
-- GLOBAL_ADMIN e Super-Master continuam vendo/editando tudo — nada
-- muda pra eles. Quem muda de verdade é SECTOR_ADMIN/LOCAL_ADMIN.
--
-- ATENÇÃO — gap conhecido (código de aplicação, fora do escopo
-- desta migration): as telas de criar igreja/setor ainda não
-- preenchem unit_id ao inserir. Até isso ser ajustado nas Server
-- Actions, registros NOVOS só ficam visíveis/editáveis por
-- GLOBAL_ADMIN/Super-Master (os 7 registros já migrados em M3/M4
-- já têm unit_id e funcionam normalmente pro escopo certo).
-- ============================================================

-- ── churches (escrita) ────────────────────────────────────
DROP POLICY IF EXISTS churches_write_staff ON public.churches;
CREATE POLICY churches_write_scoped ON public.churches
  FOR ALL TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  )
  WITH CHECK (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  );

-- ── sectors (escrita) ─────────────────────────────────────
DROP POLICY IF EXISTS sectors_write_staff ON public.sectors;
CREATE POLICY sectors_write_scoped ON public.sectors
  FOR ALL TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  )
  WITH CHECK (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
  );

-- ── members (leitura + escrita) ──────────────────────────
DROP POLICY IF EXISTS members_select_authenticated ON public.members;
DROP POLICY IF EXISTS members_write_staff ON public.members;

CREATE POLICY members_select_scoped ON public.members
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id = members.church_id
        AND c.unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
    )
  );

CREATE POLICY members_write_scoped ON public.members
  FOR ALL TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id = members.church_id
        AND c.unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
    )
  )
  WITH CHECK (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id = members.church_id
        AND c.unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
    )
  );

-- ── transactions (só leitura — nunca teve write policy) ──
DROP POLICY IF EXISTS transactions_select_staff ON public.transactions;
CREATE POLICY transactions_select_scoped ON public.transactions
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR public.current_system_role() = 'GLOBAL_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id = transactions.church_id
        AND c.unit_id IN (SELECT unit_id FROM public.get_accessible_unit_ids())
    )
  );
