import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Wallet,
  Receipt,
  Banknote,
  ShoppingBag,
  GraduationCap,
  BarChart3,
  PieChart,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import MonthlyBarChart from "@/components/admin/dashboard/MonthlyBarChart";
import BreakdownBars from "@/components/admin/dashboard/BreakdownBars";
import { contarPorMes, somarPorMes } from "@/utils/dashboard/agrupar-por-mes";
import {
  montarRelatorioGlobal,
  type AlunoInfo,
  type MatriculaInfo,
  type TurmaSemAluno,
} from "@/utils/dashboard/relatorio-hierarquico";
import RelatorioGlobalHierarquico from "./RelatorioGlobalHierarquico";
import EstoqueMateriaisPainel from "./EstoqueMateriaisPainel";
import PedidosMaterialAdminPainel from "./PedidosMaterialAdminPainel";

export const metadata = { title: "Dashboard — CETADP" };

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ORIGEM_LABEL: Record<string, string> = {
  INSCRICAO_PUBLICA: "Inscrição pública",
  MATRICULA_DIRETA: "Matrícula direta (secretaria)",
  AUTO_MATRICULA: "Auto-matrícula (portal)",
};

const STATUS_CONTA_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ATRASADO: "Atrasado",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const STATUS_CONTA_COR: Record<string, string> = {
  PENDENTE: "bg-iw-blue",
  ATRASADO: "bg-iw-error",
  PAGO: "bg-iw-success",
  CANCELADO: "bg-iw-muted",
};

export default async function AdminDashboardPage() {
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

  // 04/10/2026, "Secretário de Setor" — este Dashboard mostra Sede/
  // Setor/Regional do sistema INTEIRO, sem nenhum filtro de escopo (faz
  // sentido só pro GLOBAL_ADMIN). Um secretário escopado (level 1-3)
  // que caia aqui (login antigo em cache, link salvo, digitando a URL)
  // é mandado pro Dashboard dele (/secretaria), que já mostra os
  // mesmos números só que corretos pro escopo dele.
  const secretario = await checkIsSecretario(supabase, user.id);
  if (secretario) {
    redirect("/secretaria");
  }

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const seiMesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 5, 1).toISOString();
  const hoje = agora.toISOString().slice(0, 10);

  // ---------- KPIs ----------
  const [
    { count: alunosAtivos },
    { count: matriculasEmAndamento },
    { count: novasMatriculasMes },
    { data: contasPagasMes },
    { data: contasAbertas },
    { data: contasPagarAbertas },
    { data: vendasLojaMes },
    { data: caixaHoje },
  ] = await Promise.all([
    supabase.from("ead_alunos").select("id", { count: "exact", head: true }).eq("status", "ATIVO"),
    supabase.from("ead_matriculas").select("id", { count: "exact", head: true }).eq("status", "EM_ANDAMENTO"),
    supabase.from("ead_matriculas").select("id", { count: "exact", head: true }).gte("created_at", inicioMes),
    supabase
      .from("fin_contas_receber")
      .select("valor_liquido_centavos, valor_bruto_centavos")
      .eq("status", "PAGO")
      .gte("pago_em", inicioMes),
    supabase.from("fin_contas_receber").select("valor_bruto_centavos").in("status", ["PENDENTE", "ATRASADO"]),
    supabase.from("fin_contas_pagar").select("valor_centavos").in("status", ["PENDENTE", "ATRASADO"]),
    supabase
      .from("orders")
      .select("total_centavos")
      .eq("status", "PAGO")
      .gte("paid_at", inicioMes),
    supabase
      .from("fin_caixa_diario")
      .select("id, status, saldo_inicial_centavos, saldo_final_centavos")
      .eq("data", hoje)
      .maybeSingle(),
  ]);

  const receitaMes = (contasPagasMes ?? []).reduce(
    (a, c) => a + (c.valor_liquido_centavos ?? c.valor_bruto_centavos ?? 0),
    0
  );
  const totalAReceber = (contasAbertas ?? []).reduce((a, c) => a + c.valor_bruto_centavos, 0);
  const totalAPagar = (contasPagarAbertas ?? []).reduce((a, c) => a + c.valor_centavos, 0);
  const totalVendasLoja = (vendasLojaMes ?? []).reduce((a, o) => a + o.total_centavos, 0);
  const qtdVendasLoja = (vendasLojaMes ?? []).length;

  let saldoCaixaHoje: number | null = null;
  if (caixaHoje) {
    const { data: lancamentos } = await supabase
      .from("fin_lancamentos")
      .select("tipo, valor_centavos")
      .eq("caixa_diario_id", caixaHoje.id);
    const entradas = (lancamentos ?? []).filter((l) => l.tipo === "ENTRADA").reduce((a, l) => a + l.valor_centavos, 0);
    const saidas = (lancamentos ?? []).filter((l) => l.tipo === "SAIDA").reduce((a, l) => a + l.valor_centavos, 0);
    saldoCaixaHoje = caixaHoje.saldo_final_centavos ?? caixaHoje.saldo_inicial_centavos + entradas - saidas;
  }

  // ---------- Gráficos ----------
  const [{ data: matriculas6m }, { data: contasReceber6m }, { data: matriculasTodas }] = await Promise.all([
    supabase.from("ead_matriculas").select("created_at").gte("created_at", seiMesesAtras),
    supabase
      .from("fin_contas_receber")
      .select("pago_em, valor_liquido_centavos, valor_bruto_centavos")
      .eq("status", "PAGO")
      .gte("pago_em", seiMesesAtras),
    supabase.from("ead_matriculas").select("curso_nome_snapshot, origem"),
  ]);

  const matriculasPorMes = contarPorMes(
    (matriculas6m ?? []).map((m) => m.created_at),
    6
  );

  const receitaPorMes = somarPorMes(
    (contasReceber6m ?? []).map((c) => ({
      data: c.pago_em,
      valor: c.valor_liquido_centavos ?? c.valor_bruto_centavos ?? 0,
    })),
    6
  );

  const cursoContagem = new Map<string, number>();
  const origemContagem = new Map<string, number>();
  for (const m of matriculasTodas ?? []) {
    const curso = m.curso_nome_snapshot || "Não identificado";
    cursoContagem.set(curso, (cursoContagem.get(curso) ?? 0) + 1);
    const origem = ORIGEM_LABEL[m.origem] ?? m.origem;
    origemContagem.set(origem, (origemContagem.get(origem) ?? 0) + 1);
  }
  const matriculasPorCurso = Array.from(cursoContagem, ([label, value]) => ({ label, value })).slice(0, 8);
  const origemMatriculas = Array.from(origemContagem, ([label, value]) => ({ label, value }));

  // ---------- Relatório Global hierárquico (08/10/2026, pedido do Joaquim,
  // base: Relatório Cetadp Setembro 2026). SEDE → Turma → Aluno;
  // SETOR/REGIONAL → Setor/Regional → Igreja → Turma → Aluno. A árvore é
  // montada em utils/dashboard/relatorio-hierarquico.ts e desenhada em
  // RelatorioGlobalHierarquico.tsx. Matrículas CANCELADAS ficam de fora.
  const [
    { data: alunosSetor },
    { data: matriculasSetor },
    { data: contasReceberTodas },
  ] = await Promise.all([
    supabase.from("ead_alunos").select("id, nome_completo, sector_id, church_id, sectors(name), churches(name, is_sede)"),
    supabase.from("ead_matriculas").select("id, aluno_id, status, curso_nome_snapshot, course_edition_id"),
    supabase.from("fin_contas_receber").select("origem_id, valor_bruto_centavos, status"),
  ]);

  const alunoInfo = new Map<string, AlunoInfo>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (alunosSetor ?? []).map((a: any) => [a.id as string, a as AlunoInfo])
  );
  const financeiroPorMatricula = new Map<string, { aPagar: number; pago: number }>();
  for (const c of contasReceberTodas ?? []) {
    const atual = financeiroPorMatricula.get(c.origem_id) ?? { aPagar: 0, pago: 0 };
    atual.aPagar += c.valor_bruto_centavos;
    if (c.status === "PAGO") atual.pago += c.valor_bruto_centavos;
    financeiroPorMatricula.set(c.origem_id, atual);
  }

  // Nome da turma (course_editions) só das edições realmente usadas — a
  // tabela tem milhares de linhas, então busca por id.
  const edicaoIds = Array.from(
    new Set((matriculasSetor ?? []).map((m) => m.course_edition_id).filter((x): x is string => !!x))
  );
  const { data: edicoesUsadas } = edicaoIds.length
    ? await supabase.from("course_editions").select("id, nome").in("id", edicaoIds)
    : { data: [] as { id: string; nome: string | null }[] };
  const nomeTurmaPorEdicao = new Map<string, string>(
    (edicoesUsadas ?? []).map((e) => [e.id as string, (e.nome as string | null) ?? "Turma sem nome"])
  );

  // Turmas do ano corrente que ainda não têm nenhum aluno ativo: entram no
  // relatório com zeros, para o Dashboard listar as mesmas regionais,
  // setores e igrejas da tela de Turmas (08/10/2026, pedido do Joaquim).
  const anoRelatorio = new Date().getFullYear();
  const { data: edicoesAno } = await supabase
    .from("course_editions")
    .select("id, nome, unit_id")
    .eq("ano", anoRelatorio);
  const edicoesComAluno = new Set(
    (matriculasSetor ?? []).filter((m) => m.status !== "CANCELADO" && m.course_edition_id).map((m) => m.course_edition_id as string)
  );
  const unidadeIds = Array.from(new Set((edicoesAno ?? []).map((e) => e.unit_id).filter((x): x is string => !!x)));
  const { data: unidadesAno } = unidadeIds.length
    ? await supabase.from("units").select("id, name, type, parent_id").in("id", unidadeIds)
    : { data: [] as { id: string; name: string; type: string; parent_id: string | null }[] };
  const paiIds = Array.from(
    new Set((unidadesAno ?? []).map((u) => u.parent_id).filter((x): x is string => !!x))
  );
  const { data: paisAno } = paiIds.length
    ? await supabase.from("units").select("id, name").in("id", paiIds)
    : { data: [] as { id: string; name: string }[] };
  const unidadePorId = new Map((unidadesAno ?? []).map((u) => [u.id as string, u]));
  const paiPorId = new Map((paisAno ?? []).map((p) => [p.id as string, p.name as string]));

  const turmasSemAluno: TurmaSemAluno[] = [];
  for (const e of edicoesAno ?? []) {
    if (edicoesComAluno.has(e.id)) continue;
    const unidade = e.unit_id ? unidadePorId.get(e.unit_id) : undefined;
    if (!unidade) continue;
    const setorNome = unidade.parent_id ? paiPorId.get(unidade.parent_id) ?? null : null;
    const tipo: TurmaSemAluno["tipo"] =
      unidade.type === "SEDE"
        ? "SEDE"
        : (setorNome ?? "").toUpperCase().startsWith("REGIONAL")
          ? "REGIONAL"
          : "SETOR";
    turmasSemAluno.push({
      tipo,
      setor: setorNome,
      igreja: unidade.name as string,
      turma: ((e.nome as string | null) ?? "Turma sem nome") as string,
    });
  }

  const relatorioGlobal = montarRelatorioGlobal({
    matriculas: (matriculasSetor ?? []) as MatriculaInfo[],
    alunos: alunoInfo,
    financeiroPorMatricula,
    nomeTurmaPorEdicao,
    turmasSemAluno,
  });

  // ---------- Estoque de material didático (por AULA — migration 122) ----------
  const [
    { data: materiaisRaw },
    { data: cursosParaMaterial },
    { data: licoesRaw },
    { data: matriculasPorCursoRaw },
    { data: pedidosMaterialRaw },
  ] = await Promise.all([
    supabase
      .from("materiais_didaticos")
      .select("id, nome, tipo, curso_id, lesson_id, estoque_atual, courses(title), lessons(title)")
      .order("nome"),
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("lessons").select("id, title, course_id").order("order_index"),
    supabase.from("ead_matriculas").select("course_id").eq("status", "EM_ANDAMENTO"),
    supabase
      .from("pedidos_material")
      .select(
        "id, status, quantidade_solicitada, alunos_em_andamento_snapshot, observacao, created_at, material_id, course_edition_id, lesson_id, course_editions(nome, classe, courses(title)), lessons(title), materiais_didaticos(nome)"
      )
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const alunosPorCurso = new Map<string, number>();
  for (const m of matriculasPorCursoRaw ?? []) {
    if (!m.course_id) continue;
    alunosPorCurso.set(m.course_id, (alunosPorCurso.get(m.course_id) ?? 0) + 1);
  }

  const materiais = (materiaisRaw ?? []).map((m) => {
    const alunos = m.curso_id ? alunosPorCurso.get(m.curso_id) ?? 0 : 0;
    return {
      id: m.id,
      nome: m.nome,
      tipo: m.tipo as "LIVRO" | "PROVA",
      curso_id: m.curso_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      curso_titulo: (m.courses as any)?.title ?? null,
      lesson_id: m.lesson_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      licao_titulo: (m.lessons as any)?.title ?? null,
      estoque_atual: m.estoque_atual,
      alunos,
      imprimir: Math.max(0, alunos - m.estoque_atual),
    };
  });

  const licoesParaMaterial = (licoesRaw ?? []).map((l) => ({ id: l.id, title: l.title, course_id: l.course_id }));

  const pedidosMaterial = (pedidosMaterialRaw ?? []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edition = (Array.isArray(p.course_editions) ? p.course_editions[0] : p.course_editions) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const licao = (Array.isArray(p.lessons) ? p.lessons[0] : p.lessons) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const material = (Array.isArray(p.materiais_didaticos) ? p.materiais_didaticos[0] : p.materiais_didaticos) as any;
    return {
      id: p.id,
      turma_label: `${edition?.courses?.title ?? "Curso"} — ${edition?.nome ?? ""}${edition?.classe ? ` (Classe ${edition.classe})` : ""}`,
      aula_titulo: licao?.title ?? "—",
      material_nome: material?.nome ?? null,
      alunos_em_andamento_snapshot: p.alunos_em_andamento_snapshot,
      quantidade_solicitada: p.quantidade_solicitada,
      status: p.status as "SOLICITADO" | "ENVIADO_GRAFICA" | "RECEBIDO" | "CANCELADO",
      observacao: p.observacao,
      created_at: p.created_at,
    };
  });

  const { data: contasReceberStatus } = await supabase.from("fin_contas_receber").select("status, valor_bruto_centavos");
  const statusContagem = new Map<string, number>();
  for (const c of contasReceberStatus ?? []) {
    statusContagem.set(c.status, (statusContagem.get(c.status) ?? 0) + c.valor_bruto_centavos);
  }
  const statusContasReceber = Array.from(statusContagem, ([status, value]) => ({
    label: STATUS_CONTA_LABEL[status] ?? status,
    value,
    color: STATUS_CONTA_COR[status],
  }));

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Visão geral administrativa, financeira e acadêmica do CETADP."
      />

      {/* 30/09/2026, pedido do Joaquim: quadro de gerenciamento (relatório
          Global + estoque + pedidos de material) é o PRIMEIRO bloco do
          Dashboard, antes dos KPIs/gráficos.
          08/10/2026: o Relatório Global passou a ser hierárquico (SEDE →
          Turma → Aluno; SETOR/REGIONAL → Setor/Regional → Igreja → Turma →
          Aluno), com Básico/Médio lado a lado (alunos e valor). */}
      <RelatorioGlobalHierarquico dados={relatorioGlobal} />

      <EstoqueMateriaisPainel materiais={materiais} cursos={cursosParaMaterial ?? []} licoes={licoesParaMaterial} />
      <PedidosMaterialAdminPainel pedidos={pedidosMaterial} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Alunos ativos"
          value={String(alunosAtivos ?? 0)}
          color="text-iw-navy"
          bg="bg-iw-navy/10"
        />
        <KpiCard
          icon={UserCheck}
          label="Matrículas em andamento"
          value={String(matriculasEmAndamento ?? 0)}
          color="text-iw-navy"
          bg="bg-iw-blue/10"
        />
        <KpiCard
          icon={GraduationCap}
          label="Novas matrículas (mês)"
          value={String(novasMatriculasMes ?? 0)}
          color="text-iw-gold"
          bg="bg-iw-gold/10"
        />
        <KpiCard
          icon={Wallet}
          label="Receita confirmada (mês)"
          value={fmt(receitaMes)}
          color="text-iw-success"
          bg="bg-iw-success/10"
        />
        <KpiCard
          icon={Receipt}
          label="Contas a receber em aberto"
          value={fmt(totalAReceber)}
          color="text-iw-error"
          bg="bg-iw-error/10"
        />
        <KpiCard
          icon={Banknote}
          label="Contas a pagar em aberto"
          value={fmt(totalAPagar)}
          color="text-iw-error"
          bg="bg-iw-error/10"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Vendas da loja (mês)"
          value={fmt(totalVendasLoja)}
          sublabel={`${qtdVendasLoja} pedido${qtdVendasLoja === 1 ? "" : "s"}`}
          color="text-iw-gold"
          bg="bg-iw-gold/10"
        />
        <KpiCard
          icon={Wallet}
          label="Caixa de hoje"
          value={saldoCaixaHoje != null ? fmt(saldoCaixaHoje) : "—"}
          sublabel={caixaHoje ? (caixaHoje.status === "ABERTO" ? "Aberto" : "Fechado") : "Ainda não aberto"}
          color="text-iw-navy"
          bg="bg-iw-navy/10"
        />
      </div>

      {/* Gráficos de tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-iw-navy" />
            <h2 className="font-bold text-iw-navy text-sm">Matrículas por mês (últimos 6 meses)</h2>
          </div>
          <MonthlyBarChart data={matriculasPorMes} color="bg-iw-blue" />
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-iw-success" />
            <h2 className="font-bold text-iw-navy text-sm">Receita líquida por mês (últimos 6 meses)</h2>
          </div>
          <MonthlyBarChart data={receitaPorMes} color="bg-iw-success" formatValue={fmt} />
        </div>
      </div>

      {/* Quebras */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-iw-gold" />
            <h2 className="font-bold text-iw-navy text-sm">Matrículas por curso</h2>
          </div>
          <BreakdownBars data={matriculasPorCurso} />
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-iw-navy" />
            <h2 className="font-bold text-iw-navy text-sm">Origem das matrículas</h2>
          </div>
          <BreakdownBars data={origemMatriculas} />
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-iw-error" />
            <h2 className="font-bold text-iw-navy text-sm">Contas a receber por status</h2>
          </div>
          <BreakdownBars data={statusContasReceber} formatValue={fmt} />
        </div>
      </div>

    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  bg,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      {sublabel && <p className="text-xs text-iw-muted mt-1">{sublabel}</p>}
    </div>
  );
}
