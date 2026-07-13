-- ============================================================
-- Funções e triggers do schema isolado — aplicada ao projeto
-- toduvwtzklntyptcodkf via MCP (apply_migration), nome remoto
-- "002_funcoes_triggers".
--
-- Todas ganham SET search_path = public, corrigindo o WARN
-- "function_search_path_mutable" que existia no banco original
-- (swczhmhyqygpdzxwpvfo).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, system_role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'LOCAL_ADMIN');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_member_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    old_church_name TEXT;
    new_church_name TEXT;
    old_role_name TEXT;
    new_role_name TEXT;
BEGIN
    IF OLD.ecclesiastical_status IS DISTINCT FROM NEW.ecclesiastical_status THEN
        INSERT INTO member_timeline (member_id, event_type, description)
        VALUES (NEW.id, 'ALTERACAO_STATUS', 'Status alterado de ' || COALESCE(OLD.ecclesiastical_status, 'N/A') || ' para ' || COALESCE(NEW.ecclesiastical_status, 'N/A'));
    END IF;

    IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        SELECT name INTO old_role_name FROM ecclesiastical_roles WHERE id = OLD.role_id;
        SELECT name INTO new_role_name FROM ecclesiastical_roles WHERE id = NEW.role_id;
        INSERT INTO member_timeline (member_id, event_type, description)
        VALUES (NEW.id, 'MUDANCA_CARGO', 'Cargo atualizado de ' || COALESCE(old_role_name, 'Sem Cargo') || ' para ' || COALESCE(new_role_name, 'Sem Cargo'));
    END IF;

    IF OLD.church_id IS DISTINCT FROM NEW.church_id THEN
        SELECT name INTO old_church_name FROM churches WHERE id = OLD.church_id;
        SELECT name INTO new_church_name FROM churches WHERE id = NEW.church_id;
        INSERT INTO member_timeline (member_id, event_type, description)
        VALUES (NEW.id, 'TRANSFERENCIA', 'Transferido da ' || COALESCE(old_church_name, 'Sem Igreja') || ' para a ' || COALESCE(new_church_name, 'Sem Igreja'));
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_new_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO member_timeline (member_id, event_type, description)
    VALUES (NEW.id, 'CRIACAO', 'Ficha cadastral criada no sistema.');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_matricula(is_active boolean)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF is_active THEN
    RETURN (nextval('matricula_ativa_seq'))::TEXT;
  ELSE
    RETURN '-' || (nextval('matricula_inativa_seq'))::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_matricula_ead()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  proximo INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas a secretaria pode gerar matrícula.';
  END IF;

  proximo := nextval('ead_matricula_seq');
  RETURN 'CETADP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(proximo::TEXT, 4, '0');
END;
$$;

-- ── Triggers ─────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_deleted AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON public.churches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER on_member_created AFTER INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.log_new_member();
CREATE TRIGGER on_member_change AFTER UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.log_member_changes();
