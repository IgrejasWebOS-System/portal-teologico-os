"use client";

import { useState } from "react";

// ============================================================
// Imagem do hero que substitui o antigo quadro "Como funciona o
// acesso" (texto). Salve o arquivo em:
//
//   public/como-funciona.png
//
// Enquanto o arquivo não existir (ou falhar ao carregar), mostra um
// aviso discreto em vez de quebrar o layout.
// ============================================================

export default function HeroAcessoImagem() {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <div className="bg-iw-navy rounded-2xl p-8 text-white/40 text-xs text-center">
        Salve a imagem em public/como-funciona.png
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/como-funciona.png"
      alt="Como funciona o acesso ao Portal EAD do CETADP"
      className="w-full max-h-[320px] md:max-h-[380px] rounded-2xl shadow-xl object-contain"
      onError={() => setErro(true)}
    />
  );
}
