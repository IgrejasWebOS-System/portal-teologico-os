-- ============================================================
-- M1 — Fundação da hierarquia Campo → Sede → Setor → Igreja → Célula
-- Tabela "units" recursiva (parent_id), modelo portado de
-- igrejas-web-system-os (ver C:\Projetos\portal-teo-igreja-docs).
--
-- Este módulo é 100% aditivo: não altera sectors, churches nem
-- profiles, não é lido por nenhuma query da aplicação ainda.
-- Só cria a estrutura. A migração dos dados existentes (sectors,
-- churches) e a troca de permissões vêm nos módulos seguintes
-- (M3, M4, M5, M6, M7+).
-- ============================================================

-- ── Tipo ───────────────────────────────────────────────────
CREATE TYPE unit_type AS ENUM ('CAMPO', 'SEDE', 'SETOR', 'IGREJA', 'CELULA');

-- ── Tabela ─────────────────────────────────────────────────
CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type unit_type NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  is_headquarters boolean NOT NULL DEFAULT false,   -- Sede do Campo
  is_sector_mother boolean NOT NULL DEFAULT false,  -- Igreja Mãe do Setor
  legacy_church_id uuid,   -- ponte temporária p/ M4 (não referencia FK ainda)
  legacy_sector_id uuid,   -- ponte temporária p/ M3 (não referencia FK ainda)
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_status_check CHECK (status = ANY (ARRAY['ACTIVE','ARCHIVED']))
);

CREATE INDEX idx_units_parent_id ON public.units USING btree (parent_id);
CREATE INDEX idx_units_type ON public.units USING btree (type);
CREATE INDEX idx_units_legacy_church_id ON public.units USING btree (legacy_church_id) WHERE legacy_church_id IS NOT NULL;
CREATE INDEX idx_units_legacy_sector_id ON public.units USING btree (legacy_sector_id) WHERE legacy_sector_id IS NOT NULL;

-- ── Trigger: hierarquia coerente ──────────────────────────────
-- CAMPO é raiz (sem pai). SEDE só pode ter pai CAMPO. SETOR só pode
-- ter pai SEDE. IGREJA só pode ter pai SETOR. CELULA só pode ter
-- pai IGREJA. Evita, por exemplo, uma IGREJA pendurada direto num
-- CAMPO por engano.
CREATE OR REPLACE FUNCTION public.validate_unit_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_type unit_type;
BEGIN
  IF NEW.type = 'CAMPO' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'CAMPO não pode ter parent_id (é sempre raiz)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL THEN
    RAISE EXCEPTION '% precisa de parent_id', NEW.type;
  END IF;

  SELECT type INTO parent_type FROM public.units WHERE id = NEW.parent_id;

  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'parent_id % não existe em units', NEW.parent_id;
  END IF;

  IF (NEW.type = 'SEDE' AND parent_type <> 'CAMPO')
     OR (NEW.type = 'SETOR' AND parent_type <> 'SEDE')
     OR (NEW.type = 'IGREJA' AND parent_type <> 'SETOR')
     OR (NEW.type = 'CELULA' AND parent_type <> 'IGREJA')
  THEN
    RAISE EXCEPTION 'Hierarquia inválida: % não pode ter pai do tipo %', NEW.type, parent_type;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_unit_hierarchy
  BEFORE INSERT OR UPDATE OF type, parent_id ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.validate_unit_hierarchy();

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ────────────────────────────────────────────────────
-- Provisório: leitura liberada pra qualquer autenticado (a árvore
-- em si não é dado sensível), escrita restrita a GLOBAL_ADMIN até
-- M5/M6 trazerem admin_roles com nível+unidade — nesse ponto (M7+)
-- esta policy de escrita será substituída por uma com escopo real.
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select_authenticated" ON public.units
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "units_write_global_admin" ON public.units
  FOR ALL TO authenticated
  USING (public.current_system_role() = 'GLOBAL_ADMIN')
  WITH CHECK (public.current_system_role() = 'GLOBAL_ADMIN');
