-- ============================================================
-- RLS corrigida desde o início — aplicada ao projeto
-- toduvwtzklntyptcodkf via MCP (apply_migration), nome remoto
-- "003_rls_corrigida".
--
-- Substitui as políticas "USING (true)" permissivas do banco
-- original (swczhmhyqygpdzxwpvfo) por checagem real de
-- profiles.system_role (o modelo que o código do
-- portal-teologico-os efetivamente usa). Tabelas de conteúdo
-- (ead_*, courses, lessons, enrollments, ebd_*) mantêm as
-- políticas originais, que já eram bem desenhadas.
-- ============================================================

-- ── Habilitar RLS em todas as tabelas ────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecclesiastical_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_civil_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_schooling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_gender ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_custom_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ead_campos_ministerios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ead_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ead_inscricoes ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- ── churches (antes: "Permitir tudo" com USING/WITH CHECK true) ──
CREATE POLICY churches_select_authenticated ON public.churches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY churches_write_staff ON public.churches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── sectors ──────────────────────────────────────────────────
CREATE POLICY sectors_select_authenticated ON public.sectors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY sectors_write_staff ON public.sectors
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── ecclesiastical_roles ─────────────────────────────────────
CREATE POLICY eccl_roles_select_authenticated ON public.ecclesiastical_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY eccl_roles_write_staff ON public.ecclesiastical_roles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── departments ──────────────────────────────────────────────
CREATE POLICY departments_select_authenticated ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY departments_write_staff ON public.departments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── settings_* (5 tabelas de referência) ─────────────────────
CREATE POLICY settings_civil_status_select ON public.settings_civil_status FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_civil_status_write_staff ON public.settings_civil_status
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY settings_schooling_select ON public.settings_schooling FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_schooling_write_staff ON public.settings_schooling
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY settings_professions_select ON public.settings_professions FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_professions_write_staff ON public.settings_professions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY settings_gender_select ON public.settings_gender FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_gender_write_staff ON public.settings_gender
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY settings_custom_regions_select ON public.settings_custom_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_custom_regions_write_staff ON public.settings_custom_regions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── member_timeline (INSERT restrito à secretaria — ver 004) ─
CREATE POLICY member_timeline_select ON public.member_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY member_timeline_insert ON public.member_timeline FOR INSERT TO authenticated WITH CHECK (true);

-- ── members (antes: INSERT/UPDATE liberado para qualquer autenticado) ──
CREATE POLICY members_select_authenticated ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY members_write_staff ON public.members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── transactions (antes: RLS habilitada SEM nenhuma política = inacessível) ──
CREATE POLICY transactions_select_staff ON public.transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── courses / lessons (antes: só SELECT existia — INSERT/UPDATE do /admin/conteudo
--    não tinham política e portanto falhavam silenciosamente) ──
CREATE POLICY courses_select_published ON public.courses
  FOR SELECT TO authenticated USING (status = 'PUBLISHED');
CREATE POLICY courses_write_staff ON public.courses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY lessons_select_published_course ON public.lessons
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.status = 'PUBLISHED'));
CREATE POLICY lessons_write_staff ON public.lessons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

-- ── enrollments / lesson_completions (mantidos iguais ao original) ──
CREATE POLICY enrollments_select_own ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY enrollments_insert_own ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY enrollments_update_own ON public.enrollments FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY lesson_completions_select_own ON public.lesson_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY lesson_completions_insert_own ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── ebd_quarters / ebd_lessons / ebd_lesson_progress (iguais ao original) ──
CREATE POLICY ebd_quarters_read ON public.ebd_quarters FOR SELECT TO authenticated USING (true);
CREATE POLICY ebd_lessons_read ON public.ebd_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY ebd_lesson_progress_own ON public.ebd_lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── ead_* (iguais ao original, já bem desenhadas) ────────────
CREATE POLICY ead_campos_select_all ON public.ead_campos_ministerios FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY ead_campos_write_staff ON public.ead_campos_ministerios
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY ead_alunos_select_self_or_staff ON public.ead_alunos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));
CREATE POLICY ead_alunos_write_staff ON public.ead_alunos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));

CREATE POLICY ead_inscricoes_insert_public ON public.ead_inscricoes
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'PENDENTE' AND aluno_id IS NULL);
CREATE POLICY ead_inscricoes_select_staff ON public.ead_inscricoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));
CREATE POLICY ead_inscricoes_update_staff ON public.ead_inscricoes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.system_role IN ('GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN')));
