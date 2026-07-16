import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ListTree, ArrowRight, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Financeiro — CETADP" };

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroPage() {
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

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: caixaHoje } = await supabase
    .from("fin_caixa_diario")
    .select("id, status, saldo_inicial_centavos, saldo_final_centavos")
    .eq("data", hoje)
    .maybeSingle();

  let totalEntradas = 0;
  let totalSaidas = 0;
  if (caixaHoje) {
    const { data: lancamentos } = await supabase
      .from("fin_lancamentos")
      .select("tipo, valor_centavos")
      .eq("caixa_diario_id", caixaHoje.id);
    totalEntradas = (lancamentos ?? []).filter((l) => l.tipo === "ENTRADA").reduce((a, l) => a + l.valor_centavos, 0);
    totalSaidas = (lancamentos ?? []).filter((l) => l.tipo === "SAIDA").reduce((a, l) => a + l.valor_centavos, 0);
  }

  const saldoAtual = caixaHoje
    ? caixaHoje.saldo_final_centavos ?? caixaHoje.saldo_inicial_centavos + totalEntradas - totalSaidas
    : null;

  const { count: totalCategorias } = await supabase
    .from("fin_categorias")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true);

  const { data: contasAbertas } = await supabase
    .from("fin_contas_receber")
    .select("valor_bruto_centavos")
    .in("status", ["PENDENTE", "ATRASADO"]);

  const totalAReceber = (contasAbertas ?? []).reduce((a, c) => a + c.valor_bruto_centavos, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">Financeiro</h1>
          <p className="text-iw-muted text-xs mt-0.5">Plano de contas e caixa diário do CETADP.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
          <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1">Caixa de hoje</p>
          <p className="text-2xl font-black text-iw-navy">{saldoAtual != null ? fmt(saldoAtual) : "—"}</p>
          <p className="text-xs text-iw-muted mt-1">
            {caixaHoje ? (caixaHoje.status === "ABERTO" ? "Aberto" : "Fechado") : "Ainda não aberto"}
          </p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
          <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1 inline-flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-iw-success" /> Entradas hoje
          </p>
          <p className="text-2xl font-black text-iw-success">{fmt(totalEntradas)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
          <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1 inline-flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-iw-error" /> Saídas hoje
          </p>
          <p className="text-2xl font-black text-iw-error">{fmt(totalSaidas)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/financeiro/contas-a-receber"
          className="group bg-iw-surface border border-iw-border rounded-2xl p-6 flex items-center justify-between hover:border-iw-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-iw-gold" />
            <div>
              <p className="font-bold text-iw-navy">Contas a Receber</p>
              <p className="text-xs text-iw-muted">{fmt(totalAReceber)} em aberto</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-iw-muted group-hover:text-iw-gold transition-colors" />
        </Link>

        <Link
          href="/admin/financeiro/caixa"
          className="group bg-iw-surface border border-iw-border rounded-2xl p-6 flex items-center justify-between hover:border-iw-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-iw-gold" />
            <div>
              <p className="font-bold text-iw-navy">Caixa Diário</p>
              <p className="text-xs text-iw-muted">Abrir, lançar e fechar o caixa do dia</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-iw-muted group-hover:text-iw-gold transition-colors" />
        </Link>

        <Link
          href="/admin/financeiro/plano-de-contas"
          className="group bg-iw-surface border border-iw-border rounded-2xl p-6 flex items-center justify-between hover:border-iw-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ListTree className="w-6 h-6 text-iw-gold" />
            <div>
              <p className="font-bold text-iw-navy">Plano de Contas</p>
              <p className="text-xs text-iw-muted">{totalCategorias ?? 0} categorias ativas</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-iw-muted group-hover:text-iw-gold transition-colors" />
        </Link>
      </div>
    </div>
  );
}
