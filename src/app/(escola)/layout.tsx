import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AutoLogout from "@/components/security/AutoLogout";
import AreaDoAlunoPainel from "@/components/aluno/AreaDoAlunoPainel";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function EscolaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alunoPainel: React.ReactNode = null;

  if (user) {
    const { data: aluno } = await supabase
      .from("ead_alunos")
      .select("id, nome_completo, cpf, email, telefone, campo_ministerio_nome, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (aluno) {
      const { data: matriculasRaw } = await supabase
        .from("ead_matriculas")
        .select("id, curso_nome_snapshot, matricula, status, data_matricula")
        .eq("aluno_id", aluno.id)
        .order("data_matricula", { ascending: false });

      const matriculaIds =
        (matriculasRaw ?? []).length > 0
          ? (matriculasRaw ?? []).map((m) => m.id)
          : ["00000000-0000-0000-0000-000000000000"];

      // fin_contas_receber só tem policy de staff — usa o client admin
      // aqui, sempre filtrado pelo aluno_id já validado acima (a ficha
      // do próprio usuário logado, confirmada via RLS na consulta
      // anterior), então não vaza dado de outro aluno.
      const admin = createAdminClient();

      const [{ data: parcelasRaw }, { data: avaliacoesRaw }] = await Promise.all([
        admin
          .from("fin_contas_receber")
          .select("descricao, numero_parcela, total_parcelas, valor_bruto_centavos, status, data_vencimento, responsavel_pagamento")
          .eq("aluno_id", aluno.id)
          .order("data_vencimento", { ascending: true }),
        supabase
          .from("avaliacoes")
          .select("tipo, status, nota, aprovado, num_questoes, acertos, finalizada_em")
          .in("matricula_id", matriculaIds)
          .order("iniciada_em", { ascending: false }),
      ]);

      alunoPainel = (
        <Suspense fallback={null}>
          <AreaDoAlunoPainel
            aluno={{
              nomeCompleto: aluno.nome_completo,
              cpf: aluno.cpf,
              email: aluno.email,
              telefone: aluno.telefone,
              campoMinisterioNome: aluno.campo_ministerio_nome,
              status: aluno.status,
            }}
            matriculas={(matriculasRaw ?? []).map((m) => ({
              id: m.id,
              cursoNomeSnapshot: m.curso_nome_snapshot,
              matricula: m.matricula,
              status: m.status,
              dataMatricula: m.data_matricula,
            }))}
            parcelas={(parcelasRaw ?? []).map((p) => ({
              descricao: p.descricao,
              numeroParcela: p.numero_parcela,
              totalParcelas: p.total_parcelas,
              valorBrutoCentavos: p.valor_bruto_centavos,
              status: p.status,
              dataVencimento: p.data_vencimento,
              responsavelPagamento: p.responsavel_pagamento,
            }))}
            avaliacoes={(avaliacoesRaw ?? []).map((a) => ({
              tipo: a.tipo,
              status: a.status,
              nota: a.nota,
              aprovado: a.aprovado,
              numQuestoes: a.num_questoes,
              acertos: a.acertos,
              finalizadaEm: a.finalizada_em,
            }))}
          />
        </Suspense>
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-iw-bg">
      <AutoLogout />
      <Sidebar />
      {alunoPainel}
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
