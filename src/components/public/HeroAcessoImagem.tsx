"use client";

import { useState } from "react";

// ============================================================
// Brasão institucional no hero da home pública.
//
// Antes apontava pra public/como-funciona.png (pensado originalmente pra
// uma captura de tela "como funciona o acesso") — mas o que estava
// mostrado ali era o logo oficial, com sombra (drop-shadow-xl) e cartão
// arredondado por cima. Isso viola o manual de identidade (capítulo 10,
// "Usos incorretos" — "Não aplicar efeitos: evite sombra, contorno,
// brilho e 3D"). Corrigido: aponta direto pro arquivo oficial do kit de
// marca, sem nenhum efeito por cima, só o tamanho ajustado ao espaço do
// hero.
//
// Fonte: public/branding/logos/logo-colorida.svg (Fase 3 do
// BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md). Enquanto o arquivo não existir
// (ou falhar ao carregar), mostra um aviso discreto em vez de quebrar o
// layout.
// ============================================================

export default function HeroAcessoImagem() {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <div className="bg-iw-navy rounded-2xl p-8 text-white/40 text-xs text-center">
        Copie os arquivos do kit de marca pra public/branding (ver
        BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md, Fase 3).
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/branding/logos/logo-colorida.svg"
      alt="Brasão CETADP — Centro Educacional Teológico das Assembleias de Deus Piracicaba"
      className="w-full max-h-[280px] md:max-h-[320px] object-contain"
      onError={() => setErro(true)}
    />
  );
}
