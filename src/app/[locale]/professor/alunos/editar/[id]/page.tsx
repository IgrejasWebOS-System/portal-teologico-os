import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import EditarMatriculaForm from "../../../../(admin)/admin/matriculas/[id]/EditarMatriculaForm";
import {
  professorAtualizarMatriculaAction,
  professorBaixarParcelaAction,
  professorCancelarParcelaAction,
  professorReativarParcelaAction,
  professorLancarPagamentoRetroativoAction,
  professorGerarParcelasMensalidadeAction,
  professorCancelarMatriculaAction,
} from "../../../actions";

export const metadata = { title: "Editar aluno — Área do Professor" };

// ============================================================
// 28/09/2026, pedido do Joaquim: "preciso editar aluno, para corrigir
// dados caso cadastre informação errada pessoal, curso e finaceiro,
// igreja setor, ou seja edição completa" — a partir de /professor/alunos
// ("Editar cadastro completo"). Reaproveita a MESMA tela que a secretaria
// usa em /admin/matriculas/[id] (EditarMatriculaForm.tsx), agora
// parametrizada com as 5 ações escopadas ao professor (ver
// professor/actions.ts) em vez das staff-only — cada uma confere posse
// (ead_matriculas.professor_id === professor.id) antes de mexer em
// qualquer dado. Curso não é editável aqui (mesma trava do admin); Turma
// só pode trocar pra outra turma que este professor já leciona;
// Professor(a) fica travado nele mesmo (ver EditarMatriculaForm:
// travarProfessorId).
// ============================================================

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; msg?: string }>;
}

export default async function EditarAlunoProfessorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, msg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("*, ead_alunos(*)")
    .eq("id", id)
    .maybeSingle();

  if (!matricula) notFound();
  // Posse: só edita aluno vinculado a este professor — mesma régua de
  // todas as outras ações da Área do Professor.
  if (matricula.professor_id !== professor.id) {
    redirect("/professor/alunos?error=" + encodeURIComponent("Esse aluno não pertence a você."));
  }

  const [
    { data: campos },
    { data: churches },
    { data: setores },
    { data: turmasRaw },
    { data: profissoes },
    { data: escolaridades },
    { data: generos },
    { data: estadosCivis },
    { data: pagamentos },
  ] = await Promise.all([
    admin.from("ead_campos_ministerios").select("id, nome, tipo").eq("ativo", true).order("nome"),
    admin.from("churches").select("id, name, sector_id").order("name"),
    admin.from("sectors").select("id, name").order("name"),
    // Professor só pode mover o aluno pra uma turma que ele próprio
    // leciona (mesma fonte de verdade de professorCriarMatriculaAction:
    // professor_turmas, não "todas as turmas do sistema").
    admin
      .from("professor_turmas")
      .select("course_edition_id, course_editions(id, nome, course_id)")
      .eq("professor_id", professor.id),
    admin.from("settings_professions").select("id, name").order("name"),
    admin.from("settings_schooling").select("id, name").order("name"),
    admin.from("settings_gender").select("id, name").order("name"),
    admin.from("settings_civil_status").select("id, name").order("name"),
    admin
      .from("fin_contas_receber")
      .select("id, descricao, valor_bruto_centavos, status, forma_pagamento_prevista, data_vencimento, pago_em, numero_parcela, total_parcelas")
      .eq("aluno_id", matricula.aluno_id)
      .order("data_vencimento", { ascending: true })
      .order("numero_parcela", { ascending: true }),
  ]);

  const turmas = (turmasRaw ?? [])
    .map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce = (Array.isArray(t.course_editions) ? t.course_editions[0] : t.course_editions) as any;
      return ce ? { id: ce.id as string, nome: ce.nome as string, course_id: ce.course_id as string } : null;
    })
    .filter((t): t is { id: string; nome: string; course_id: string } => t !== null);

  return (
    <EditarMatriculaForm
      matricula={matricula}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aluno={(matricula as any).ead_alunos}
      campos={campos ?? []}
      churches={churches ?? []}
      setores={setores ?? []}
      turmas={turmas}
      professores={[]}
      profissoes={profissoes ?? []}
      escolaridades={escolaridades ?? []}
      generos={generos ?? []}
      estadosCivis={estadosCivis ?? []}
      pagamentos={pagamentos ?? []}
      caixaAbertoId=""
      errorMsg={error ? decodeURIComponent(error) : undefined}
      successMsg={msg ? decodeURIComponent(msg) : undefined}
      voltarPara="/professor/alunos"
      voltarLabel="Voltar para Meus Alunos"
      action={professorAtualizarMatriculaAction}
      baixarParcelaAction={professorBaixarParcelaAction}
      cancelarParcelaAction={professorCancelarParcelaAction}
      reativarParcelaAction={professorReativarParcelaAction}
      lancarPagamentoRetroativoAction={professorLancarPagamentoRetroativoAction}
      gerarParcelasMensalidadeAction={professorGerarParcelasMensalidadeAction}
      cancelarMatriculaAction={professorCancelarMatriculaAction}
      travarProfessorId={professor.id}
      professorNomeExibicao={professor.nome_completo}
      redirectToBaixa={`/professor/alunos/editar/${id}`}
    />
  );
}
