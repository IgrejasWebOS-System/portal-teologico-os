import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import { secretariaLancarDespesaAction, secretariaExcluirDespesaAction } from "../actions";
import NucleoSelector from "../NucleoSelector";
import CaixaSecretariaPainel, { type MovimentacaoSecretaria } from "./CaixaSecretariaPainel";

export const metadata = { title: "Caixa — Área da Secretaria" };

// ============================================================
// /secretaria/caixa — Etapa 2/5 (04/10/2026). Entradas (parcelas
// pagas) + saídas (fin_contas_pagar com church_id — migration 129, antes
// nucleo_despesas) dos núcleos no escopo. Lançar/excluir despesa usa
// secretariaLancarDespesaAction/secretariaExcluirDespesaAction
// (../actions.ts), com client admin e checagem de escopo manual (mesmo
// padrão de assertAlunoNoEscopo).
//
// 04/10/2026, pedido do Joaquim: paridade com os filtros (mês, turma,
// curso) e o botão "Lançar despesa" em modal que já existem em
// /professor/caixa — movidos pro componente client
// CaixaSecretariaPainel (mesmo padrão: filtra em cima da lista já
// buscada aqui). Os cards de total continuam calculados aqui em cima
// do escopo completo (núcleo selecionado), sem considerar os filtros
// do painel.
// ============================================================

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CaixaSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string; msg?: string; error?: string }>;
}) {
  const { nucleo, msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  const admin = createAdminClient();
  const { data: categoriasRaw } = await admin
    .from("fin_categorias")
    .select("id, nome")
    .eq("tipo", "DESPESA")
    .eq("ativo", true)
    .order("nome");
  const categorias = categoriasRaw ?? [];

  // Migration 129: saídas = despesas pagas dos núcleos (fin_contas_pagar com
  // church_id). A RLS já restringe ao escopo CETADP do secretário.
  let despesasQuery = supabase
    .from("fin_contas_pagar")
    .select("id, descricao, valor_centavos, data_vencimento, pago_em, forma_pagamento_prevista, church_id, fin_lancamento_id, churches(name), fin_categorias(nome)")
    .not("church_id", "is", null)
    .eq("status", "PAGO")
    .order("data_vencimento", { ascending: false });
  if (nucleo) despesasQuery = despesasQuery.eq("church_id", nucleo);
  const { data: despesasRaw } = await despesasQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const despesas = (despesasRaw ?? []) as any[];

  let alunosQuery = supabase.from("ead_alunos").select("id, church_id, churches(name)");
  if (nucleo) alunosQuery = alunosQuery.eq("church_id", nucleo);
  const { data: alunosRaw } = await alunosQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunos = (alunosRaw ?? []) as any[];
  const alunoIds = alunos.map((a) => a.id);

  const { data: parcelasPagasRaw } = alunoIds.length
    ? await supabase
        .from("fin_contas_receber")
        .select("id, descricao, valor_bruto_centavos, pago_em, data_vencimento, aluno_id, origem_id, origem_tipo")
        .eq("status", "PAGO")
        .in("aluno_id", alunoIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parcelasPagas = (parcelasPagasRaw ?? []) as any[];
  const alunoChurch = new Map(alunos.map((a) => [a.id, a.churches?.name ?? "—"]));

  // Turma/curso pra alimentar os filtros do painel (paridade com
  // /professor/caixa) — mesma junção por matrícula usada em
  // /secretaria/financeiro; despesas de núcleo não têm matrícula
  // associada, então ficam sem turma/curso (igual acontece no painel
  // do professor pras saídas).
  const matriculaIds = Array.from(
    new Set(parcelasPagas.filter((p) => p.origem_tipo === "MATRICULA_DIRETA" && p.origem_id).map((p) => p.origem_id as string))
  );
  const { data: matriculasRaw } = matriculaIds.length
    ? await supabase
        .from("ead_matriculas")
        .select("id, curso_nome_snapshot, course_edition_id, course_editions(nome, classe)")
        .in("id", matriculaIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matriculaInfo = new Map((matriculasRaw ?? []).map((m: any) => [m.id, m]));

  const totalEntradas = parcelasPagas.reduce((acc, p) => acc + p.valor_bruto_centavos, 0);
  const totalSaidas = despesas.reduce((acc, d) => acc + d.valor_centavos, 0);

  const movimentacoes: MovimentacaoSecretaria[] = [
    ...parcelasPagas.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matricula = matriculaInfo.get(p.origem_id) as any;
      const courseEditionRaw = matricula?.course_editions;
      const courseEdition = Array.isArray(courseEditionRaw) ? courseEditionRaw[0] : courseEditionRaw;
      return {
        id: p.id,
        tipo: "ENTRADA" as const,
        descricao: p.descricao,
        valorCentavos: p.valor_bruto_centavos,
        data: (p.pago_em ?? p.data_vencimento).slice(0, 10),
        nucleoNome: alunoChurch.get(p.aluno_id) ?? "—",
        turmaNome: courseEdition?.nome ? `${courseEdition.nome}${courseEdition.classe ? ` - Classe ${courseEdition.classe}` : ""}` : null,
        cursoNome: matricula?.curso_nome_snapshot ?? null,
        excluivel: false,
      };
    }),
    ...despesas.map((d) => ({
      id: d.id,
      tipo: "SAIDA" as const,
      descricao: d.descricao,
      valorCentavos: d.valor_centavos,
      data: (d.pago_em ?? d.data_vencimento).slice(0, 10),
      nucleoNome: d.churches?.name ?? "—",
      turmaNome: null,
      cursoNome: null,
      excluivel: !d.fin_lancamento_id,
    })),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-iw-gold" />
          </div>
          <h1 className="text-2xl font-black text-black">
            Caixa{" "}
            <span className="text-base font-normal text-black">- Entradas e saídas dos seus núcleos.</span>
          </h1>
        </div>
        <NucleoSelector nucleos={nucleos} />
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Entradas</p>
          <p className="text-2xl font-black text-iw-success">{fmt(totalEntradas)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Saídas</p>
          <p className="text-2xl font-black text-iw-error">{fmt(totalSaidas)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Saldo</p>
          <p className={`text-2xl font-black ${totalEntradas - totalSaidas < 0 ? "text-iw-error" : "text-black"}`}>
            {fmt(totalEntradas - totalSaidas)}
          </p>
        </div>
      </div>

      <CaixaSecretariaPainel
        movimentacoes={movimentacoes}
        categorias={categorias}
        nucleos={nucleos}
        lancarAction={secretariaLancarDespesaAction}
        excluirAction={secretariaExcluirDespesaAction}
      />
    </div>
  );
}
