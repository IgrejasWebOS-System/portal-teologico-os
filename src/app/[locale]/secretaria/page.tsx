import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Users, GraduationCap, Clock, ArrowRight, PiggyBank } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import NucleoSelector from "./NucleoSelector";

export const metadata = { title: "Dashboard — Área da Secretaria" };

// ============================================================
// /secretaria — Dashboard (04/10/2026, Etapa 1 da Área da Secretaria).
// 04/10/2026, pedido do Joaquim: trocar a tabela simples por um
// dashboard "tecnológico e interativo", no mesmo espírito visual do
// Dashboard do Professor (cards + barras) — Card/BarraHorizontal
// replicados aqui (cada página do app já tem suas próprias cópias
// locais desses dois componentes, não existe um compartilhado).
//
// Classificação Básico/Médio e soma A Pagar/Pago seguem a mesma lógica
// do Relatório Global do Admin, só que agrupado por NÚCLEO (igreja) em
// vez de Setor/Regional. Usa o client normal (createClient(), RLS) de
// propósito: a RLS de ead_alunos/ead_matriculas/fin_contas_receber
// (migrations 062/111) já restringe tudo ao escopo do secretário
// sozinha.
// ============================================================

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaNucleo = { nome: string; basico: number; medio: number; aPagar: number; pago: number };

function Card({
  icon: Icon, label, valor, sublinha, href,
}: {
  icon: React.ElementType; label: string; valor: string; sublinha: string; href: string;
}) {
  // 04/10/2026, pedido do Joaquim: rótulo com "pagar"/"devedor" (ou
  // valor negativo) vem em vermelho — o resto do texto fica preto.
  const alerta = /pagar|devedor/i.test(label) || valor.trim().startsWith("-");
  return (
    <Link
      href={href}
      className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:border-iw-gold transition-colors group"
    >
      <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-iw-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-extrabold uppercase tracking-wider ${alerta ? "text-iw-error" : "text-black"}`}>{label}</p>
        <p className={`text-2xl font-black leading-tight ${alerta ? "text-iw-error" : "text-black"}`}>{valor}</p>
        <p className="text-xs text-black truncate">{sublinha}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-iw-muted/40 group-hover:text-iw-gold shrink-0 transition-colors" />
    </Link>
  );
}

function BarraHorizontal({ label, valor, max, corBarra }: { label: string; valor: number; max: number; corBarra: string }) {
  const pct = max > 0 ? Math.max((valor / max) * 100, valor > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="w-32 shrink-0 text-xs text-black truncate" title={label}>{label}</p>
      <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
        <div className={`h-full rounded-md ${corBarra}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="w-8 shrink-0 text-xs font-bold text-black text-right">{valor}</p>
    </div>
  );
}

export default async function DashboardSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string }>;
}) {
  const { nucleo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  let alunosQuery = supabase
    .from("ead_alunos")
    .select("id, nome_completo, church_id, churches(name)")
    .order("nome_completo");
  if (nucleo) alunosQuery = alunosQuery.eq("church_id", nucleo);
  const { data: alunosRaw } = await alunosQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunos = (alunosRaw ?? []) as any[];
  const alunoIds = alunos.map((a) => a.id);
  const alunoInfo = new Map(alunos.map((a) => [a.id, a]));

  let professoresQuery = supabase.from("professores").select("id, church_id", { count: "exact" });
  if (nucleo) professoresQuery = professoresQuery.eq("church_id", nucleo);
  const { count: professoresCount } = await professoresQuery;

  const [{ data: matriculas }, { data: contas }] = await Promise.all([
    alunoIds.length
      ? supabase.from("ead_matriculas").select("id, aluno_id, curso_nome_snapshot").in("aluno_id", alunoIds)
      : Promise.resolve({ data: [] as { id: string; aluno_id: string; curso_nome_snapshot: string | null }[] }),
    alunoIds.length
      ? supabase.from("fin_contas_receber").select("origem_id, aluno_id, valor_bruto_centavos, status").in("aluno_id", alunoIds)
      : Promise.resolve({ data: [] as { origem_id: string; aluno_id: string; valor_bruto_centavos: number; status: string }[] }),
  ]);

  const financeiroPorMatricula = new Map<string, { aPagar: number; pago: number }>();
  for (const c of contas ?? []) {
    const atual = financeiroPorMatricula.get(c.origem_id) ?? { aPagar: 0, pago: 0 };
    atual.aPagar += c.valor_bruto_centavos;
    if (c.status === "PAGO") atual.pago += c.valor_bruto_centavos;
    financeiroPorMatricula.set(c.origem_id, atual);
  }

  const linhasPorNucleo = new Map<string, LinhaNucleo>();
  const total: LinhaNucleo = { nome: "TOTAL", basico: 0, medio: 0, aPagar: 0, pago: 0 };

  for (const m of matriculas ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aluno = alunoInfo.get(m.aluno_id) as any;
    const nomeNucleo = aluno?.churches?.name ?? "Sem núcleo definido";
    const curso = (m.curso_nome_snapshot || "").toLowerCase();
    const ehBasico = curso.includes("básico") || curso.includes("basico");
    const ehMedio = curso.includes("médio") || curso.includes("medio");
    const fin = financeiroPorMatricula.get(m.id);

    if (!linhasPorNucleo.has(nomeNucleo)) {
      linhasPorNucleo.set(nomeNucleo, { nome: nomeNucleo, basico: 0, medio: 0, aPagar: 0, pago: 0 });
    }
    const linha = linhasPorNucleo.get(nomeNucleo)!;
    if (ehBasico) linha.basico += 1;
    else if (ehMedio) linha.medio += 1;
    if (fin) {
      linha.aPagar += fin.aPagar;
      linha.pago += fin.pago;
    }

    if (ehBasico) total.basico += 1;
    else if (ehMedio) total.medio += 1;
    if (fin) {
      total.aPagar += fin.aPagar;
      total.pago += fin.pago;
    }
  }

  const linhas = Array.from(linhasPorNucleo.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const pendenteCentavos = total.aPagar - total.pago;

  const alunosPorNucleo = linhas
    .map((l) => ({ label: l.nome, valor: l.basico + l.medio }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);
  const maxAlunosPorNucleo = Math.max(...alunosPorNucleo.map((n) => n.valor), 1);
  const maxFin = Math.max(total.aPagar, total.pago, 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-black">Dashboard da Secretaria</h1>
          <p className="text-base text-black mt-1">
            Resumo dos núcleos sob sua responsabilidade.
            {secretario.roleTitle ? ` (${secretario.roleTitle})` : ""}
          </p>
        </div>
        <NucleoSelector nucleos={nucleos} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          icon={GraduationCap}
          label="Professores"
          valor={String(professoresCount ?? 0)}
          sublinha="Nos seus núcleos"
          href="/secretaria/professores"
        />
        <Card
          icon={Users}
          label="Alunos"
          valor={String(alunos.length)}
          sublinha="Nos seus núcleos"
          href="/secretaria/alunos"
        />
        <Card
          icon={Clock}
          label="Saldo devedor"
          valor={fmt(pendenteCentavos)}
          sublinha="Diferença entre cobrado e pago"
          href="/secretaria/alunos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-iw-gold" />
            <h2 className="text-sm font-bold text-black">Alunos por núcleo</h2>
          </div>
          {alunosPorNucleo.length === 0 ? (
            <p className="text-xs text-black">Nenhum aluno matriculado nos seus núcleos ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {alunosPorNucleo.map((n, i) => (
                <BarraHorizontal key={`${n.label}-${i}`} label={n.label} valor={n.valor} max={maxAlunosPorNucleo} corBarra="bg-iw-gold" />
              ))}
            </div>
          )}
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-iw-gold" />
            <h2 className="text-sm font-bold text-black">Financeiro (geral do escopo)</h2>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">Cobrado</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-amber-500" style={{ width: `${Math.max((total.aPagar / maxFin) * 100, total.aPagar > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmt(total.aPagar)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">Pago</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-iw-success" style={{ width: `${Math.max((total.pago / maxFin) * 100, total.pago > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmt(total.pago)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-iw-gold" />
          <h2 className="text-base font-bold text-black">Relatório por Núcleo</h2>
        </div>

        {linhas.length === 0 ? (
          <p className="text-black text-sm">Nenhum aluno matriculado nos seus núcleos ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border">
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-left">Núcleo</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Básico</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Médio</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Total</th>
                <th className="pb-2 pr-3 font-semibold text-iw-error text-right">A Pagar</th>
                <th className="pb-2 font-semibold text-iw-muted text-right">Pago</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome} className="border-b border-iw-border/50 last:border-0">
                  <td className="py-2 pr-3 text-black">{l.nome}</td>
                  <td className="py-2 pr-3 text-right text-black">{l.basico}</td>
                  <td className="py-2 pr-3 text-right text-black">{l.medio}</td>
                  <td className="py-2 pr-3 text-right font-bold text-black">{l.basico + l.medio}</td>
                  <td className="py-2 pr-3 text-right text-iw-error">{fmt(l.aPagar)}</td>
                  <td className="py-2 text-right text-iw-success font-medium">{fmt(l.pago)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-iw-gold/40">
                <td className="py-2 pr-3 font-bold text-black">TOTAL GERAL</td>
                <td className="py-2 pr-3 text-right font-bold text-black">{total.basico}</td>
                <td className="py-2 pr-3 text-right font-bold text-black">{total.medio}</td>
                <td className="py-2 pr-3 text-right font-bold text-black">{total.basico + total.medio}</td>
                <td className="py-2 pr-3 text-right font-bold text-iw-error">{fmt(total.aPagar)}</td>
                <td className="py-2 text-right font-bold text-iw-success">{fmt(total.pago)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
