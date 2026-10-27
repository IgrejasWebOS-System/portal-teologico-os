import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import EditorParcelasAluno from "@/components/financeiro/EditorParcelasAluno";
import { editarParcelaMatriculaAction } from "../../actions";

export const metadata = { title: "Financeiro do aluno — CETADP" };
export const dynamic = "force-dynamic";

// 26/10/2026, pedido do Joaquim: botão FINANCEIRO (secretaria e admin) para corrigir data e valor
// das parcelas. Cliente normal: a RLS limita a matrícula (e as parcelas) ao escopo do operador; a
// ação ainda re-checa o escopo (assertAlunoNoEscopo) antes de gravar.
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; msg?: string; voltarPara?: string; voltarLabel?: string }>;
}

export default async function FinanceiroAlunoStaffPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, msg, voltarPara, voltarLabel } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await checkIsStaff(supabase, user.id))) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const { data: matricula } = await supabase
    .from("ead_matriculas")
    .select("id, aluno_id, matricula, curso_nome_snapshot, ead_alunos(nome_completo)")
    .eq("id", id)
    .maybeSingle();
  if (!matricula) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-iw-navy font-bold">Matrícula não encontrada ou fora do seu escopo.</p>
      </div>
    );
  }

  const { data: parcelas } = await supabase
    .from("fin_contas_receber")
    .select("id, descricao, numero_parcela, total_parcelas, valor_bruto_centavos, status, data_vencimento, pago_em, fin_lancamento_id")
    .eq("aluno_id", matricula.aluno_id)
    .order("data_vencimento", { ascending: true })
    .order("numero_parcela", { ascending: true });

  const aluno = (Array.isArray(matricula.ead_alunos) ? matricula.ead_alunos[0] : matricula.ead_alunos) as { nome_completo: string } | null;
  const base = `/admin/matriculas/${id}`;

  return (
    <EditorParcelasAluno
      alunoNome={aluno?.nome_completo ?? "Aluno"}
      matriculaNumero={matricula.matricula}
      curso={matricula.curso_nome_snapshot}
      matriculaId={matricula.id}
      alunoId={matricula.aluno_id}
      parcelas={parcelas ?? []}
      action={editarParcelaMatriculaAction}
      voltarHref={voltarPara ? decodeURIComponent(voltarPara) : base}
      voltarLabel={voltarLabel ? `Voltar para ${decodeURIComponent(voltarLabel)}` : "Voltar para a matrícula"}
      msg={msg ? decodeURIComponent(msg) : undefined}
      error={error ? decodeURIComponent(error) : undefined}
    />
  );
}
