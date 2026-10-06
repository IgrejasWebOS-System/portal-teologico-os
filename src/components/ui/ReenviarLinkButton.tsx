"use client";

import { useState } from "react";
import { Send, X, AlertTriangle } from "lucide-react";

// ============================================================
// Botão "Reenviar link" com confirmação (05/10/2026, pedido do Joaquim):
// antes de enviar mostra PARA QUAL E-MAIL o link vai e pede confirmação;
// sem e-mail cadastrado, avisa e não envia. O resultado (sucesso/erro) é
// exibido pela página, via ?msg= / ?error= (sempre em português).
// ============================================================

type Props = {
  action: (formData: FormData) => Promise<void> | void;
  campo: string; // nome do campo hidden (ex.: "aluno_id", "professor_id")
  valor: string; // id do registro
  nome: string;
  email: string | null;
  tipo: "aluno" | "professor";
  className?: string;
  title?: string;
};

export default function ReenviarLinkButton({ action, campo, valor, nome, email, tipo, className, title }: Props) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const emailLimpo = (email ?? "").trim();

  return (
    <>
      <button
        type="button"
        title={title ?? `Reenviar link de acesso para ${tipo === "aluno" ? "o aluno" : "o professor"}`}
        onClick={(e) => {
          e.stopPropagation();
          setAberto(true);
        }}
        className={
          className ??
          "inline-flex items-center gap-1 text-xs font-semibold bg-white text-black border border-iw-gold rounded-lg px-3 py-1.5 shadow-sm hover:bg-iw-gold/10 transition-colors"
        }
      >
        <Send className="w-3.5 h-3.5" /> Reenviar link
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            if (!enviando) setAberto(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-iw-gold shadow-xl p-6 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-black">Reenviar link de acesso</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
                disabled={enviando}
                className="text-black/60 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailLimpo ? (
              <>
                <p className="text-sm mb-2">
                  Enviar o link de acesso para <strong>{nome}</strong> no e-mail:
                </p>
                <p className="text-sm font-bold bg-black/5 border border-black/15 rounded-lg px-3 py-2 break-all mb-4">
                  {emailLimpo}
                </p>
                <p className="text-xs text-black/70 mb-5">
                  Confira se o e-mail está correto antes de confirmar. Se estiver errado, cancele e corrija o cadastro.
                </p>
                <form
                  action={action}
                  onSubmit={() => setEnviando(true)}
                  className="flex items-center justify-end gap-2"
                >
                  <input type="hidden" name={campo} value={valor} />
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    disabled={enviando}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-black/20 hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-black text-iw-gold hover:opacity-90 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" /> {enviando ? "Enviando..." : "Confirmar envio"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2.5 rounded-lg mb-5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>{nome}</strong> não tem e-mail cadastrado. Cadastre o e-mail na ficha antes de reenviar o
                    link.
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-black/20 hover:bg-black/5"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
