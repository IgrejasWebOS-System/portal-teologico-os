"use client";

import { useState } from "react";
import { FileText, Loader2, AlertTriangle } from "lucide-react";
import { gerarLinkPdfMatriculaAction } from "./actions";

export default function BotaoBaixarPdfMatricula({ alunoId }: { alunoId: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleClick = async () => {
    setCarregando(true);
    setErro("");
    const res = await gerarLinkPdfMatriculaAction(alunoId);
    setCarregando(false);
    if (!res.success) {
      setErro(res.message);
      return;
    }
    window.open(res.url, "_blank", "noopener,noreferrer");
  };

  return (
    // Card inteiro agora navega pra tela de editar matrícula (ver
    // admin/matriculas/page.tsx) — este botão fica ANINHADO dentro do <a>
    // do Link, então precisa de preventDefault() (não só stopPropagation).
    // stopPropagation sozinho só impede outros ouvintes de rodar; quem
    // decide se o navegador segue o link é defaultPrevented — sem
    // preventDefault, o <a> navega mesmo assim (bug real, confirmado em
    // teste: clicar em "Baixar PDF" abria a matrícula em vez do PDF).
    // Mantemos os dois: preventDefault trava a navegação do <a>, e
    // stopPropagation evita que o próprio onClick do Link do Next dispare
    // alguma lógica extra de navegação client-side.
    <div
      className="flex flex-col items-end gap-1"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={carregando}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
      >
        {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        Baixar PDF
      </button>
      {erro && (
        <p className="inline-flex items-center gap-1 text-[10px] text-iw-error text-right max-w-[220px]">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {erro}
        </p>
      )}
    </div>
  );
}
