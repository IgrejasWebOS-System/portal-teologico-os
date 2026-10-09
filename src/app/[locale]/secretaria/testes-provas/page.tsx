import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsSecretario } from "@/utils/secretaria";
import { carregarDadosTestesProvas } from "@/utils/provasPublicas/testesProvasDados";
import TestesProvasPainel from "@/components/provas/TestesProvasPainel";

export const metadata = { title: "Testes e Provas — Área da Secretaria" };
export const dynamic = "force-dynamic";

// ============================================================
// 09/10/2026, pedido do Joaquim: mesma tela do professor, para a secretaria
// do setor. Escopo: os alunos e matrículas que a RLS (client normal) deixa
// esta pessoa ver — mesmo princípio de /secretaria/alunos. Só depois disso
// as provas/respostas (service_role) desses alunos são lidas.
// ============================================================

export default async function TestesProvasSecretariaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const { data: alunosRaw } = await supabase
    .from("ead_alunos")
    .select("id, nome_completo, cpf, matricula")
    .order("nome_completo");
  const alunos = alunosRaw ?? [];
  const alunoIds = alunos.map((a) => a.id);

  const { data: matriculasRaw } = alunoIds.length
    ? await supabase
        .from("ead_matriculas")
        .select("aluno_id, course_edition_id, curso_nome_snapshot, course_editions(nome)")
        .in("aluno_id", alunoIds)
    : { data: [] };

  const matriculas = (matriculasRaw ?? []).map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ce = (Array.isArray(m.course_editions) ? m.course_editions[0] : m.course_editions) as any;
    return {
      aluno_id: m.aluno_id,
      course_edition_id: m.course_edition_id,
      turma_nome: (ce?.nome as string) ?? null,
      curso_nome: (m.curso_nome_snapshot as string) ?? null,
    };
  });

  const dados = await carregarDadosTestesProvas(createAdminClient(), alunos, matriculas);

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
