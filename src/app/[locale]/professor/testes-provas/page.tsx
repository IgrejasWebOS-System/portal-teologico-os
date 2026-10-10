import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { carregarDadosTestesProvas } from "@/utils/provasPublicas/testesProvasDados";
import TestesProvasPainel from "@/components/provas/TestesProvasPainel";

export const metadata = { title: "Testes e Provas — Área do Professor" };
export const dynamic = "force-dynamic";

// ============================================================
// 09/10/2026, pedido do Joaquim: o professor envia os links das provas (o
// aluno faz sem login, por CPF) e consulta/imprime as provas dos próprios
// alunos. Escopo: só alunos com matrícula vinculada a este professor
// (ead_matriculas.professor_id), mesma régua das outras telas do professor.
// ============================================================

export default async function TestesProvasProfessorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const { data: matriculasRaw } = await admin
    .from("ead_matriculas")
    .select("aluno_id, professor_id, course_edition_id, curso_nome_snapshot, course_editions(nome)")
    .eq("professor_id", professor.id);

  const matriculas = (matriculasRaw ?? []).map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ce = (Array.isArray(m.course_editions) ? m.course_editions[0] : m.course_editions) as any;
    return {
      aluno_id: m.aluno_id,
      professor_id: (m.professor_id as string | null) ?? null,
      course_edition_id: m.course_edition_id,
      turma_nome: (ce?.nome as string) ?? null,
      curso_nome: (m.curso_nome_snapshot as string) ?? null,
    };
  });

  const alunoIds = Array.from(new Set(matriculas.map((m) => m.aluno_id)));
  const { data: alunosRaw } = alunoIds.length
    ? await admin.from("ead_alunos").select("id, nome_completo, cpf, matricula").in("id", alunoIds)
    : { data: [] };

  const dados = await carregarDadosTestesProvas(admin, alunosRaw ?? [], matriculas);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-iw-gold" />
        </div>
        <h1 className="text-2xl font-black text-black">
          Testes e Provas <span className="text-lg font-black text-black">- Links das provas</span>
        </h1>
      </div>
      <TestesProvasPainel {...dados} />
    </div>
  );
}
