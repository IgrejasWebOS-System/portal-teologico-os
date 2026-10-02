import { createAdminClient } from "@/utils/supabase/admin";
import MatriculaTurmaForm from "./MatriculaTurmaForm";

export const metadata = { title: "Matrícula — CETADP" };

interface PageProps {
  params: Promise<{ token: string }>;
}

// ============================================================
// Rota pública (sem login) — mutirão de cadastro, 18/09/2026: link que o
// professor manda pros próprios alunos, já carimbado com professor+turma
// (professor_turmas.link_token). Mesmo espírito de /confirmar-cadastro:
// client admin, sem sessão, o token é a única "senha" de acesso ao link.
// ============================================================

export default async function MatriculaTurmaPage({ params }: PageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: vinculo } = await admin
    .from("professor_turmas")
    .select(
      "id, link_ativo, turno, dia_semana, professores(nome_completo), course_editions(nome, classe, unit_id, courses(title), units(name))"
    )
    .eq("link_token", token)
    .maybeSingle();

  if (!vinculo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-iw-navy">Link inválido — confira com quem te enviou.</p>
      </div>
    );
  }

  if (!vinculo.link_ativo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-iw-navy font-bold">Este link foi desativado</p>
          <p className="text-sm text-iw-muted">
            A turma pode ter mudado ou encerrado as matrículas. Fale com o professor que te
            enviou este link pra saber como proceder.
          </p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const professor = (Array.isArray(vinculo.professores) ? vinculo.professores[0] : vinculo.professores) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const turma = (Array.isArray(vinculo.course_editions) ? vinculo.course_editions[0] : vinculo.course_editions) as any;
  const curso = Array.isArray(turma?.courses) ? turma?.courses[0] : turma?.courses;
  const igreja = Array.isArray(turma?.units) ? turma?.units[0] : turma?.units;

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <p className="text-[13px] font-bold uppercase tracking-widest text-iw-gold">
            {igreja?.name ?? "Campo AD Brás Piracicaba"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
            Matrícula — {curso?.title ?? "Curso"}
          </h1>
          <p className="text-black text-sm mt-2 max-w-md mx-auto">
            Turma {turma?.nome ?? ""}
            {turma?.classe ? ` (Classe ${turma.classe})` : ""} · Professor(a) {professor?.nome_completo ?? "—"}
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
          <MatriculaTurmaForm token={token} cursoTitulo={curso?.title ?? "Curso"} />
        </div>
      </div>
    </div>
  );
}
