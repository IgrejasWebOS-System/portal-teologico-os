"use client";

import { X, Send, Loader2, CalendarClock } from "lucide-react";

// ============================================================
// Modal de confirmação de parcelas — Nova Matrícula Direta
// (27/09/2026, pedido do Joaquim). Aparece ao clicar "Gerar matrícula"
// quando o curso tem mensalidade (valor de parcela > 0). Mostra a
// quantidade de parcelas, a data da matrícula (hoje) e o vencimento já
// calculado (1 por mês a partir do 1º vencimento informado, empurrado
// pro próximo dia útil quando cai em sábado/domingo — feriados não
// entram por enquanto, só fim de semana).
//
// 27/09/2026, pedido do Joaquim: tirado o toggle manual "aluno já estuda
// desde antes" — redundante, porque a própria data do 1º vencimento já
// diz isso (matrícula nova vem com data atual/futura; aluno antigo sendo
// lançado agora vem com data passada). O estado inicial das caixinhas
// "já paga" agora é só: vencimento (antes do ajuste de fim de semana) no
// passado ou hoje = vem marcada; no futuro = vem desmarcada. A secretaria
// pode ajustar cada uma na hora, antes de confirmar.
// ============================================================

export type ParcelaPreview = {
  numero: number;
  vencimentoOriginal: string; // ISO, antes do ajuste de fim de semana
  vencimentoFinal: string; // ISO, já ajustado
  valorCentavos: number;
};

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBr(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

interface Props {
  parcelas: ParcelaPreview[];
  pagas: boolean[];
  onTogglePaga: (index: number) => void;
  dataMatriculaIso: string;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  // 01/10/2026, achado do Joaquim: a taxa de matrícula (curso com
  // course_pricing.valor_matricula_centavos > 0, ex. Básico) não entra em
  // nenhuma das parcelas abaixo -- ela é lançada à parte em Contas a
  // Receber (mesma lógica de matricularDiretoAction/completar-cadastro,
  // não mexida aqui), com vencimento igual ao da 1ª mensalidade. Esse
  // campo é só pra deixar isso visível neste modal também, não muda
  // nenhum cálculo nem o que é enviado ao confirmar.
  matricula?: { valorCentavos: number; vencimento: string };
}

export default function ConfirmarParcelasModal({
  parcelas, pagas, onTogglePaga, dataMatriculaIso, enviando, onCancelar, onConfirmar, matricula,
}: Props) {
  const totalPagoCentavos = parcelas.reduce((acc, p, i) => (pagas[i] ? acc + p.valorCentavos : acc), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      {/* 28/09/2026, achado do Joaquim: com 12 parcelas o modal precisava de
          rolagem pra ver as últimas 3-4 linhas — max-h subiu de 90vh pra
          97vh (quase a tela toda) pra caber a lista inteira na maioria dos
          casos sem precisar rolar. */}
      <div className="relative w-full max-w-2xl bg-iw-bg border border-iw-gold rounded-2xl shadow-xl max-h-[97vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border bg-iw-surface rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-iw-gold" />
            <h2 className="text-sm font-bold text-black">Confirmar parcelas da matrícula</h2>
          </div>
          <button type="button" onClick={onCancelar} className="text-black hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-iw-border shrink-0 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-extrabold text-black uppercase tracking-wider">Data da matrícula</p>
            <p className="text-black">{fmtDataBr(dataMatriculaIso)}</p>
          </div>
          <div>
            <p className="font-extrabold text-black uppercase tracking-wider">Nº de parcelas</p>
            <p className="text-black">{parcelas.length}</p>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-3 flex-1">
          {matricula && matricula.valorCentavos > 0 && (
            <div className="flex items-center justify-between gap-3 bg-iw-gold/10 border border-iw-gold/40 rounded-xl px-3 py-2.5 mb-3">
              <div>
                <p className="text-xs font-extrabold text-black uppercase tracking-wider">
                  Matrícula (lançamento separado, fora das parcelas abaixo)
                </p>
                <p className="text-[11px] text-black">
                  Vence junto com a 1ª parcela ({fmtDataBr(matricula.vencimento)}) — vai pro Financeiro como
                  &ldquo;Matrícula&rdquo;, não soma em nenhuma mensalidade.
                </p>
              </div>
              <p className="text-sm font-bold text-black whitespace-nowrap">{fmtMoeda(matricula.valorCentavos)}</p>
            </div>
          )}
          <p className="text-xs text-black mb-2">
            Parcelas com vencimento até hoje já vêm marcadas como pagas — desmarque as que ainda
            não foram quitadas. As com vencimento futuro vêm desmarcadas.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-iw-surface border-b border-iw-border text-left">
                <th className="px-3 py-2 text-[10px] font-extrabold text-black uppercase tracking-wider">Parcela</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-black uppercase tracking-wider">Vencimento</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-black uppercase tracking-wider">Valor</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-black uppercase tracking-wider text-center">Já paga</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => {
                const ajustada = p.vencimentoFinal !== p.vencimentoOriginal;
                return (
                  <tr key={p.numero} className="border-b border-iw-border/60 last:border-b-0">
                    <td className="px-3 py-1.5 text-black">{p.numero}/{parcelas.length}</td>
                    <td className="px-3 py-1.5 text-black">
                      {fmtDataBr(p.vencimentoFinal)}
                      {ajustada && (
                        <span className="block text-[10px] text-iw-muted">
                          era {fmtDataBr(p.vencimentoOriginal)} (fim de semana, ajustado)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-black">{fmtMoeda(p.valorCentavos)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={pagas[i] ?? false}
                        onChange={() => onTogglePaga(i)}
                        className="w-4 h-4 accent-iw-gold cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-iw-border shrink-0">
          <p className="text-xs text-black">
            {totalPagoCentavos > 0
              ? <>Já paga: <strong>{fmtMoeda(totalPagoCentavos)}</strong></>
              : "Nenhuma parcela marcada como paga."}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancelar}
              disabled={enviando}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black border border-black hover:bg-iw-bg transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={enviando}
              className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-opacity border border-black"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirmar e gerar matrícula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
