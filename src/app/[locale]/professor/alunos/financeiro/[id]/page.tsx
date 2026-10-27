import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import EditorParcelasAluno from "@/components/financeiro/EditorParcelasAluno";
import { professorEditarParcelaAction } from "../../../actions";

export const metadata = { title: "Financeiro do aluno — Área do Professor" };
export const dynamic = "force-dynamic";

// 26/10/2026, pedido do Joaquim: botão FINANCEIRO em /professor/alunos para corrigir data e valor
// das parcelas. Só o professor dono do aluno (ead_matriculas.professor_id), mesma régua das
// outras telas do professor.
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; msg?: string }>;
}

export default async function FinanceiroAlunoProfessorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, msg } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();
  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, professor_id, matricula, curso_nome_snapshot, ead_alunos(nome_completo)")
    .eq("id", id)
    .maybeSingle();
  if (!matricula) notFound();
  if (matricula.professor_id !== professor.id) {
    redirect("/professor/alunos?error=" + encodeURIComponent("Esse aluno não pertence a você."));
  }

  const { data: parcelas } = await admin
    .from("fin_contas_receber")
    .select("id, descricao, numero_parcela, total_parcelas, valor_bruto_centavos, status, data_vencimento, pago_em, fin_lancamento_id")
    .eq("aluno_id", matricula.aluno_id)
    .order("data_vencimento", { ascending: true })
    .order("numero_parcela", { ascending: true });

  const aluno = (Array.isArray(matricula.ead_alunos) ? matricula.ead_alunos[0] : matricula.ead_alunos) as { nome_completo: string } | null;

  return (
    <EditorParcelasAluno
      alunoNome={aluno?.nome_completo ?? "Aluno"}
      matriculaNumero={matricula.matricula}
      curso={matricula.curso_nome_snapshot}
      matriculaId={matricula.id}
      alunoId={matricula.aluno_id}
      parcelas={parcelas ?? []}
      action={professorEditarParcelaAction}
      voltarHref="/professor/alunos"
      voltarLabel="Voltar para Meus Alunos"
      msg={msg ? decodeURIComponent(msg) : undefined}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
