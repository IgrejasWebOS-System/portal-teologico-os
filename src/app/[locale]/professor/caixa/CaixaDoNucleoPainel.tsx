"use client";

import { useState } from "react";
import { Plus, Trash2, Wallet, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

// ============================================================
// /professor/caixa (Fase 2, 27/09/2026 — atualizado no mesmo dia a
// pedido do Joaquim) — virou um livro de movimentação normal: ENTRADAS
// (parcelas de mensalidade já dadas baixa em /professor/alunos ou
// /professor/financeiro, lidas direto de fin_contas_receber — não
// duplica dado nenhum, só reflete o que já foi baixado) e SAÍDAS
// (despesas lançadas aqui mesmo, tabela nucleo_despesas). Sem abrir/
// fechar caixa e sem aprovação da secretaria pras despesas, conforme já
// combinado — só a entrada que passou a aparecer automaticamente.
// ============================================================

export type Movimentacao = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  descricao: string;
  valor_centavos: number;
  data: string;
  categoriaNome: string | null;
  formaPagamento: string | null;
  excluivel: boolean;
};

interface Props {
  movimentacoes: Movimentacao[];
  categorias: { id: string; nome: string }[];
  lancarAction: (formData: FormData) => Promise<void> | void;
  excluirAction: (formData: FormData) => Promise<void> | void;
}

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function CaixaDoNucleoPainel({ movimentacoes, categorias, lancarAction, excluirAction }: Props) {
  const [aberto, setAberto] = useState(false);
  const hojeIso = new Date().toISOString().slice(0, 10);

  const totalEntradasCentavos = movimentacoes
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((acc, m) => acc + m.valor_centavos, 0);
  const totalSaidasCentavos = movimentacoes
    .filter((m) => m.tipo === "SAIDA")
    .reduce((acc, m) => acc + m.valor_centavos, 0);
  const saldoCentavos = totalEntradasCentavos - totalSaidasCentavos;

  const movimentacoesOrdenadas = [...movimentacoes].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iw-success/10 flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-4 h-4 text-iw-success" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Entradas</p>
            <p className="text-lg font-black text-iw-navy">{fmtMoeda(totalEntradasCentavos)}</p>
          </div>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iw-error/10 flex items-center justify-center shrink-0">
            <ArrowUpCircle className="w-4 h-4 text-iw-error" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Saídas</p>
            <p className="text-lg font-black text-iw-navy">{fmtMoeda(totalSaidasCentavos)}</p>
          </div>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iw-blue/10 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-iw-blue" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Saldo</p>
            <p className={`text-lg font-black ${saldoCentavos < 0 ? "text-iw-error" : "text-iw-navy"}`}>
              {fmtMoeda(saldoCentavos)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-iw-navy text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Lançar despesa
        </button>
      </div>

      {movimentacoesOrdenadas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <Wallet className="w-8 h-8 text-iw-muted/40 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhuma movimentação ainda.</p>
        </div>
      ) : (
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-iw-bg border-b border-iw-border text-left">
                <th className="px-4 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Data</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Tipo</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Descrição</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider hidden md:table-cell">
                  Categoria
                </th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Valor</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody>
              {movimentacoesOrdenadas.map((m) => (
                <tr key={`${m.tipo}-${m.id}`} className="border-b border-iw-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-iw-navy">{fmtData(m.data)}</td>
                  <td className="px-2 py-2.5">
                    {m.tipo === "ENTRADA" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-iw-success/10 text-iw-success">
                        <ArrowDownCircle className="w-3 h-3" /> Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-iw-error/10 text-iw-error">
                        <ArrowUpCircle className="w-3 h-3" /> Saída
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-iw-navy truncate max-w-[240px]">{m.descricao}</td>
                  <td className="px-2 py-2.5 text-iw-muted truncate max-w-[160px] hidden md:table-cell">
                    {m.categoriaNome ?? "—"}
                  </td>
                  <td className={`px-2 py-2.5 font-semibold ${m.tipo === "ENTRADA" ? "text-iw-success" : "text-iw-error"}`}>
                    {m.tipo === "ENTRADA" ? "+" : "-"} {fmtMoeda(m.valor_centavos)}
                  </td>
                  <td className="px-2 py-2.5">
                    {m.excluivel && (
                      <form action={excluirAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          title="Excluir despesa"
                          className="text-iw-muted hover:text-iw-error transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <div className="relative w-full max-w-md bg-iw-bg border border-iw-gold rounded-2xl shadow-xl">
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border bg-iw-surface rounded-t-2xl">
              <h2 className="text-sm font-bold text-black">Lançar despesa</h2>
              <button type="button" onClick={() => setAberto(false)} className="text-black hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={lancarAction} className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-black uppercase tracking-wider mb-1">
                  Descrição *
                </label>
                <input
                  name="descricao"
                  required
                  placeholder="Ex.: material didático, lanche da turma..."
                  className="w-full border border-iw-border rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-black uppercase tracking-wider mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    name="valor"
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    className="w-full border border-iw-border rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-black uppercase tracking-wider mb-1">
                    Data
                  </label>
                  <input
                    name="data_despesa"
                    type="date"
                    defaultValue={hojeIso}
                    max={hojeIso}
                    className="w-full border border-iw-border rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-black uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  name="categoria_id"
                  defaultValue=""
                  className="w-full border border-iw-border rounded-xl px-3 py-2 text-sm text-black bg-white cursor-pointer"
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-black uppercase tracking-wider mb-1">
                  Forma de pagamento
                </label>
                <select
                  name="forma_pagamento"
                  defaultValue=""
                  className="w-full border border-iw-border rounded-xl px-3 py-2 text-sm text-black bg-white cursor-pointer"
                >
                  <option value="">Não informado</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-black border border-black hover:bg-iw-bg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#E88D0C] hover:opacity-90 text-white font-bold text-sm px-5 py-2 rounded-xl transition-opacity border border-black"
                >
                  Lançar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
