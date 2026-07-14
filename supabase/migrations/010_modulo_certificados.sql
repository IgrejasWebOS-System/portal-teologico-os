-- Módulo de certificados: fecha o ciclo inscrição → matrícula →
-- conclusão → certificado. A rota pública /certificados já existe como
-- placeholder ("Validar Certificado" no header) — esta tabela é a base
-- de dados que faltava para ela funcionar de verdade.
-- Assinaturas replicam o padrão real já usado pelo CETADP em certificados
-- físicos (Presidente + Coordenador Acadêmico), fonte: apresentação
-- institucional em PDF. Pós-pitch, sem prazo.

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  course_edition_id uuid REFERENCES public.course_editions(id) ON DELETE SET NULL,
  numero_certificado text NOT NULL UNIQUE,
  nome_aluno text NOT NULL,
  nome_curso text NOT NULL,
  carga_horaria integer,
  assinatura_presidente text NOT NULL DEFAULT 'Pr. Dilmo dos Santos',
  assinatura_coordenador text NOT NULL DEFAULT 'Pr. Marcelo Eduardo Trevisan',
  pdf_url text,
  emitido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX certificates_user_id_idx ON public.certificates(user_id);
CREATE INDEX certificates_numero_idx ON public.certificates(numero_certificado);

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Validação pública por número (é literalmente a função da página
-- /certificados — "Validar Certificado"). Expõe só o que já é público
-- num certificado físico impresso (nome, curso, data), nunca dados de
-- contato/CPF, que não estão nesta tabela.
CREATE POLICY certificates_select_public ON public.certificates
  FOR SELECT
  USING (true);

CREATE POLICY certificates_write_staff ON public.certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

CREATE POLICY certificates_update_staff ON public.certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

CREATE POLICY certificates_delete_staff ON public.certificates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.system_role IN ('GLOBAL_ADMIN', 'SECTOR_ADMIN', 'LOCAL_ADMIN')
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.certificates FROM anon, authenticated;
GRANT SELECT ON public.certificates TO anon, authenticated;

-- Correção aplicada em seguida (ver 011): o REVOKE acima bloquearia
-- também a secretaria, que usa a mesma role `authenticated` — a
-- diferenciação staff/aluno é só via RLS, não via role de Postgres.
