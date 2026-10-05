"use client";

import { useMemo, useState } from "react";
import { Receipt, CheckCircle2, QrCode, Copy, Check, Wallet, Clock } from "lucide-react";
import QRCodeLib from "qrcode";
import { montarPayloadPix, DADOS_PIX_CETADP } from "@/utils/financeiro/pix";

// ============================================================
// /professor/financeiro (27/09/2026, Fase 1 do Painel do Professor) —
// visão agregada de todas as parcelas dos alunos deste professor, com o
// mesmo mecanismo de Pix + dar baixa já usado em /professor/alunos
// (ProfessorPainel.tsx). Escopo desta tela é só "a receber" (fin_contas_
// receber, já ligado a church_id/aluno) — "Caixa do núcleo" e "Despesas
// do núcleo" (fin_caixa_diario/fin_contas_pagar) ficam de fora de
// propósito: essas tabelas ainda não têm nenhuma coluna de escopo por
// igreja/unidade (Fase 2, ainda não iniciada).
// ============================================================

export type ParcelaComAluno = {
  id: string;
  numero_parcela: number;
  total_parcelas: number;
  descricao: string;
  valor_bruto_centavos: number;
  data_vencimento: string;
  status: string;
  alunoNome: string;
  cursoNome: string;
  turmaNome: string | null;
};

interface Props {
  parcelas: ParcelaComAluno[];
  baixarParcelaAction: (formData: FormData) => Promise<void> | void;
}

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function FinanceiroDoNucleoPainel({ parcelas, baixarParcelaAction }: Props) {
  const [filtro, setFiltro] = useState<"PENDENTE" | "PAGO" | "TODAS">("PENDENTE");
  const [pixAbertoId, setPixAbertoId] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  // 27/09/2026, pedido do Joaquim: filtros extra na extremidade direita da
  // linha de botões (A receber/Recebidas/Todas) — por mês de vencimento,
  // por turma e por curso. "" = sem filtro (todas).
  // 30/09/2026, pedido do Joaquim: por padrão a tela abre já filtrada no
  // mês presente (não "todas as datas") — o professor ainda pode trocar
  // pra "Todas as datas" ou outro mês no próprio seletor.
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mesFiltro, setMesFiltro] = useState(mesAtual);
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.data_vencimento.slice(0, 7)))).sort(),
    [parcelas]
  );
  const turmasDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.turmaNome).filter((t): t is string => !!t))).sort(),
    [parcelas]
  );
  const cursosDisponiveis = useMemo(
    () => Array.from(new Set(parcelas.map((p) => p.cursoNome).filter((c) => c && c !== "—"))).sort(),
    [parcelas]
  );

  const resumo = useMemo(() => {
    const pendentes = parcelas.filter((p) => p.status !== "PAGO");
    const pagas = parcelas.filter((p) => p.status === "PAGO");
    return {
      totalPendenteCentavos: pendentes.reduce((acc, p) => acc + p.valor_bruto_centavos, 0),
      totalPagoCentavos: pagas.reduce((acc, p) => acc + p.valor_bruto_centavos, 0),
      quantidadePendentes: pendentes.length,
      quantidadePagas: pagas.length,
    };
  }, [parcelas]);

  const parcelasFiltradas = useMemo(() => {
    let lista =
      filtro === "TODAS" ? parcelas : parcelas.filter((p) => (filtro === "PAGO" ? p.status === "PAGO" : p.status !== "PAGO"));
    if (mesFiltro) lista = lista.filter((p) => p.data_vencimento.slice(0, 7) === mesFiltro);
    if (turmaFiltro) lista = lista.filter((p) => p.turmaNome === turmaFiltro);
    if (cursoFiltro) lista = lista.filter((p) => p.cursoNome === cursoFiltro);
    return [...lista].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
  }, [parcelas, filtro, mesFiltro, turmaFiltro, cursoFiltro]);

  async function alternarQrPix(p: ParcelaComAluno) {
    if (pixAbertoId === p.id) {
      setPixAbertoId(null);
      setPixQrUrl(null);
      return;
    }
    setPixAbertoId(p.id);
    setPixQrUrl(null);
    setPixCopiado(false);
    const payload = montarPayloadPix({ valorCentavos: p.valor_bruto_centavos, txid: p.id, descricao: p.descricao });
    const url = await QRCodeLib.toDataURL(payload, { margin: 1, width: 220, errorCorrectionLevel: "M" });
    setPixQrUrl(url);
  }

  function copiarCodigoPix(p: ParcelaComAluno) {
    const payload = montarPayloadPix({ valorCentavos: p.valor_bruto_centavos, txid: p.id, descricao: p.descricao });
    navigator.clipboard.writeText(payload);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">A receber</p>
            <p className="text-lg font-black text-iw-navy">{fmtMoeda(resumo.totalPendenteCentavos)}</p>
            <p className="text-[11px] text-iw-muted">{resumo.quantidadePendentes} parcela(s)</p>
          </div>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iw-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-iw-success" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Recebido</p>
            <p className="text-lg font-black text-iw-navy">{fmtMoeda(resumo.totalPagoCentavos)}</p>
            <p className="text-[11px] text-iw-muted">{resumo.quantidadePagas} parcela(s)</p>
          </div>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-iw-blue/10 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-iw-blue" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Total do núcleo</p>
            <p className="text-lg font-black text-iw-navy">
              {fmtMoeda(resumo.totalPendenteCentavos + resumo.totalPagoCentavos)}
            </p>
            <p className="text-[11px] text-iw-muted">{parcelas.length} parcela(s) no total</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {([
            ["PENDENTE", "A receber"],
            ["PAGO", "Recebidas"],
            ["TODAS", "Todas"],
          ] as [typeof filtro, string][]).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                filtro === valor
                  ? "bg-iw-navy text-white border-iw-navy"
                  : "bg-white text-iw-navy border-iw-border hover:bg-iw-bg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 27/09/2026, pedido do Joaquim: filtros extra na extremidade
            direita — data (mês de vencimento), turma e curso. */}
        <div className="flex items-center gap-2">
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-iw-navy"
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
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-iw-navy"
          >
            <option value="">Todas as turmas</option>
            {turmasDisponiveis.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(e.target.value)}
            className="bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-iw-navy"
          >
            <option value="">Todos os cursos</option>
            {cursosDisponiveis.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {parcelasFiltradas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <Receipt className="w-8 h-8 text-iw-muted/40 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhuma parcela encontrada com esse filtro.</p>
        </div>
      ) : (
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-iw-bg border-b border-iw-border text-left">
                <th className="px-4 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Aluno</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider hidden md:table-cell">
                  Descrição
                </th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Vencimento</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Valor</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Status / Ação</th>
              </tr>
            </thead>
            <tbody>
              {parcelasFiltradas.map((p) => (
                <tr key={p.id} className="border-b border-iw-border/60 last:border-b-0 align-top">
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-iw-navy truncate max-w-[200px]">{p.alunoNome}</p>
                    <p className="text-[11px] text-iw-muted">
                      {p.numero_parcela}/{p.total_parcelas}
                    </p>
                  </td>
                  <td className="px-2 py-2.5 text-iw-navy truncate max-w-[220px] hidden md:table-cell">{p.descricao}</td>
                  <td className="px-2 py-2.5 text-iw-navy">{fmtData(p.data_vencimento)}</td>
                  <td className="px-2 py-2.5 text-iw-navy font-semibold">{fmtMoeda(p.valor_bruto_centavos)}</td>
                  <td className="px-2 py-2.5">
                    {p.status === "PAGO" ? (
                      <span className="text-iw-success font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paga
                      </span>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => alternarQrPix(p)}
                            className="flex items-center gap-1 text-[11px] font-bold text-iw-gold hover:text-iw-navy transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            {pixAbertoId === p.id ? "Fechar QR" : "Gerar QR Pix"}
                          </button>
                          <form action={baixarParcelaAction} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="redirect_to" value="/professor/financeiro" />
                            <select
                              name="forma_pagamento"
                              className="bg-white border border-iw-border rounded-md px-1.5 py-1 text-[11px]"
                              defaultValue="PIX"
                            >
                              <option value="PIX">Pix</option>
                              <option value="DEBITO">Débito</option>
                              <option value="CREDITO">Crédito</option>
                              <option value="BOLETO">Boleto</option>
                              <option value="TRANSFERENCIA">Transferência</option>
                            </select>
                            <button
                              type="submit"
                              className="bg-iw-blue hover:bg-iw-navy text-white font-bold px-2 py-1 rounded-md text-[11px] transition-colors"
                            >
                              Dar baixa
                            </button>
                          </form>
                        </div>

                        {pixAbertoId === p.id && (
                          <div className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2 max-w-xs">
                            <p className="text-[10px] text-iw-muted">
                              Pix estático — {fmtMoeda(p.valor_bruto_centavos)} para {DADOS_PIX_CETADP.razaoSocial}.
                            </p>
                            {pixQrUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={pixQrUrl} alt="QR Code Pix" className="w-28 h-28 rounded-lg bg-white p-1.5 mx-auto" />
                            ) : (
                              <p className="text-[10px] text-iw-muted text-center">Gerando QR…</p>
                            )}
                            <button
                              type="button"
                              onClick={() => copiarCodigoPix(p)}
                              className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-iw-gold/10 border border-iw-border text-iw-navy text-[11px] font-bold py-1.5 rounded-lg transition-colors"
                            >
                              {pixCopiado ? <Check className="w-3.5 h-3.5 text-iw-success" /> : <Copy className="w-3.5 h-3.5" />}
                              {pixCopiado ? "Código copiado!" : "Copiar código Pix"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
