"use client";

// ============================================================
// 25/09/2026, pedido do Joaquim: quando o professor matricula um aluno
// direto pela Área do Professor ("Nova Matrícula"), esse aluno só tinha
// o e-mail de convite como jeito de acessar — se caísse no spam ou
// demorasse, o professor não tinha como ajudar. Este cartão aparece uma
// vez, logo depois da matrícula (via query ?novoAlunoId=), com um botão
// que gera e copia o link de definir senha na hora, pro professor
// encaminhar ele mesmo (WhatsApp, etc.) sem depender só do e-mail.
// ============================================================

import { useState, useTransition } from "react";
import { Copy, Check, Loader2, KeyRound, X } from "lucide-react";
import { professorGerarLinkSenhaAction } from "./actions";

export default function LinkSenhaAlunoCard({ alunoId, nome }: { alunoId: string; nome: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [dispensado, setDispensado] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dispensado) return null;

  const handleGerarECopiar = () => {
    setErro("");
    startTransition(async () => {
      const res = await professorGerarLinkSenhaAction(alunoId);
      if (!res.success || !res.url) {
        setErro(res.message ?? "Erro ao gerar o link.");
        return;
      }
      setUrl(res.url);
      try {
        await navigator.clipboard.writeText(res.url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      } catch {
        // clipboard indisponível — o link já fica visível na tela pra copiar manualmente
      }
    });
  };

  return (
    <div className="mb-6 bg-iw-gold/10 border border-iw-gold/40 rounded-2xl px-4 py-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-iw-navy font-bold text-sm">
          <KeyRound className="w-4 h-4 shrink-0" />
          Encaminhar acesso para {nome}
        </div>
        <button
          type="button"
          onClick={() => setDispensado(true)}
          className="text-iw-muted hover:text-iw-navy shrink-0"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-black">
        Um e-mail de acesso já foi enviado. Se preferir garantir, gere o link de definir senha aqui e
        encaminhe você mesmo (WhatsApp, por exemplo) — funciona mesmo se o e-mail cair no spam.
      </p>

      {url ? (
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
          <span className="flex-1 text-xs text-iw-navy break-all">{url}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              } catch {
                // ignora — link já visível pra copiar manualmente
              }
            }}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-iw-navy hover:text-iw-navy"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGerarECopiar}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition-opacity"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
          Gerar e copiar link de definir senha
        </button>
      )}

      {erro && <p className="text-xs text-iw-error">{erro}</p>}
    </div>
  );
}
