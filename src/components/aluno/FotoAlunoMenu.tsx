"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { atualizarMinhaFotoAction } from "@/app/[locale]/portal/foto/actions";

// ============================================================
// Foto do aluno no cabeçalho do menu lateral (53x53, redonda). Sem foto:
// círculo com câmera + "Adicionar foto". Com foto: clicar troca. O upload vai
// por Server Action e grava em ead_alunos.foto_url (mesmo campo da Ficha e do
// cadastro).
// ============================================================

export default function FotoAlunoMenu({ fotoUrl }: { fotoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    const fd = new FormData();
    fd.set("foto", arquivo);
    iniciar(async () => {
      const r = await atualizarMinhaFotoAction(fd);
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pendente}
        title={fotoUrl ? "Clique para trocar a foto" : "Adicionar foto"}
        className="relative w-[53px] h-[53px] rounded-full overflow-hidden border-[1.5px] border-[#E88D0C]/60 shrink-0 group flex items-center justify-center bg-white/5"
      >
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt="Sua foto" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-5 h-5 text-iw-sky/70" />
        )}
        {pendente ? (
          <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </span>
        ) : (
          fotoUrl && (
            <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </span>
          )
        )}
      </button>
      {!fotoUrl && !pendente && <p className="text-[11px] text-iw-sky/70">Adicionar foto</p>}
      {erro && <p className="text-[11px] text-iw-error text-center px-4">{erro}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={aoEscolher} className="hidden" />
    </div>
  );
}
