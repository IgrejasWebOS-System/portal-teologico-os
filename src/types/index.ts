// ============================================================
// Portal Teológico — TypeScript Types
// Gerados a partir do schema Supabase (swczhmhyqygpdzxwpvfo)
// 2026-06-15
// ============================================================

// ===== ENUMS =====

export type SystemRole = "GLOBAL_ADMIN" | "SECTOR_ADMIN" | "LOCAL_ADMIN" | "MEMBER";
export type MemberStatus = "ACTIVE" | "INACTIVE" | "DISCIPLINE";
export type FinancialStatus = "UP_TO_DATE" | "PENDING";
export type EntityStatus = "ACTIVE" | "ARCHIVED";
export type ReceivableStatus = "PENDING" | "PAID" | "PARTIAL" | "CANCELED";

// ===== CORE ENTITIES =====

export interface Ministry {
  id: string;
  name: string;
  president_id: string | null;
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  region: string | null;
  status: EntityStatus;
  headquarters_id: string | null;
  neighborhoods: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  churches?: Church[];
}

export interface Church {
  id: string;
  name: string;
  sector_id: string | null;
  ministry_id: string | null;
  is_sector_head: boolean;
  is_headquarters: boolean;
  is_mother_church: boolean;
  cnpj: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  logo_url: string | null;
  phone: string | null;
  church_phone: string | null;
  pastor_name: string | null;
  pastor_phone: string | null;
  pastor_matricula: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  church_id: string | null;
  system_role: SystemRole;
  updated_at: string;
}

export interface EcclesiasticalRole {
  id: string;
  name: string;
  suggested_fee: number;
  hierarchy_level: number;
  created_at: string;
}

export interface Member {
  id: string;
  church_id: string;
  full_name: string;
  matricula: string | null;
  registration_number: string | null;
  cpf: string | null;
  rg: string | null;
  rg_issuer: string | null;
  rg_state: string | null;
  role_id: string | null;
  email: string | null;
  phone: string | null;
  number: string | null;
  status: MemberStatus;
  financial_status: FinancialStatus;
  ecclesiastical_status: string;
  birth_date: string | null;
  gender: string | null;
  profession: string | null;
  civil_status: string | null;
  schooling: string | null;
  nationality_city: string | null;
  nationality_state: string | null;
  spouse_name: string | null;
  mother_name: string | null;
  father_name: string | null;
  address: string | null;
  zip_code: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  marriage_date: string | null;
  baptism_date: string | null;
  origin_church: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  ecclesiastical_roles?: { name: string } | null;
}

// ===== FINANCIAL =====

export interface Receivable {
  id: string;
  church_id: string;
  member_id: string | null;
  department_id: string | null;
  description: string;
  due_date: string;
  amount_expected: number;
  status: ReceivableStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  church_id: string;
  receivable_id: string | null;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  received_by_profile_id: string | null;
  notes: string | null;
  created_at: string;
}

// ===== MEMBER HISTORY =====

export interface MemberTimeline {
  id: string;
  member_id: string;
  event_type: string;
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface OccurrenceType {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

export interface MemberOccurrence {
  id: string;
  member_id: string;
  occurrence_type_id: string;
  occurrence_date: string;
  happened_in_current_church: boolean;
  observation: string | null;
  created_at: string;
  occurrence_types?: OccurrenceType | null;
}

// ===== DEPARTMENTS =====

export interface DepartmentType {
  id: string;
  name: string;
  code: string;
}

export interface ChurchDepartment {
  id: string;
  church_id: string;
  department_type_id: string;
  leader_name: string | null;
  created_at: string;
  department_types?: DepartmentType | null;
}

// ===== ADMIN =====

export interface AdminRole {
  id: string;
  user_id: string;
  role: string | null;
  role_level: 0 | 1 | 2 | 3 | 4 | null;
  ministry_id: string | null;
  created_at: string;
}

// ===== SETTINGS =====

export interface SettingItem {
  id: string;
  name: string;
  created_at: string;
}

// ===== PORTAL TEOLÓGICO — NOVOS TIPOS (tabelas a criar) =====

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type EnrollmentStatus = "ENROLLED" | "COMPLETED" | "CANCELED";
export type VideoType = "none" | "youtube" | "direct" | "virtual";
export type CourseLevel = "iniciante" | "intermediario" | "avancado";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  module: "escola" | "cursos";
  status: CourseStatus;
  thumbnail_url: string | null;
  trailer_url: string | null;
  instructor_name: string | null;
  duration_hours: number | null;
  featured: boolean;
  level: CourseLevel;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  video_url: string | null;
  video_type: VideoType;
  video_duration_secs: number | null;
  thumbnail_url: string | null;
  is_free_preview: boolean;
  order_index: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  enrolled_at: string;
  completed_at: string | null;
}

// ===== EBD — ESCOLA BÍBLICA DOMINICAL =====

export type EbdAudience = "ADULTOS" | "JOVENS" | "ADOLESCENTES" | "JUNIORES" | "PRIMARIOS";
export type EbdPublisher = "CPAD" | "BETEL" | "PECC";

export interface EbdQuarter {
  id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  theme: string | null;
  audience: EbdAudience;
  publisher: EbdPublisher;
  lesson_count: number;
  created_at: string;
}

export interface EbdDailyReading {
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado";
  reference: string;
  description: string;
}

export interface EbdSubtopic {
  number: number;
  title: string;
  content: string;
}

export interface EbdTopic {
  number: number;
  title: string;
  subtopics: EbdSubtopic[];
  synopsis: string | null;
  bibliological_aid: string | null;
  knowledge_expansion: string | null;
}

export interface EbdReviewQuestion {
  number: number;
  question: string;
  answer: string;
}

export interface EbdLesson {
  id: string;
  quarter_id: string;
  lesson_number: number;
  title: string;
  aureo_text: string | null;
  aureo_reference: string | null;
  practical_truth: string | null;
  suggested_hymns: string | null;
  class_reading_ref: string | null;
  class_reading_text: string | null;
  lesson_plan: string | null;
  introduction: string | null;
  conclusion: string | null;
  daily_readings: EbdDailyReading[];
  topics: EbdTopic[];
  review_questions: EbdReviewQuestion[];
  source_url: string | null;
  video_url: string | null;
  video_type: VideoType;
  video_duration_secs: number | null;
  thumbnail_url: string | null;
  imported_at: string;
  created_at: string;
}

export interface EbdLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  read_at: string;
}
