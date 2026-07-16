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
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import MonthlyBarChart from "@/components/admin/dashboard/MonthlyBarChart";
import BreakdownBars from "@/components/admin/dashboard/BreakdownBars";
import { contarPorMes, somarPorMes } from "@/utils/dashboard/agrupar-por-mes";

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-navy/10 flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-5 h-5 text-iw-navy" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">Dashboard</h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Visão geral administrativa, financeira e acadêmica do CETADP.
          </p>
        </div>
      </div>

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
          color="text-iw-blue"
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
            <BarChart3 className="w-4 h-4 text-iw-blue" />
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
