import type { LucideIcon } from "lucide-react";
import { Users, UserCheck, GraduationCap, Wallet, Receipt, ShoppingBag } from "lucide-react";
import ComparativoAnual from "@/components/admin/dashboard/ComparativoAnual";

// ============================================================
// Dashboard "Todos os anos" (18/10/2026, pedido do Joaquim): total geral e
// valores anuais lado a lado, com comparação gráfica. Regras de contagem:
//  - Turmas: course_editions.ano.
//  - Matrículas e alunos: pelo ano da TURMA (mesma regra do Relatório Global);
//    sem turma, pelo ano de criação. Matrículas CANCELADAS ficam de fora.
//  - Receita confirmada: contas PAGAS, pelo ano de pagamento.
//  - A receber em aberto: PENDENTE/ATRASADO, pelo ano de vencimento.
//  - Loja: pedidos PAGOS, pelo ano de pagamento.
// ============================================================

const fmt = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function buscarTudo<T>(fabrica: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; de < 200000; de += 1000) {
    const { data } = await fabrica(de, de + 999);
    const lote = data ?? [];
    tudo.push(...lote);
    if (lote.length < 1000) break;
  }
  return tudo;
}

const anoDe = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const a = new Date(iso).getFullYear();
  return Number.isFinite(a) ? a : null;
};

export default async function DashboardTodosAnos({
  supabase,
  anos,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  anos: number[]; // ordem crescente
}) {
  const [edicoes, matriculas, pagas, abertas, pedidos] = await Promise.all([
    buscarTudo<{ id: string; ano: number | null }>((de, ate) => supabase.from("course_editions").select("id, ano").range(de, ate)),
    buscarTudo<{ aluno_id: string | null; status: string; course_edition_id: string | null; created_at: string }>((de, ate) =>
      supabase.from("ead_matriculas").select("aluno_id, status, course_edition_id, created_at").range(de, ate)
    ),
    buscarTudo<{ pago_em: string | null; valor_liquido_centavos: number | null; valor_bruto_centavos: number | null }>((de, ate) =>
      supabase.from("fin_contas_receber").select("pago_em, valor_liquido_centavos, valor_bruto_centavos").eq("status", "PAGO").range(de, ate)
    ),
    buscarTudo<{ data_vencimento: string | null; valor_bruto_centavos: number | null }>((de, ate) =>
      supabase.from("fin_contas_receber").select("data_vencimento, valor_bruto_centavos").in("status", ["PENDENTE", "ATRASADO"]).range(de, ate)
    ),
    buscarTudo<{ paid_at: string | null; total_centavos: number | null }>((de, ate) =>
      supabase.from("orders").select("paid_at, total_centavos").eq("status", "PAGO").range(de, ate)
    ),
  ]);

  const anoDaEdicao = new Map(edicoes.map((e) => [e.id, e.ano]));
  const turmasPorAno = new Map<number, number>();
  for (const e of edicoes) if (e.ano != null) turmasPorAno.set(e.ano, (turmasPorAno.get(e.ano) ?? 0) + 1);

  const matPorAno = new Map<number, number>();
  const alunosPorAno = new Map<number, Set<string>>();
  const alunosUnicos = new Set<string>();
  let totalMatriculas = 0;
  for (const m of matriculas) {
    if (m.status === "CANCELADO") continue;
    const ano = m.course_edition_id ? anoDaEdicao.get(m.course_edition_id) ?? anoDe(m.created_at) : anoDe(m.created_at);
    if (ano == null) continue;
    totalMatriculas++;
    matPorAno.set(ano, (matPorAno.get(ano) ?? 0) + 1);
    if (m.aluno_id) {
      alunosUnicos.add(m.aluno_id);
      const s = alunosPorAno.get(ano) ?? new Set<string>();
      s.add(m.aluno_id);
      alunosPorAno.set(ano, s);
    }
  }

  const soma = (itens: { ano: number | null; v: number }[]) => {
    const m = new Map<number, number>();
    for (const i of itens) if (i.ano != null) m.set(i.ano, (m.get(i.ano) ?? 0) + i.v);
    return m;
  };
  const receitaPorAno = soma(pagas.map((c) => ({ ano: anoDe(c.pago_em), v: c.valor_liquido_centavos ?? c.valor_bruto_centavos ?? 0 })));
  const abertoPorAno = soma(abertas.map((c) => ({ ano: anoDe(c.data_vencimento), v: c.valor_bruto_centavos ?? 0 })));
  const lojaPorAno = soma(pedidos.map((o) => ({ ano: anoDe(o.paid_at), v: o.total_centavos ?? 0 })));

  const serie = (mapa: Map<number, number>) => anos.map((ano) => ({ ano, valor: mapa.get(ano) ?? 0 }));
  const serieAlunos = anos.map((ano) => ({ ano, valor: alunosPorAno.get(ano)?.size ?? 0 }));
  const total = (mapa: Map<number, number>) => anos.reduce((a, ano) => a + (mapa.get(ano) ?? 0), 0);

  const totalTurmas = total(turmasPorAno);
  const totalReceita = total(receitaPorAno);
  const totalAberto = total(abertoPorAno);
  const totalLoja = total(lojaPorAno);

  return (
    // "Resumo por ano" vem primeiro (order-first), antes dos cards de totais.
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi icon={UserCheck} label="Turmas (total)" value={String(totalTurmas)} sub={`${anos[0]} a ${anos[anos.length - 1]}`} />
        <Kpi icon={Users} label="Alunos distintos (total)" value={String(alunosUnicos.size)} sub="com matrícula em algum ano" />
        <Kpi icon={GraduationCap} label="Matrículas (total)" value={String(totalMatriculas)} sub="sem canceladas" />
        <Kpi icon={Wallet} label="Receita confirmada (total)" value={fmt(totalReceita)} sub="contas pagas" />
        <Kpi icon={Receipt} label="A receber em aberto (total)" value={fmt(totalAberto)} sub="pendentes e atrasadas" />
        <Kpi icon={ShoppingBag} label="Vendas da loja (total)" value={fmt(totalLoja)} sub="pedidos pagos" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparativoAnual titulo="Matrículas por ano" serie={serie(matPorAno)} corBarra="bg-iw-gold" />
        <ComparativoAnual titulo="Alunos por ano" serie={serieAlunos} corBarra="bg-iw-navy" />
        <ComparativoAnual titulo="Turmas por ano" serie={serie(turmasPorAno)} corBarra="bg-iw-blue" />
        <ComparativoAnual titulo="Receita confirmada por ano" serie={serie(receitaPorAno)} formatValue={fmt} corBarra="bg-iw-success" />
        <ComparativoAnual titulo="A receber em aberto (por vencimento)" serie={serie(abertoPorAno)} formatValue={fmt} corBarra="bg-iw-error" />
        <ComparativoAnual titulo="Vendas da loja por ano" serie={serie(lojaPorAno)} formatValue={fmt} corBarra="bg-iw-gold" />
      </div>

      <div className="order-first bg-iw-surface border border-iw-border rounded-2xl p-6 overflow-x-auto">
        <h2 className="font-bold text-iw-navy text-sm mb-3">Resumo por ano</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-iw-muted border-b border-iw-border">
              <th className="py-2 font-semibold">Ano</th>
              <th className="py-2 font-semibold text-right">Turmas</th>
              <th className="py-2 font-semibold text-right">Alunos</th>
              <th className="py-2 font-semibold text-right">Matrículas</th>
              <th className="py-2 font-semibold text-right">Receita confirmada</th>
              <th className="py-2 font-semibold text-right">A receber em aberto</th>
              <th className="py-2 font-semibold text-right">Loja</th>
            </tr>
          </thead>
          <tbody>
            {[...anos].reverse().map((ano) => (
              <tr key={ano} className="border-b border-iw-border/60">
                <td className="py-2 font-bold text-iw-navy">{ano}</td>
                <td className="py-2 text-right">{turmasPorAno.get(ano) ?? 0}</td>
                <td className="py-2 text-right">{alunosPorAno.get(ano)?.size ?? 0}</td>
                <td className="py-2 text-right">{matPorAno.get(ano) ?? 0}</td>
                <td className="py-2 text-right">{fmt(receitaPorAno.get(ano) ?? 0)}</td>
                <td className="py-2 text-right">{fmt(abertoPorAno.get(ano) ?? 0)}</td>
                <td className="py-2 text-right">{fmt(lojaPorAno.get(ano) ?? 0)}</td>
              </tr>
            ))}
            <tr className="font-black text-iw-navy">
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{totalTurmas}</td>
              <td className="py-2 text-right">{alunosUnicos.size}</td>
              <td className="py-2 text-right">{totalMatriculas}</td>
              <td className="py-2 text-right">{fmt(totalReceita)}</td>
              <td className="py-2 text-right">{fmt(totalAberto)}</td>
              <td className="py-2 text-right">{fmt(totalLoja)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-iw-muted mt-3">
          Alunos do total = alunos distintos (quem estudou em mais de um ano conta uma vez); por ano, conta quem teve matrícula naquele ano.
        </p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
      <div className="w-8 h-8 rounded-lg bg-iw-navy/10 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-iw-navy" />
      </div>
      <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-black text-iw-navy">{value}</p>
      <p className="text-xs text-iw-muted mt-1">{sub}</p>
    </div>
  );
}
