import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { professorLancarDespesaAction, professorExcluirDespesaAction } from "../actions";
import CaixaDoNucleoPainel, { type Movimentacao } from "./CaixaDoNucleoPainel";

export const metadata = { title: "Caixa do Núcleo — Área do Professor" };

// ============================================================
// /professor/caixa — Fase 2 do Painel do Professor, ajustada no mesmo
// dia (27/09/2026, pedido do Joaquim): virou um livro de movimentação
// normal — ENTRADAS (parcelas já dadas baixa, lidas de fin_contas_receber,
// sem duplicar dado) + SAÍDAS (despesas lançadas aqui, nucleo_despesas,
// migration 115). Sem abrir/fechar caixa e sem aprovação da secretaria
// pra despesas, conforme combinado.
// ============================================================

export default async function CaixaDoNucleoPage({
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

  const [{ data: despesasRaw }, { data: categoriasRaw }, { data: matriculas }] = await Promise.all([
    admin
      .from("nucleo_despesas")
      .select("id, descricao, valor_centavos, data_despesa, forma_pagamento, categoria_id, fin_categorias(nome)")
      .eq("professor_id", professor.id)
      .order("data_despesa", { ascending: false }),
    admin.from("fin_categorias").select("id, nome").eq("tipo", "DESPESA").eq("ativo", true).order("nome"),
    // 30/09/2026, pedido do Joaquim: mesmos filtros de turma/curso da tela
    // Financeiro — precisa do nome do curso/turma por matrícula aqui também.
    admin
      .from("ead_matriculas")
      .select("id, curso_nome_snapshot, course_edition_id, course_editions(nome)")
      .eq("professor_id", professor.id),
  ]);

  const listaMatriculas = matriculas ?? [];
  const matriculaIds = listaMatriculas.map((m) => m.id);
  const cursoPorMatriculaId = new Map(listaMatriculas.map((m) => [m.id, m.curso_nome_snapshot]));
  const turmaPorMatriculaId = new Map(
    listaMatriculas.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce = (Array.isArray(m.course_editions) ? m.course_editions[0] : m.course_editions) as any;
      return [m.id, ce?.nome ?? null];
    })
  );

  const { data: parcelasPagas } = matriculaIds.length
    ? await admin
        .from("fin_contas_receber")
        .select("id, descricao, valor_bruto_centavos, pago_em, data_vencimento, origem_id")
        .eq("origem_tipo", "MATRICULA_DIRETA")
        .eq("status", "PAGO")
        .in("origem_id", matriculaIds)
    : { data: [] };

  const entradas: Movimentacao[] = (parcelasPagas ?? []).map((p) => ({
    id: p.id,
    tipo: "ENTRADA" as const,
    descricao: p.descricao,
    valor_centavos: p.valor_bruto_centavos,
    // pago_em é timestamptz — usa só a data; cai pro vencimento se por
    // algum motivo pago_em não tiver sido preenchido.
    data: (p.pago_em ?? p.data_vencimento).slice(0, 10),
    categoriaNome: null,
    formaPagamento: null,
    excluivel: false,
    cursoNome: cursoPorMatriculaId.get(p.origem_id) ?? null,
    turmaNome: turmaPorMatriculaId.get(p.origem_id) ?? null,
  }));

  const saidas: Movimentacao[] = (despesasRaw ?? []).map((d) => ({
    id: d.id,
    tipo: "SAIDA" as const,
    descricao: d.descricao,
    valor_centavos: d.valor_centavos,
    data: d.data_despesa,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoriaNome: (Array.isArray(d.fin_categorias) ? d.fin_categorias[0] : d.fin_categorias as any)?.nome ?? null,
    formaPagamento: d.forma_pagamento,
    excluivel: true,
    // despesas do núcleo não são ligadas a uma matrícula/turma específica.
    cursoNome: null,
    turmaNome: null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-black text-iw-navy mb-1">Caixa do núcleo</h1>
      <p className="text-iw-muted text-sm mb-6">
        Entradas (parcelas já baixadas) e saídas (despesas lançadas) do seu núcleo de ensino.
      </p>

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

      <CaixaDoNucleoPainel
        movimentacoes={[...entradas, ...saidas]}
        categorias={categoriasRaw ?? []}
        lancarAction={professorLancarDespesaAction}
        excluirAction={professorExcluirDespesaAction}
      />
    </div>
  );
}
