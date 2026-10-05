import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import {
  professorBaixarParcelaAction,
  professorCriarContaPagarAction,
  professorBaixarContaPagarAction,
  professorCancelarContaPagarAction,
} from "../actions";
import FinanceiroDoNucleoPainel, { type ParcelaComAluno } from "./FinanceiroDoNucleoPainel";
import ContasAPagarNucleoPainel, { type ContaPagarNucleo } from "@/components/financeiro/ContasAPagarNucleoPainel";

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
  searchParams: Promise<{ msg?: string; error?: string; aba?: string }>;
}) {
  const { msg, error, aba: abaRaw } = await searchParams;
  const aba: "receber" | "pagar" = abaRaw === "pagar" ? "pagar" : "receber";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const abas = (
    <div className="flex items-center gap-2 mb-6">
      {(
        [
          ["receber", "Contas a Receber"],
          ["pagar", "Contas a Pagar"],
        ] as const
      ).map(([valor, label]) => (
        <Link
          key={valor}
          href={`?aba=${valor}`}
          className={`text-sm font-bold px-4 py-2 rounded-xl border transition-colors ${
            aba === valor ? "bg-black text-iw-gold border-black" : "bg-white text-black border-iw-border hover:bg-iw-bg"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  // Migration 129: Contas a Pagar do núcleo (fin_contas_pagar, church_id).
  if (aba === "pagar") {
    const [{ data: categoriasRaw }, { data: pagarRaw }] = await Promise.all([
      admin.from("fin_categorias").select("id, nome").eq("tipo", "DESPESA").eq("ativo", true).order("nome"),
      professor.church_id
        ? admin
            .from("fin_contas_pagar")
            .select("id, fornecedor, descricao, valor_centavos, data_vencimento, status, forma_pagamento_prevista, fin_categorias(nome)")
            .eq("church_id", professor.church_id)
            .order("data_vencimento")
        : Promise.resolve({ data: [] as never[] }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lista = (pagarRaw ?? []) as any[];
    const hoje = new Date().toISOString().slice(0, 10);
    const abertas = lista.filter((c) => c.status === "PENDENTE" || c.status === "ATRASADO");
    const emAbertoCentavos = abertas.reduce((a, c) => a + c.valor_centavos, 0);
    const atrasadoCentavos = abertas.filter((c) => c.data_vencimento < hoje).reduce((a, c) => a + c.valor_centavos, 0);
    const pagoCentavos = lista.filter((c) => c.status === "PAGO").reduce((a, c) => a + c.valor_centavos, 0);
    const fmtBRL = (cent: number) => (cent / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const contas: ContaPagarNucleo[] = lista.map((c) => ({
      id: c.id,
      nucleoNome: "",
      fornecedor: c.fornecedor,
      descricao: c.descricao,
      valorCentavos: c.valor_centavos,
      dataVencimento: c.data_vencimento,
      status: c.status,
      formaPrevista: c.forma_pagamento_prevista ?? null,
      categoriaNome: (Array.isArray(c.fin_categorias) ? c.fin_categorias[0] : c.fin_categorias)?.nome ?? null,
    }));

    return (
      <div>
        <h1 className="text-2xl font-black text-iw-navy mb-6">Financeiro do núcleo</h1>
        {abas}

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">A pagar (em aberto)</p>
            <p className="text-2xl font-black text-iw-error">{fmtBRL(emAbertoCentavos)}</p>
          </div>
          <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Atrasado</p>
            <p className="text-2xl font-black text-iw-error">{fmtBRL(atrasadoCentavos)}</p>
          </div>
          <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Pago</p>
            <p className="text-2xl font-black text-black">{fmtBRL(pagoCentavos)}</p>
          </div>
        </div>

        <ContasAPagarNucleoPainel
          contas={contas}
          categorias={categoriasRaw ?? []}
          criarAction={professorCriarContaPagarAction}
          baixarAction={professorBaixarContaPagarAction}
          cancelarAction={professorCancelarContaPagarAction}
        />
      </div>
    );
  }

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
      {abas}

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
