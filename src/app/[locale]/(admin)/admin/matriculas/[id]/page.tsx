import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import EditarMatriculaForm from "./EditarMatriculaForm";

export const metadata = { title: "Editar Matrícula — CETADP" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; msg?: string }>;
}

export default async function EditarMatriculaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, msg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const { data: matricula } = await supabase
    .from("ead_matriculas")
    .select("*, ead_alunos(*)")
    .eq("id", id)
    .maybeSingle();

  if (!matricula) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-iw-navy font-bold">Matrícula não encontrada.</p>
      </div>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);

  const [
    { data: campos },
    { data: churches },
    { data: setores },
    { data: turmas },
    { data: professores },
    { data: pagamentos },
    { data: caixaHoje },
  ] = await Promise.all([
    supabase.from("ead_campos_ministerios").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("churches").select("id, name, sector_id").order("name"),
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("course_editions").select("id, nome, course_id").order("nome"),
    supabase.from("professores").select("id, nome_completo, church_id").order("nome_completo"),
    supabase
      .from("fin_contas_receber")
      .select("id, descricao, valor_bruto_centavos, status, forma_pagamento_prevista, data_vencimento, pago_em, numero_parcela, total_parcelas")
      .eq("aluno_id", matricula.aluno_id)
      .order("created_at", { ascending: false }),
    supabase.from("fin_caixa_diario").select("id, status").eq("data", hoje).maybeSingle(),
  ]);

  const caixaAbertoId = caixaHoje?.status === "ABERTO" ? caixaHoje.id : "";

  return (
    <EditarMatriculaForm
      matricula={matricula}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aluno={(matricula as any).ead_alunos}
      campos={campos ?? []}
      churches={churches ?? []}
      setores={setores ?? []}
      turmas={turmas ?? []}
      professores={professores ?? []}
      pagamentos={pagamentos ?? []}
      caixaAbertoId={caixaAbertoId}
      errorMsg={error ? decodeURIComponent(error) : undefined}
      successMsg={msg ? decodeURIComponent(msg) : undefined}
    />
  );
}
