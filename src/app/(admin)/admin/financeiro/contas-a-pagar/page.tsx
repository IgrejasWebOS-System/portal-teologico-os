import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, Plus, Check, Ban } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import {
  baixarContaPagarAction,
  cancelarContaPagarAction,
  criarContaPagarAction,
} from "../actions";

export const metadata = { title: "Contas a Pagar — CETADP" };

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

interface ContaPagar {
  id: string;
  fornecedor: string;
  descricao: string;
  valor_centavos: number;
  forma_pagamento_prevista: string;
  data_vencimento: string;
  status: string;
  fin_categorias: { nome: string } | null;
}

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string; status?: string }>;
}

export default async function ContasAPagarPage({ searchParams }: PageProps) {
  const { msg, error, status: filtroStatus } = await searchParams;

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
    .select("id, status")
    .eq("data", hoje)
    .maybeSingle();
  const caixaAbertoId = caixaHoje?.status === "ABERTO" ? caixaHoje.id : "";

  const { data: contasRaw } = await supabase
    .from("fin_contas_pagar")
    .select("id, fornecedor, descricao, valor_centavos, forma_pagamento_prevista, data_vencimento, status, fin_categorias(nome)")
    .order("data_vencimento", { ascending: true });

  const contas = (contasRaw ?? []) as unknown as ContaPagar[];

  const { data: categoriasRaw } = await supabase
    .from("fin_categorias")
    .select("id, nome")
    .eq("tipo", "DESPESA")
    .eq("ativo", true)
    .order("codigo");
  const categorias = categoriasRaw ?? [];

  const comAtraso = contas.map((c) => ({
    ...c,
    statusEfetivo: c.status === "PENDENTE" && c.data_vencimento < hoje ? "ATRASADO" : c.status,
  }));

  const filtro = filtroStatus ?? "ABERTAS";
  const listaFiltrada = comAtraso.filter((c) => {
    if (filtro === "TODAS") return true;
    if (filtro === "ABERTAS") return c.statusEfetivo === "PENDENTE" || c.statusEfetivo === "ATRASADO";
    return c.statusEfetivo === filtro;
  });

  const totalPendente = comAtraso
    .filter((c) => c.statusEfetivo === "PENDENTE")
    .reduce((a, c) => a + c.valor_centavos, 0);
  const totalAtrasado = comAtraso
    .filter((c) => c.statusEfetivo === "ATRASADO")
    .reduce((a, c) => a + c.valor_centavos, 0);
  const totalPagoMes = comAtraso
    .filter((c) => c.status === "PAGO" && c.data_vencimento.slice(0, 7) === hoje.slice(0, 7))
    .reduce((a, c) => a + c.valor_centavos, 0);

  const abas: { key: string; label: string }[] = [
    { key: "ABERTAS", label: "Em aberto" },
    { key: "ATRASADO", label: "Atrasadas" },
    { key: "PAGO", label: "Pagas" },
    { key: "CANCELADO", label: "Canceladas" },
    { key: "TODAS", label: "Todas" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div>
        <Link
          href="/admin/financeiro"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Financeiro
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-error/10 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-iw-error" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Contas a Pagar</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Despesas com fornecedores, professores e serviços — aluguel, contas, material, honorários.
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">A pagar</p>
          <p className="text-lg font-black text-iw-navy">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Atrasado</p>
          <p className="text-lg font-black text-iw-error">{fmt(totalAtrasado)}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Pago no mês</p>
          <p className="text-lg font-black text-iw-success">{fmt(totalPagoMes)}</p>
        </div>
      </div>

      <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy uppercase tracking-wider">
          <Plus className="w-4 h-4 text-iw-error" />
          Nova conta a pagar
        </summary>
        <form action={criarContaPagarAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
          <input
            name="fornecedor"
            required
            placeholder="Fornecedor / prestador"
            className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="descricao"
            required
            placeholder="Descrição (ex: Aluguel — agosto/2026)"
            className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <select
            name="categoria_id"
            defaultValue=""
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
          >
            <option value="">Categoria (opcional)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            name="forma_pagamento_prevista"
            defaultValue="TRANSFERENCIA"
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
          >
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">Pix</option>
            <option value="CARTAO">Cartão</option>
            <option value="BOLETO">Boleto</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </select>
          <input
            name="valor"
            required
            placeholder="Valor (ex: 350,00)"
            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="data_vencimento"
            type="date"
            required
            defaultValue={hoje}
            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-2 bg-iw-error hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
          >
            Cadastrar
          </button>
        </form>
      </details>

      <div className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <Link
            key={a.key}
            href={`/admin/financeiro/contas-a-pagar?status=${a.key}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filtro === a.key
                ? "bg-iw-navy text-white"
                : "bg-iw-surface border border-iw-border text-iw-muted hover:text-iw-navy"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <div className="bg-iw-surface border border-iw-border rounded-2xl overflow-hidden">
        {listaFiltrada.length === 0 ? (
          <p className="text-iw-muted text-sm text-center py-10">Nenhuma conta nesse filtro.</p>
        ) : (
          <ul className="divide-y divide-iw-border">
            {listaFiltrada.map((c) => {
              const badgeCls =
                c.statusEfetivo === "PAGO"
                  ? "bg-iw-success-bg text-iw-success"
                  : c.statusEfetivo === "ATRASADO"
                    ? "bg-iw-error-bg text-iw-error"
                    : c.statusEfetivo === "CANCELADO"
                      ? "bg-iw-bg text-iw-muted"
                      : "bg-iw-gold/10 text-iw-gold";

              return (
                <li key={c.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-iw-navy truncate">{c.descricao}</p>
                      <p className="text-xs text-iw-muted truncate">
                        {c.fornecedor}
                        {c.fin_categorias?.nome ? ` · ${c.fin_categorias.nome}` : ""} · vence {fmtData(c.data_vencimento)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-iw-navy">{fmt(c.valor_centavos)}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${badgeCls}`}>
                        {c.statusEfetivo}
                      </span>
                    </div>
                  </div>

                  {(c.statusEfetivo === "PENDENTE" || c.statusEfetivo === "ATRASADO") && (
                    <details className="group">
                      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs font-bold text-iw-blue hover:opacity-80">
                        <Check className="w-3.5 h-3.5" />
                        Dar baixa / cancelar
                      </summary>
                      <div className="mt-3 space-y-3 bg-iw-bg rounded-xl p-4">
                        <form action={baixarContaPagarAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="caixa_diario_id" value={caixaAbertoId} />
                          <select
                            name="forma_pagamento"
                            defaultValue={c.forma_pagamento_prevista}
                            className="sm:col-span-4 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm cursor-pointer"
                          >
                            <option value="DINHEIRO" disabled={!caixaAbertoId}>
                              Dinheiro {!caixaAbertoId ? "(abra o caixa)" : ""}
                            </option>
                            <option value="PIX">Pix</option>
                            <option value="CARTAO">Cartão</option>
                            <option value="BOLETO">Boleto</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                          </select>
                          <button
                            type="submit"
                            className="sm:col-span-2 justify-self-start bg-iw-success hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-opacity"
                          >
                            Confirmar pagamento
                          </button>
                        </form>
                        <p className="text-[11px] text-iw-muted">
                          Pagamento em dinheiro sai do Caixa Diário (precisa estar aberto). Pix/boleto/transferência só
                          registram a baixa aqui, sem tocar no caixa físico.
                        </p>
                        <form action={cancelarContaPagarAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-error hover:opacity-80"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cancelar conta
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
