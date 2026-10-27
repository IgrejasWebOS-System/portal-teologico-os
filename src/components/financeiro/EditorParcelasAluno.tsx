import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Receipt } from "lucide-react";

// ============================================================
// Tela FINANCEIRO do aluno (26/10/2026): lista todas as parcelas com data de vencimento e
// valor editáveis. Componente de servidor (sem estado): cada linha é um formulário que chama a
// ação recebida em `action`, escopada pelo chamador (professor dono do aluno ou staff no escopo).
// ============================================================

export interface ParcelaEditavel {
  id: string;
  descricao: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  valor_bruto_centavos: number;
  status: string;
  data_vencimento: string;
  pago_em: string | null;
  fin_lancamento_id: string | null;
}

const fmtValor = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const fmtData = (iso: string) => iso.split("-").reverse().join("/");

const STATUS_ROTULO: Record<string, { texto: string; cls: string }> = {
  PAGO: { texto: "Paga", cls: "bg-iw-success/10 text-iw-success" },
  PENDENTE: { texto: "Em aberto", cls: "bg-amber-100 text-amber-800" },
  ATRASADO: { texto: "Atrasada", cls: "bg-iw-error/10 text-iw-error" },
  CANCELADO: { texto: "Cancelada", cls: "bg-iw-muted/10 text-iw-muted" },
};

const campo = "border border-iw-border rounded-lg px-2 py-1.5 text-sm bg-white text-iw-navy";

export default function EditorParcelasAluno({
  alunoNome,
  matriculaNumero,
  curso,
  matriculaId,
  alunoId,
  parcelas,
  action,
  voltarHref,
  voltarLabel,
  msg,
  error,
}: {
  alunoNome: string;
  matriculaNumero: string | null;
  curso: string | null;
  matriculaId: string;
  alunoId: string;
  parcelas: ParcelaEditavel[];
  action: (formData: FormData) => void | Promise<void>;
  voltarHref: string;
  voltarLabel: string;
  msg?: string;
  error?: string;
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Link href={voltarHref} className="inline-flex items-center gap-1 text-sm font-bold text-iw-navy hover:opacity-70">
        <ArrowLeft className="w-4 h-4" /> {voltarLabel}
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Receipt className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-iw-navy">Financeiro do aluno</h1>
          <p className="text-sm text-iw-muted">
            {alunoNome}
            {matriculaNumero ? ` — ${matriculaNumero}` : ""}
            {curso ? ` — ${curso}` : ""}
          </p>
        </div>
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

      <p className="text-xs text-iw-muted">
        Altere a data de vencimento e o valor de cada parcela e clique em Salvar. Parcelas pagas também podem ser
        corrigidas. Cada alteração fica registrada (quem, quando, valor antes e depois).
      </p>

      {parcelas.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-border px-5 py-10 text-center text-sm text-iw-muted">
          Este aluno ainda não tem parcelas lançadas.
        </div>
      ) : (
        <ul className="space-y-2">
          {parcelas.map((p) => {
            const st = STATUS_ROTULO[p.status] ?? { texto: p.status, cls: "bg-iw-muted/10 text-iw-muted" };
            const paga = p.status === "PAGO";
            const cancelada = p.status === "CANCELADO";
            const doCaixa = paga && !!p.fin_lancamento_id;
            return (
              <li key={p.id} className="bg-iw-surface rounded-2xl border border-iw-border p-4">
                <form action={action} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="parcela_id" value={p.id} />
                  <input type="hidden" name="matricula_id" value={matriculaId} />
                  <input type="hidden" name="aluno_id" value={alunoId} />
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-bold text-iw-navy">
                      {p.numero_parcela ?? "?"}/{p.total_parcelas ?? "?"} — {p.descricao ?? "Parcela"}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${st.cls}`}>{st.texto}</span>
                    {paga && p.pago_em && (
                      <span className="ml-2 text-[11px] text-iw-muted">paga em {fmtData(p.pago_em.slice(0, 10))}</span>
                    )}
                  </div>
                  <label className="text-xs font-bold text-iw-navy">
                    Vencimento
                    <input type="date" name="data_vencimento" defaultValue={p.data_vencimento} required disabled={cancelada} className={`${campo} block mt-1`} />
                  </label>
                  <label className="text-xs font-bold text-iw-navy">
                    Valor (R$)
                    <input
                      name="valor"
                      defaultValue={fmtValor(p.valor_bruto_centavos)}
                      inputMode="decimal"
                      required
                      disabled={cancelada}
                      readOnly={doCaixa}
                      title={doCaixa ? "Pago em dinheiro (Caixa Diário): ajuste o valor pelo Caixa." : undefined}
                      className={`${campo} block mt-1 w-28`}
                    />
                  </label>
                  {paga && (
                    <label className="text-xs font-bold text-iw-navy">
                      Data do pagamento
                      <input type="date" name="data_pagamento" defaultValue={p.pago_em ? p.pago_em.slice(0, 10) : ""} className={`${campo} block mt-1`} />
                    </label>
                  )}
                  {cancelada ? (
                    <span className="text-xs text-iw-muted pb-2">Cancelada: reative a parcela para editar.</span>
                  ) : (
                    <button type="submit" className="bg-iw-navy text-white text-sm font-bold px-4 py-2 rounded-lg">
                      Salvar
                    </button>
                  )}
                </form>
                {doCaixa && (
                  <p className="mt-2 text-[11px] text-iw-muted">Pago em dinheiro (Caixa Diário): a data pode ser corrigida aqui; o valor só pelo Caixa.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
