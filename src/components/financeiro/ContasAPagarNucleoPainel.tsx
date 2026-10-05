"use client";

// ============================================================
// ContasAPagarNucleoPainel — 04/10/2026 (migration 129). Contas a pagar
// do NÚCLEO (fin_contas_pagar com church_id): a mesma estrutura do
// /admin/financeiro, só escopada por núcleo. Usado pela Área da
// Secretaria (vários núcleos no escopo -> mostra coluna/seletor de
// núcleo) e pela Área do Professor (um núcleo só -> sem seletor).
//
// Abas Em aberto/Pagas/Todas + filtro de mês, tudo client-side sobre a
// lista já buscada no server. Criar/pagar/cancelar chegam por props
// (Server Actions de cada área), com escopo conferido lá.
// ============================================================

import { useMemo, useState } from "react";
import { Plus, X, Banknote, Wallet, Ban } from "lucide-react";

export type ContaPagarNucleo = {
  id: string;
  nucleoNome: string;
  fornecedor: string;
  descricao: string;
  valorCentavos: number;
  dataVencimento: string; // yyyy-mm-dd
  status: string; // PENDENTE | ATRASADO | PAGO | CANCELADO
  formaPrevista: string | null;
  categoriaNome: string | null;
};

type FormAction = (formData: FormData) => void | Promise<void>;

interface Props {
  contas: ContaPagarNucleo[];
  categorias: { id: string; nome: string }[];
  // Secretaria passa a lista (escolhe o núcleo no modal); professor não
  // passa (o núcleo é o dele, resolvido na action).
  nucleos?: { churchId: string; nome: string }[];
  criarAction: FormAction;
  baixarAction: FormAction;
  cancelarAction: FormAction;
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ATRASADO: "Atrasado",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  PENDENTE: "bg-white border border-iw-border text-iw-gold",
  ATRASADO: "bg-iw-error/10 text-iw-error",
  PAGO: "bg-iw-success/10 text-iw-success",
  CANCELADO: "bg-iw-muted/10 text-iw-muted",
};

const FORMAS = [
  ["PIX", "Pix"],
  ["DINHEIRO", "Dinheiro"],
  ["CARTAO", "Cartão"],
  ["BOLETO", "Boleto"],
  ["TRANSFERENCIA", "Transferência"],
] as const;

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContasAPagarNucleoPainel({
  contas,
  categorias,
  nucleos,
  criarAction,
  baixarAction,
  cancelarAction,
}: Props) {
  const [filtro, setFiltro] = useState<"ABERTAS" | "PAGO" | "CANCELADO" | "TODAS">("ABERTAS");
  const [mesFiltro, setMesFiltro] = useState("");
  const [aberto, setAberto] = useState(false);
  const mostrarNucleo = !!nucleos;
  const hoje = new Date().toISOString().slice(0, 10);

  const contasComStatus = useMemo(
    () =>
      contas.map((c) => ({
        ...c,
        statusEfetivo: c.status === "PENDENTE" && c.dataVencimento < hoje ? "ATRASADO" : c.status,
      })),
    [contas, hoje]
  );

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(contas.map((c) => c.dataVencimento.slice(0, 7)))).sort(),
    [contas]
  );

  const lista = useMemo(() => {
    let l = contasComStatus.filter((c) => {
      if (filtro === "TODAS") return true;
      if (filtro === "PAGO") return c.statusEfetivo === "PAGO";
      if (filtro === "CANCELADO") return c.statusEfetivo === "CANCELADO";
      return c.statusEfetivo === "PENDENTE" || c.statusEfetivo === "ATRASADO";
    });
    if (mesFiltro) l = l.filter((c) => c.dataVencimento.slice(0, 7) === mesFiltro);
    return [...l].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  }, [contasComStatus, filtro, mesFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(
            [
              ["ABERTAS", "Em aberto"],
              ["PAGO", "Pagas"],
              ["CANCELADO", "Canceladas"],
              ["TODAS", "Todas"],
            ] as [typeof filtro, string][]
          ).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                filtro === valor ? "bg-black text-white border-black" : "bg-white text-black border-iw-border hover:bg-iw-bg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
          >
            <option value="">Todas as datas</option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-iw-gold font-semibold text-xs px-3 py-1.5 hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Nova conta a pagar
          </button>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <Wallet className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhuma conta a pagar encontrada.</p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border bg-iw-bg/50">
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Fornecedor / Descrição</th>
                {mostrarNucleo && <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>}
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Vencimento</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-right">Valor</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Status</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const emAberto = c.statusEfetivo === "PENDENTE" || c.statusEfetivo === "ATRASADO";
                return (
                  <tr key={c.id} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                    <td className="py-2.5 px-4 text-black">
                      <span className="font-medium">{c.fornecedor}</span>
                      <span className="block text-xs">
                        {c.descricao}
                        {c.categoriaNome ? ` · ${c.categoriaNome}` : ""}
                      </span>
                    </td>
                    {mostrarNucleo && <td className="py-2.5 px-4 text-black">{c.nucleoNome}</td>}
                    <td className="py-2.5 px-4 text-black">{new Date(c.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className={`py-2.5 px-4 text-right font-medium ${emAberto ? "text-iw-error" : "text-black"}`}>
                      {fmt(c.valorCentavos)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COR[c.statusEfetivo] ?? "bg-iw-muted/10 text-black"}`}
                      >
                        {STATUS_LABEL[c.statusEfetivo] ?? c.statusEfetivo}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {emAberto ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <form action={baixarAction} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={c.id} />
                            <select
                              name="forma_pagamento"
                              defaultValue={c.formaPrevista ?? "PIX"}
                              className="bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-black"
                            >
                              {FORMAS.map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-iw-error bg-iw-error/10 border border-iw-error/30 rounded-lg px-3 py-1.5 shadow-sm hover:bg-iw-error/15 transition-colors"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Pagar
                            </button>
                          </form>
                          <form action={cancelarAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-black bg-black/5 border border-iw-border rounded-lg px-3 py-1.5 shadow-sm hover:bg-black/10 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-black">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-black flex items-center gap-2">
                <Wallet className="w-4 h-4 text-iw-gold" /> Nova conta a pagar
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="text-black/50 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={criarAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nucleos && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-iw-muted mb-1">Núcleo</label>
                  <select name="church_id" required className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white">
                    <option value="">Selecione...</option>
                    {nucleos.map((n) => (
                      <option key={n.churchId} value={n.churchId}>
                        {n.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-iw-muted mb-1">Fornecedor / Prestador</label>
                <input
                  name="fornecedor"
                  required
                  type="text"
                  placeholder="Ex.: CPFL, Vivo, faxineira"
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-iw-muted mb-1">Descrição</label>
                <input name="descricao" required type="text" className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Valor (R$)</label>
                <input
                  name="valor"
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Vencimento</label>
                <input
                  name="data_vencimento"
                  required
                  type="date"
                  defaultValue={hoje}
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Categoria</label>
                <select name="categoria_id" className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white">
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-iw-muted mb-1">Forma de pagamento prevista</label>
                <select
                  name="forma_pagamento_prevista"
                  defaultValue="PIX"
                  className="w-full rounded-lg border border-iw-border px-3 py-2 text-sm bg-white"
                >
                  {FORMAS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-lg border border-iw-border px-4 py-2 text-sm font-semibold text-black hover:bg-iw-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-black text-iw-gold font-semibold text-sm px-4 py-2 hover:opacity-90"
                >
                  <Plus className="w-4 h-4" /> Cadastrar conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
