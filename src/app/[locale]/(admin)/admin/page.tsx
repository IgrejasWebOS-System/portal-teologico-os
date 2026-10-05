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
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { checkIsSecretario } from "@/utils/secretaria";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import MonthlyBarChart from "@/components/admin/dashboard/MonthlyBarChart";
import BreakdownBars from "@/components/admin/dashboard/BreakdownBars";
import { contarPorMes, somarPorMes } from "@/utils/dashboard/agrupar-por-mes";
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

  // ---------- Relatório por Setor/Regional (formato original, restaurado
  // em 01/10/2026 — as versões "SEDE/SETOR/REGIONAL/GLOBAL em caixas" e
  // depois "em modal" não eram o que o Joaquim pediu; o pedido real
  // sempre foi esta tabela única e simples, uma linha por setor/
  // regional, igual já está em produção). SEDE fica de fora da lista
  // (não tem setor) e "REGIONAL" vs "SETOR" nunca foi distinção visual
  // aqui — é só uma lista plana ordenada por nome.
  const [
    { data: alunosSetor },
    { data: matriculasSetor },
    { data: contasReceberTodas },
  ] = await Promise.all([
    supabase.from("ead_alunos").select("id, nome_completo, sector_id, church_id, sectors(name), churches(name, is_sede)"),
    supabase.from("ead_matriculas").select("id, aluno_id, curso_nome_snapshot"),
    supabase.from("fin_contas_receber").select("origem_id, valor_bruto_centavos, status"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunoInfo = new Map((alunosSetor ?? []).map((a: any) => [a.id, a]));
  const financeiroPorMatricula = new Map<string, { aPagar: number; pago: number }>();
  for (const c of contasReceberTodas ?? []) {
    const atual = financeiroPorMatricula.get(c.origem_id) ?? { aPagar: 0, pago: 0 };
    atual.aPagar += c.valor_bruto_centavos;
    if (c.status === "PAGO") atual.pago += c.valor_bruto_centavos;
    financeiroPorMatricula.set(c.origem_id, atual);
  }

  type LinhaSetorRegional = { nome: string; basico: number; medio: number; aPagar: number; pago: number };

  const linhasPorSetor = new Map<string, LinhaSetorRegional & { tipo: "SETOR" | "REGIONAL" }>();
  const linhaSede: LinhaSetorRegional = { nome: "SEDE", basico: 0, medio: 0, aPagar: 0, pago: 0 };
  // 03/10/2026, pedido do Joaquim: a linha SEDE do quadro "Relatório
  // Global" abre (accordion) e mostra os alunos da Sede individualmente,
  // igual ao padrão de Setor/Regional em Professores/Alunos.
  type LinhaAluno = { nome: string; basico: number; medio: number; aPagar: number; pago: number };
  const detalheAlunosSede: LinhaAluno[] = [];
  // 03/10/2026, pedido do Joaquim: segundo nível de accordion — dentro de
  // SETOR/REGIONAL, cada setor/regional individual também abre e lista
  // os próprios alunos (mesmo padrão aplicado à SEDE acima).
  const detalheAlunosPorSetor = new Map<string, LinhaAluno[]>();

  for (const m of matriculasSetor ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aluno = alunoInfo.get(m.aluno_id) as any;
    const curso = (m.curso_nome_snapshot || "").toLowerCase();
    const ehBasico = curso.includes("básico") || curso.includes("basico");
    const ehMedio = curso.includes("médio") || curso.includes("medio");
    const fin = financeiroPorMatricula.get(m.id);

    const aplicar = (linha: LinhaSetorRegional) => {
      if (ehBasico) linha.basico += 1;
      else if (ehMedio) linha.medio += 1;
      if (fin) {
        linha.aPagar += fin.aPagar;
        linha.pago += fin.pago;
      }
    };

    if (aluno?.churches?.is_sede) {
      aplicar(linhaSede);
      detalheAlunosSede.push({
        nome: aluno?.nome_completo ?? "—",
        basico: ehBasico ? 1 : 0,
        medio: ehMedio ? 1 : 0,
        aPagar: fin?.aPagar ?? 0,
        pago: fin?.pago ?? 0,
      });
      continue;
    }

    const setorId = aluno?.sector_id ?? "SEM_SETOR";
    const setorNome = aluno?.sectors?.name ?? "Sem setor definido";
    const tipo: "SETOR" | "REGIONAL" = setorNome.toUpperCase().startsWith("REGIONAL") ? "REGIONAL" : "SETOR";
    if (!linhasPorSetor.has(setorId)) {
      linhasPorSetor.set(setorId, { nome: setorNome, tipo, basico: 0, medio: 0, aPagar: 0, pago: 0 });
    }
    aplicar(linhasPorSetor.get(setorId)!);

    if (!detalheAlunosPorSetor.has(setorNome)) detalheAlunosPorSetor.set(setorNome, []);
    detalheAlunosPorSetor.get(setorNome)!.push({
      nome: aluno?.nome_completo ?? "—",
      basico: ehBasico ? 1 : 0,
      medio: ehMedio ? 1 : 0,
      aPagar: fin?.aPagar ?? 0,
      pago: fin?.pago ?? 0,
    });
  }
  for (const lista of detalheAlunosPorSetor.values()) {
    lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const relatorioSetorRegional = Array.from(linhasPorSetor.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  detalheAlunosSede.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // 01/10/2026, pedido do Joaquim: abaixo da tabela original, uma caixa
  // "Relatório Global" (SEDE/SETOR/REGIONAL/TOTAL GERAL) sempre visível
  // — não é mais modal, é só o resumo consolidado estático.
  function somarLinhas(lista: LinhaSetorRegional[]) {
    return lista.reduce(
      (acc, l) => ({
        basico: acc.basico + l.basico,
        medio: acc.medio + l.medio,
        aPagar: acc.aPagar + l.aPagar,
        pago: acc.pago + l.pago,
      }),
      { basico: 0, medio: 0, aPagar: 0, pago: 0 }
    );
  }
  const totalSetorGlobal = somarLinhas(relatorioSetorRegional.filter((l) => l.tipo === "SETOR"));
  const totalRegionalGlobal = somarLinhas(relatorioSetorRegional.filter((l) => l.tipo === "REGIONAL"));
  const totalGeralGlobal = {
    basico: linhaSede.basico + totalSetorGlobal.basico + totalRegionalGlobal.basico,
    medio: linhaSede.medio + totalSetorGlobal.medio + totalRegionalGlobal.medio,
    aPagar: linhaSede.aPagar + totalSetorGlobal.aPagar + totalRegionalGlobal.aPagar,
    pago: linhaSede.pago + totalSetorGlobal.pago + totalRegionalGlobal.pago,
  };

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
          Global/Sede/Setor/Regional + estoque + pedidos de material) é o
          PRIMEIRO bloco do Dashboard, antes dos KPIs/gráficos.
          01/10/2026: a tabela única "Relatório por Setor/Regional" (todos
          os setores/regionais misturados numa lista só) foi removida —
          redundante com as caixas Global/Sede/Setor/Regional abaixo, que
          já trazem a mesma informação separada por categoria. */}
      {/* 01/10/2026, pedido do Joaquim: caixa "Relatório Global" sempre
          visível (não é modal) com o resumo consolidado
          SEDE/SETOR/REGIONAL/TOTAL GERAL. */}
      <div className="bg-iw-surface border border-iw-gold rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-iw-border">
                <th className="pb-2 pr-3 font-bold text-iw-navy text-base whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-iw-gold" />
                    Relatório Global
                  </span>
                </th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Básico</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Médio</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Total</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">A Pagar</th>
                <th className="pb-2 pr-3 font-semibold text-iw-muted text-right">Pago</th>
                <th className="pb-2 font-semibold text-iw-muted text-right">Saldo Devedor</th>
              </tr>
            </thead>
            <tbody>
              {/* 03/10/2026, pedido do Joaquim: linha SEDE abre (accordion)
                  e lista os alunos da Sede individualmente — por isso vai
                  dentro de um <td colSpan> com <details>/grid em vez de um
                  <tr> comum, já que <details> não pode envolver vários
                  <tr> irmãos. As colunas do grid abaixo reproduzem as
                  mesmas proporções do cabeçalho da tabela. */}
              <tr className="border-b border-iw-border/60">
                <td colSpan={7} className="p-0">
                  <details className="group/sede">
                    <summary className="cursor-pointer list-none grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1.3fr] gap-2 items-center px-0 py-2">
                      <span className="text-iw-navy font-semibold inline-flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-iw-muted transition-transform group-open/sede:rotate-90 shrink-0" />
                        SEDE
                        <span className="text-[11px] font-normal text-iw-muted">
                          ({detalheAlunosSede.length} aluno{detalheAlunosSede.length === 1 ? "" : "s"})
                        </span>
                      </span>
                      <span className="text-right text-iw-muted">{linhaSede.basico}</span>
                      <span className="text-right text-iw-muted">{linhaSede.medio}</span>
                      <span className="text-right font-bold text-iw-navy">{linhaSede.basico + linhaSede.medio}</span>
                      <span className="text-right text-iw-muted">{linhaSede.aPagar > 0 ? fmt(linhaSede.aPagar) : "—"}</span>
                      <span className="text-right text-iw-success">{linhaSede.pago > 0 ? fmt(linhaSede.pago) : "—"}</span>
                      <span className="text-right font-bold text-iw-error">
                        {linhaSede.aPagar - linhaSede.pago !== 0 ? fmt(linhaSede.aPagar - linhaSede.pago) : "—"}
                      </span>
                    </summary>
                    <div className="bg-iw-bg/40 -mx-0">
                      {detalheAlunosSede.length === 0 ? (
                        <p className="text-xs text-iw-muted py-2 pl-5">Nenhum aluno na Sede.</p>
                      ) : (
                        detalheAlunosSede.map((a, i) => {
                          const totalA = a.basico + a.medio;
                          const saldoA = a.aPagar - a.pago;
                          return (
                            <div
                              key={`${a.nome}-${i}`}
                              className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1.3fr] gap-2 items-center px-0 py-1.5 border-t border-iw-border/40"
                            >
                              <span className="text-xs text-iw-muted truncate pl-5">{a.nome}</span>
                              <span className="text-xs text-right text-iw-muted">{a.basico}</span>
                              <span className="text-xs text-right text-iw-muted">{a.medio}</span>
                              <span className="text-xs text-right font-semibold text-iw-navy">{totalA}</span>
                              <span className="text-xs text-right text-iw-muted">{a.aPagar > 0 ? fmt(a.aPagar) : "—"}</span>
                              <span className="text-xs text-right text-iw-success">{a.pago > 0 ? fmt(a.pago) : "—"}</span>
                              <span className="text-xs text-right font-semibold text-iw-error">
                                {saldoA !== 0 ? fmt(saldoA) : "—"}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </details>
                </td>
              </tr>
              {/* 03/10/2026, pedido do Joaquim: mesmo tratamento da linha
                  SEDE acima — SETOR e REGIONAL também abrem (accordion) e
                  listam cada setor/regional individualmente (reaproveita
                  `relatorioSetorRegional`, a mesma lista das caixas
                  "Relatório Setor"/"Relatório Regional" abaixo). */}
              {[
                { tipo: "SETOR" as const, nome: "SETOR", linha: { nome: "SETOR", ...totalSetorGlobal } },
                { tipo: "REGIONAL" as const, nome: "REGIONAL", linha: { nome: "REGIONAL", ...totalRegionalGlobal } },
              ].map(({ tipo, nome, linha }) => {
                const grupos = relatorioSetorRegional.filter((l) => l.tipo === tipo);
                const saldo = linha.aPagar - linha.pago;
                return (
                  <tr key={nome} className="border-b border-iw-border/60 last:border-b-0">
                    <td colSpan={7} className="p-0">
                      <details className="group/grupo-global">
                        <summary className="cursor-pointer list-none grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1.3fr] gap-2 items-center px-0 py-2">
                          <span className="text-iw-navy font-semibold inline-flex items-center gap-1.5">
                            <ChevronRight className="w-3.5 h-3.5 text-iw-muted transition-transform group-open/grupo-global:rotate-90 shrink-0" />
                            {nome}
                            <span className="text-[11px] font-normal text-iw-muted">
                              ({grupos.length} {tipo === "SETOR" ? "setor" : "regional"}
                              {grupos.length === 1 ? "" : "is"})
                            </span>
                          </span>
                          <span className="text-right text-iw-muted">{linha.basico}</span>
                          <span className="text-right text-iw-muted">{linha.medio}</span>
                          <span className="text-right font-bold text-iw-navy">{linha.basico + linha.medio}</span>
                          <span className="text-right text-iw-muted">{linha.aPagar > 0 ? fmt(linha.aPagar) : "—"}</span>
                          <span className="text-right text-iw-success">{linha.pago > 0 ? fmt(linha.pago) : "—"}</span>
                          <span className="text-right font-bold text-iw-error">{saldo !== 0 ? fmt(saldo) : "—"}</span>
                        </summary>
                        <div className="bg-iw-bg/40">
                          {grupos.length === 0 ? (
                            <p className="text-xs text-iw-muted py-2 pl-5">
                              Nenhum{tipo === "SETOR" ? " setor" : "a regional"} com registros.
                            </p>
                          ) : (
                            grupos.map((g) => {
                              const totalG = g.basico + g.medio;
                              const saldoG = g.aPagar - g.pago;
                              const alunosG = detalheAlunosPorSetor.get(g.nome) ?? [];
                              return (
                                <details key={g.nome} className="group/grupo-item border-t border-iw-border/40">
                                  <summary className="cursor-pointer list-none grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1.3fr] gap-2 items-center px-0 py-1.5">
                                    <span className="text-xs text-iw-muted truncate pl-5 inline-flex items-center gap-1.5">
                                      <ChevronRight className="w-3 h-3 text-iw-muted transition-transform group-open/grupo-item:rotate-90 shrink-0" />
                                      {g.nome}
                                      <span className="text-[10px] font-normal text-iw-muted/70">
                                        ({alunosG.length} aluno{alunosG.length === 1 ? "" : "s"})
                                      </span>
                                    </span>
                                    <span className="text-xs text-right text-iw-muted">{g.basico}</span>
                                    <span className="text-xs text-right text-iw-muted">{g.medio}</span>
                                    <span className="text-xs text-right font-semibold text-iw-navy">{totalG}</span>
                                    <span className="text-xs text-right text-iw-muted">{g.aPagar > 0 ? fmt(g.aPagar) : "—"}</span>
                                    <span className="text-xs text-right text-iw-success">{g.pago > 0 ? fmt(g.pago) : "—"}</span>
                                    <span className="text-xs text-right font-semibold text-iw-error">
                                      {saldoG !== 0 ? fmt(saldoG) : "—"}
                                    </span>
                                  </summary>
                                  <div className="bg-iw-bg/60">
                                    {alunosG.length === 0 ? (
                                      <p className="text-[11px] text-iw-muted py-1.5 pl-10">Nenhum aluno.</p>
                                    ) : (
                                      alunosG.map((a, i) => {
                                        const totalA = a.basico + a.medio;
                                        const saldoA = a.aPagar - a.pago;
                                        return (
                                          <div
                                            key={`${a.nome}-${i}`}
                                            className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.2fr_1.3fr] gap-2 items-center px-0 py-1 border-t border-iw-border/30"
                                          >
                                            <span className="text-[11px] text-iw-muted truncate pl-10">{a.nome}</span>
                                            <span className="text-[11px] text-right text-iw-muted">{a.basico}</span>
                                            <span className="text-[11px] text-right text-iw-muted">{a.medio}</span>
                                            <span className="text-[11px] text-right font-semibold text-iw-navy">{totalA}</span>
                                            <span className="text-[11px] text-right text-iw-muted">{a.aPagar > 0 ? fmt(a.aPagar) : "—"}</span>
                                            <span className="text-[11px] text-right text-iw-success">{a.pago > 0 ? fmt(a.pago) : "—"}</span>
                                            <span className="text-[11px] text-right font-semibold text-iw-error">
                                              {saldoA !== 0 ? fmt(saldoA) : "—"}
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </details>
                              );
                            })
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-2.5 pr-3 font-black text-iw-navy uppercase">Total geral</td>
                <td className="py-2.5 pr-3 text-right font-bold text-iw-navy">{totalGeralGlobal.basico}</td>
                <td className="py-2.5 pr-3 text-right font-bold text-iw-navy">{totalGeralGlobal.medio}</td>
                <td className="py-2.5 pr-3 text-right font-black text-iw-navy">
                  {totalGeralGlobal.basico + totalGeralGlobal.medio}
                </td>
                <td className="py-2.5 pr-3 text-right text-iw-muted">
                  {totalGeralGlobal.aPagar > 0 ? fmt(totalGeralGlobal.aPagar) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right text-iw-success">
                  {totalGeralGlobal.pago > 0 ? fmt(totalGeralGlobal.pago) : "—"}
                </td>
                <td className="py-2.5 text-right font-black text-iw-error">
                  {totalGeralGlobal.aPagar - totalGeralGlobal.pago !== 0
                    ? fmt(totalGeralGlobal.aPagar - totalGeralGlobal.pago)
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
