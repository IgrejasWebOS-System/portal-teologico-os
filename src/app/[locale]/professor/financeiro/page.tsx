import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { professorBaixarParcelaAction } from "../actions";
import FinanceiroDoNucleoPainel, { type ParcelaComAluno } from "./FinanceiroDoNucleoPainel";

export const metadata = { title: "Financeiro — Área do Professor" };

// ============================================================
// /professor/financeiro (27/09/2026, Fase 1 do Painel do Professor) —
// nova, mas monta em cima de dado que já existia espalhado dentro de
// ProfessorPainel.tsx (fin_contas_receber por matrícula do professor).
// Fica de fora de propósito: Caixa do núcleo / Despesas do núcleo
// (Fase 2 — schema ainda não tem church_id/unit_id em fin_contas_pagar
// nem em fin_caixa_diario).
// ============================================================

export default async function FinanceiroDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const { data: matriculas } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, curso_nome_snapshot, course_edition_id, course_editions(nome)")
    .eq("professor_id", professor.id);

  const listaMatriculas = matriculas ?? [];
  const alunoIds = Array.from(new Set(listaMatriculas.map((m) => m.aluno_id)));
  const matriculaIds = listaMatriculas.map((m) => m.id);

  const [alunosRes, contasRes] = await Promise.all([
    alunoIds.length
      ? admin.from("ead_alunos").select("id, nome_completo").in("id", alunoIds)
      : Promise.resolve({ data: [] }),
    matriculaIds.length
      ? admin
          .from("fin_contas_receber")
          .select("id, origem_id, numero_parcela, total_parcelas, descricao, valor_bruto_centavos, data_vencimento, status")
          .eq("origem_tipo", "MATRICULA_DIRETA")
          .in("origem_id", matriculaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const alunoPorMatriculaId = new Map(listaMatriculas.map((m) => [m.id, m.aluno_id]));
  const nomePorAlunoId = new Map((alunosRes.data ?? []).map((a) => [a.id, a.nome_completo]));
  // 27/09/2026, pedido do Joaquim: filtros por curso e por turma na tela —
  // curso vem de curso_nome_snapshot (já gravado por matrícula), turma vem
  // do nome da course_edition vinculada (quando existir).
  const cursoPorMatriculaId = new Map(listaMatriculas.map((m) => [m.id, m.curso_nome_snapshot]));
  const turmaPorMatriculaId = new Map(
    listaMatriculas.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce = (Array.isArray(m.course_editions) ? m.course_editions[0] : m.course_editions) as any;
      return [m.id, ce?.nome ?? null];
    })
  );

  const parcelas: ParcelaComAluno[] = (contasRes.data ?? []).map((c) => ({
    id: c.id,
    numero_parcela: c.numero_parcela,
    total_parcelas: c.total_parcelas,
    descricao: c.descricao,
    valor_bruto_centavos: c.valor_bruto_centavos,
    data_vencimento: c.data_vencimento,
    status: c.status,
    alunoNome: nomePorAlunoId.get(alunoPorMatriculaId.get(c.origem_id) ?? "") ?? "—",
    cursoNome: cursoPorMatriculaId.get(c.origem_id) ?? "—",
    turmaNome: turmaPorMatriculaId.get(c.origem_id) ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-black text-iw-navy mb-6">Financeiro do núcleo</h1>

      {msg && (
        <div className="mb-6 flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <FinanceiroDoNucleoPainel parcelas={parcelas} baixarParcelaAction={professorBaixarParcelaAction} />
    </div>
  );
}
