"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, User } from "lucide-react";

// ============================================================
// /professor/configuracoes (10/10/2026, pedido do Joaquim): em vez de abrir
// já com a ficha inteira, a tela mostra UM card (foto + dados básicos); clicar
// no card abre/fecha a ficha completa (o formulário). O formulário fica
// montado mesmo fechado, só escondido — nada se perde ao abrir e fechar.
// Todo texto em preto (#000000).
// ============================================================

export default function ProfessorFichaCard({
  fotoUrl,
  nome,
  cargo,
  setor,
  igreja,
  telefone,
  email,
  children,
}: {
  fotoUrl: string | null;
  nome: string;
  cargo: string | null;
  setor: string | null;
  igreja: string | null;
  telefone: string | null;
  email: string | null;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  const linhaLocal = [igreja, setor].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full text-left bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-5 flex items-center gap-5 hover:bg-black/5 transition-colors"
      >
        <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden border-[1.5px] border-[#E88D0C]/60 flex items-center justify-center bg-black/5">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Sua foto" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-black" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-black">
          <p className="text-lg font-black uppercase truncate">{nome}</p>
          <p className="text-sm">{[cargo, linhaLocal].filter(Boolean).join(" — ") || "—"}</p>
          <p className="text-sm">{[telefone, email].filter(Boolean).join(" · ") || "—"}</p>
          <p className="text-xs mt-1 font-semibold">
            {aberto ? "Clique para fechar a ficha" : "Clique para abrir a ficha completa"}
          </p>
        </div>

        {aberto ? (
          <ChevronDown className="w-5 h-5 text-black shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-black shrink-0" />
        )}
      </button>

      <div hidden={!aberto}>{children}</div>
    </div>
  );
}
