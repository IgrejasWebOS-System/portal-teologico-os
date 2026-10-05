import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import NucleoSelector from "../NucleoSelector";
import FinanceiroSecretariaPainel, { type ParcelaSecretaria } from "./FinanceiroSecretariaPainel";
import ContasAPagarNucleoPainel, { type ContaPagarNucleo } from "@/components/financeiro/ContasAPagarNucleoPainel";
import {
  secretariaCriarContaPagarAction,
  secretariaBaixarContaPagarAction,
  secretariaCancelarContaPagarAction,
} from "../actions";

export const metadata = { title: "Financeiro — Área da Secretaria" };

// ============================================================
// /secretaria/financeiro — Etapa 2/5 (04/10/2026). Lista de parcelas
// (fin_contas_receber) dos núcleos no escopo. "Dar baixa"/"Ver" leva
// pra /admin/matriculas/[id] (EditarMatriculaForm) — mesma tela que o
// admin usa, já escopada via RLS (ead_matriculas, migration 111) e via
// assertAlunoNoEscopo() nas próprias actions de pagamento; não
// duplicado aqui.
//
// Diferente de Turmas/Professores (SELECT aberto nessas tabelas),
// fin_contas_receber JÁ é escopado por RLS via ead_alunos.unit_id
// (migration 111) — por isso aqui dá pra usar o client normal sem
// filtrar manualmente por professor/unidade, só junta os dados.
//
// 04/10/2026, pedido do Joaquim: paridade com as abas/filtros (A
// receber/Recebidas/Todas, mês, turma, curso) que já existem em
// /professor/financeiro — movidos pro componente client
// FinanceiroSecretariaPainel (mesmo padrão: filtra em cima da lista já
// buscada aqui, zero round-trip novo). Os cards de total continuam
// calculados aqui em cima do escopo completo (núcleo selecionado),
// sem considerar os filtros do painel.
// ============================================================

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// 04/10/2026 (migration 129): o núcleo é tratado como uma escola — tem as
// suas Contas a Receber (parcelas dos alunos, abaixo) e as suas Contas a
// Pagar (fin_contas_pagar com church_id: internet, luz, água, faxina,
// despesas administrativas...). Alternância por ?aba=pagar (padrão: receber).
function AbasFinanceiro({ aba, nucleo }: { aba: "receber" | "pagar"; nucleo?: string }) {
  const qs = (a: string) => `?aba=${a}${nucleo ? `&nucleo=${nucleo}` : ""}`;
  return (
    <div className="flex items-center gap-2">
      {(
        [
          ["receber", "Contas a Receber"],
          ["pagar", "Contas a Pagar"],
        ] as const
      ).map(([valor, label]) => (
        <Link
          key={valor}
          href={qs(valor)}
          className={`text-sm font-bold px-4 py-2 rounded-xl border transition-colors ${
            aba === valor ? "bg-black text-iw-gold border-black" : "bg-white text-black border-iw-border hover:bg-iw-bg"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export default async function FinanceiroSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string; aba?: string; msg?: string; error?: string }>;
}) {
  const { nucleo, aba: abaRaw, msg, error } = await searchParams;
  const aba: "receber" | "pagar" = abaRaw === "pagar" ? "pagar" : "receber";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  if (aba === "pagar") {
    const admin = createAdminClient();
    const { data: categoriasRaw } = await admin
      .from("fin_categorias")
      .select("id, nome")
      .eq("tipo", "DESPESA")
      .eq("ativo", true)
      .order("nome");

    // A RLS (migration 129/130) já restringe ao escopo CETADP do secretário.
    let pagarQuery = supabase
      .from("fin_contas_pagar")
      .select("id, fornecedor, descricao, valor_centavos, data_vencimento, status, forma_pagamento_prevista, church_id, churches(name), fin_categorias(nome)")
      .not("church_id", "is", null)
      .order("data_vencimento");
    if (nucleo) pagarQuery = pagarQuery.eq("church_id", nucleo);
    const { data: pagarRaw } = await pagarQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contasPagar = (pagarRaw ?? []) as any[];

    const hoje = new Date().toISOString().slice(0, 10);
    const emAbertoCentavos = contasPagar
      .filter((c) => c.status === "PENDENTE" || c.status === "ATRASADO")
      .reduce((a, c) => a + c.valor_centavos, 0);
    const atrasadoCentavos = contasPagar
      .filter((c) => (c.status === "PENDENTE" || c.status === "ATRASADO") && c.data_vencimento < hoje)
      .reduce((a, c) => a + c.valor_centavos, 0);
    const pagoCentavos = contasPagar.filter((c) => c.status === "PAGO").reduce((a, c) => a + c.valor_centavos, 0);

    const contas: ContaPagarNucleo[] = contasPagar.map((c) => ({
      id: c.id,
      nucleoNome: (Array.isArray(c.churches) ? c.churches[0] : c.churches)?.name ?? "—",
      fornecedor: c.fornecedor,
      descricao: c.descricao,
      valorCentavos: c.valor_centavos,
      dataVencimento: c.data_vencimento,
      status: c.status,
      formaPrevista: c.forma_pagamento_prevista ?? null,
      categoriaNome: (Array.isArray(c.fin_categorias) ? c.fin_categorias[0] : c.fin_categorias)?.nome ?? null,
    }));

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-iw-gold" />
            </div>
            <h1 className="text-2xl font-black text-black">
              Financeiro{" "}
              <span className="text-base font-normal text-black">- Contas a pagar dos seus núcleos.</span>
            </h1>
          </div>
          <NucleoSelector nucleos={nucleos} />
        </div>

        <AbasFinanceiro aba={aba} nucleo={nucleo} />

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
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">A pagar (em aberto)</p>
            <p className="text-2xl font-black text-iw-error">{fmt(emAbertoCentavos)}</p>
          </div>
          <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Atrasado</p>
            <p className="text-2xl font-black text-iw-error">{fmt(atrasadoCentavos)}</p>
          </div>
          <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Pago</p>
            <p className="text-2xl font-black text-black">{fmt(pagoCentavos)}</p>
          </div>
        </div>

        <ContasAPagarNucleoPainel
          contas={contas}
          categorias={categoriasRaw ?? []}
          nucleos={nucleos}
          criarAction={secretariaCriarContaPagarAction}
          baixarAction={secretariaBaixarContaPagarAction}
          cancelarAction={secretariaCancelarContaPagarAction}
        />
      </div>
    );
  }

  let alunosQuery = supabase.from("ead_alunos").select("id, nome_completo, church_id, churches(name)");
  if (nucleo) alunosQuery = alunosQuery.eq("church_id", nucleo);
  const { data: alunosRaw } = await alunosQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunos = (alunosRaw ?? []) as any[];
  const alunoIds = alunos.map((a) => a.id);
  const alunoInfo = new Map(alunos.map((a) => [a.id, a]));

  const { data: contasRaw } = alunoIds.length
    ? await supabase
        .from("fin_contas_receber")
        .select("id, aluno_id, origem_id, origem_tipo, numero_parcela, total_parcelas, descricao, valor_bruto_centavos, data_vencimento, status")
        .in("aluno_id", alunoIds)
        .order("data_vencimento")
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contas = (contasRaw ?? []) as any[];

  // Turma/curso pra alimentar os filtros do painel (paridade com
  // /professor/financeiro) — junta por matrícula (origem_id quando
  // origem_tipo = MATRICULA_DIRETA), igual o professor faz.
  const matriculaIds = Array.from(
    new Set(contas.filter((c) => c.origem_tipo === "MATRICULA_DIRETA" && c.origem_id).map((c) => c.origem_id as string))
  );
  const { data: matriculasRaw } = matriculaIds.length
    ? await supabase
        .from("ead_matriculas")
        .select("id, curso_nome_snapshot, course_edition_id, course_editions(nome, classe)")
        .in("id", matriculaIds)
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matriculaInfo = new Map((matriculasRaw ?? []).map((m: any) => [m.id, m]));

  const totalPago = contas.filter((c) => c.status === "PAGO").reduce((a, c) => a + c.valor_bruto_centavos, 0);
  const totalPendente = contas.filter((c) => c.status !== "PAGO").reduce((a, c) => a + c.valor_bruto_centavos, 0);

  const parcelas: ParcelaSecretaria[] = contas.map((c) => {
    const aluno = alunoInfo.get(c.aluno_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matricula = matriculaInfo.get(c.origem_id) as any;
    const courseEditionRaw = matricula?.course_editions;
    const courseEdition = Array.isArray(courseEditionRaw) ? courseEditionRaw[0] : courseEditionRaw;
    return {
      id: c.id,
      alunoNome: aluno?.nome_completo ?? "—",
      nucleoNome: aluno?.churches?.name ?? "—",
      numeroParcela: c.numero_parcela,
      totalParcelas: c.total_parcelas,
      descricao: c.descricao,
      valorCentavos: c.valor_bruto_centavos,
      dataVencimento: c.data_vencimento,
      status: c.status,
      origemId: c.origem_id ?? null,
      origemTipo: c.origem_tipo ?? null,
      turmaNome: courseEdition?.nome ? `${courseEdition.nome}${courseEdition.classe ? ` - Classe ${courseEdition.classe}` : ""}` : null,
      cursoNome: matricula?.curso_nome_snapshot ?? null,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-iw-gold" />
          </div>
          <h1 className="text-2xl font-black text-black">
            Financeiro{" "}
            <span className="text-base font-normal text-black">
              - <span className="text-base font-black">{contas.length}</span> parcela{contas.length === 1 ? "" : "s"}{" "}
              nos seus núcleos.
            </span>
          </h1>
        </div>
        <NucleoSelector nucleos={nucleos} />
      </div>

      <AbasFinanceiro aba={aba} nucleo={nucleo} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Pago</p>
          <p className="text-2xl font-black text-iw-success">{fmt(totalPago)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Pendente / Atrasado</p>
          <p className="text-2xl font-black text-iw-error">{fmt(totalPendente)}</p>
        </div>
      </div>

      {parcelas.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <Wallet className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhuma parcela nos seus núcleos ainda.</p>
        </div>
      ) : (
        <FinanceiroSecretariaPainel parcelas={parcelas} />
      )}
    </div>
  );
}
