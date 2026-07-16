import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet, Lock, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { abrirCaixaAction, fecharCaixaAction, lancarMovimentacaoAction } from "../actions";

export const metadata = { title: "Caixa Diário — CETADP" };

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function CaixaDiarioPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

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
    .select("*")
    .eq("data", hoje)
    .maybeSingle();

  const { data: ultimoFechado } = await supabase
    .from("fin_caixa_diario")
    .select("saldo_final_centavos")
    .eq("status", "FECHADO")
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saldoSugerido = ultimoFechado?.saldo_final_centavos ?? 0;

  const { data: categorias } = await supabase
    .from("fin_categorias")
    .select("id, nome, tipo, codigo")
    .eq("ativo", true)
    .order("tipo")
    .order("codigo");

  const categoriaSangriaId = (categorias ?? []).find((c) => c.codigo === "SANGRIA")?.id ?? "";

  let lancamentos: {
    id: string;
    tipo: string;
    valor_centavos: number;
    descricao: string;
    forma_pagamento: string;
    created_at: string;
    fin_categorias: { nome: string } | null;
  }[] = [];

  if (caixaHoje) {
    const { data } = await supabase
      .from("fin_lancamentos")
      .select("id, tipo, valor_centavos, descricao, forma_pagamento, created_at, fin_categorias(nome)")
      .eq("caixa_diario_id", caixaHoje.id)
      .order("created_at", { ascending: false });
    lancamentos = (data ?? []) as unknown as typeof lancamentos;
  }

  const totalEntradas = lancamentos.filter((l) => l.tipo === "ENTRADA").reduce((a, l) => a + l.valor_centavos, 0);
  const totalSaidas = lancamentos.filter((l) => l.tipo === "SAIDA").reduce((a, l) => a + l.valor_centavos, 0);
  const saldoAtual = caixaHoje ? caixaHoje.saldo_inicial_centavos + totalEntradas - totalSaidas : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/financeiro"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Financeiro
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              Caixa Diário — {new Date(hoje + "T00:00:00").toLocaleDateString("pt-BR")}
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">Movimentações de entrada e saída do dia.</p>
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

      {!caixaHoje ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-4">
          <p className="text-sm text-iw-muted">
            O caixa de hoje ainda não foi aberto. Saldo inicial sugerido (saldo final do último dia fechado):{" "}
            <strong className="text-iw-navy">{fmt(saldoSugerido)}</strong>
          </p>
          <form action={abrirCaixaAction} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Saldo inicial</label>
              <input
                name="saldo_inicial"
                defaultValue={(saldoSugerido / 100).toFixed(2).replace(".", ",")}
                className="bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm w-40 focus:border-iw-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
            >
              Abrir caixa
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-iw-muted uppercase">Saldo inicial</p>
              <p className="text-lg font-black text-iw-navy">{fmt(caixaHoje.saldo_inicial_centavos)}</p>
            </div>
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-iw-muted uppercase">Saldo atual</p>
              <p className="text-lg font-black text-iw-gold">{fmt(saldoAtual)}</p>
            </div>
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-iw-muted uppercase">Status</p>
              <p className={`text-lg font-black ${caixaHoje.status === "ABERTO" ? "text-iw-success" : "text-iw-muted"}`}>
                {caixaHoje.status === "ABERTO" ? "Aberto" : "Fechado"}
              </p>
            </div>
          </div>

          {caixaHoje.status === "ABERTO" && (
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider inline-flex items-center gap-2">
                <Plus className="w-4 h-4 text-iw-gold" />
                Novo lançamento
              </h2>
              <form action={lancarMovimentacaoAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <input type="hidden" name="caixa_diario_id" value={caixaHoje.id} />
                <select name="tipo" required defaultValue="" className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm cursor-pointer">
                  <option value="" disabled>Tipo</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
                <select name="categoria_id" defaultValue="" className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm cursor-pointer">
                  <option value="">Sem categoria</option>
                  {(categorias ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.tipo === "RECEITA" ? "▲" : "▼"} {c.nome}</option>
                  ))}
                </select>
                <input name="valor" required placeholder="Valor (ex: 150,00)" className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm" />
                <input name="descricao" required placeholder="Descrição" className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm" />
                <select name="forma_pagamento" defaultValue="DINHEIRO" className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm cursor-pointer">
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="OUTRO">Outro</option>
                </select>
                <button type="submit" className="sm:col-span-6 justify-self-start bg-iw-blue hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity">
                  Lançar
                </button>
              </form>

              {categoriaSangriaId && (
                <form action={lancarMovimentacaoAction} className="flex flex-wrap items-end gap-3 pt-3 border-t border-iw-border">
                  <input type="hidden" name="caixa_diario_id" value={caixaHoje.id} />
                  <input type="hidden" name="tipo" value="SAIDA" />
                  <input type="hidden" name="categoria_id" value={categoriaSangriaId} />
                  <input type="hidden" name="descricao" value="Sangria para depósito bancário" />
                  <input type="hidden" name="forma_pagamento" value="DINHEIRO" />
                  <div>
                    <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">
                      Sangria (retirada p/ depósito)
                    </label>
                    <input
                      name="valor"
                      required
                      placeholder="Valor (ex: 150,00)"
                      className="bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm w-48 focus:border-iw-gold focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-iw-navy hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
                  >
                    Registrar sangria
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="bg-iw-surface border border-iw-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-iw-bg border-b border-iw-border">
              <h2 className="text-xs font-bold text-iw-muted uppercase tracking-wider">Lançamentos do dia</h2>
            </div>
            {lancamentos.length === 0 ? (
              <p className="text-iw-muted text-sm text-center py-8">Nenhum lançamento ainda.</p>
            ) : (
              <ul className="divide-y divide-iw-border">
                {lancamentos.map((l) => (
                  <li key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-iw-navy truncate">{l.descricao}</p>
                      <p className="text-xs text-iw-muted truncate">
                        {l.fin_categorias?.nome ?? "Sem categoria"} · {l.forma_pagamento}
                      </p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${l.tipo === "ENTRADA" ? "text-iw-success" : "text-iw-error"}`}>
                      {l.tipo === "ENTRADA" ? "+" : "−"} {fmt(l.valor_centavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {caixaHoje.status === "ABERTO" && (
            <form action={fecharCaixaAction} className="flex justify-end">
              <input type="hidden" name="caixa_diario_id" value={caixaHoje.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-iw-navy hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
              >
                <Lock className="w-4 h-4" />
                Fechar caixa do dia
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
