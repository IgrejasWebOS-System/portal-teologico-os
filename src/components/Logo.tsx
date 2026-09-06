"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/utils/cn";

// ============================================================
// Logo — marca oficial do CETADP (fonte única em todo o portal)
//
// Usado no header público, rodapé, sidebar, portal do aluno e telas de
// autenticação.
//
// Antes deste componente ter o arquivo oficial, existia um "selo"
// (círculo/quadrado com fundo dourado sólido) por trás do ícone, pra dar
// contraste a um placeholder transparente. Com o logo oficial (que já é
// uma peça de arte completa — medalhão, leão, coroa, louros, cores
// próprias), esse selo virou um fundo redundante por cima da marca
// (ficava "círculo dentro de círculo"). Removido: o componente agora só
// desenha a imagem oficial, sem nenhuma caixa/fundo ao redor.
//
// O que resta escolher corretamente, local por local, é o ARQUIVO certo
// pro fundo onde a marca é aplicada (manual, capítulo 09 — "Fundos e
// contraste"): variant="dark" = usar sobre fundo CLARO (assinatura
// colorida); variant="light" = usar sobre fundo ESCURO (assinatura
// oficial pra fundo escuro, dourado + branco). O nome do variant
// descreve o "estilo antigo do selo" por compatibilidade, mas o que
// importa agora é sempre olhar a cor de fundo real do local antes de
// escolher.
//
// Arquivos: public/branding/logos/logo-colorida.svg (fundo claro) e
// logo-fundo-escuro.svg (fundo escuro) — vêm do kit oficial (Fase 3 do
// BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md). Enquanto não existirem (ou
// falharem ao carregar), cai automaticamente pro ícone de capelo
// (GraduationCap) como placeholder, pra nunca quebrar o layout.
// ============================================================

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light"; // dark = fundo claro (colorida) | light = fundo escuro
  className?: string;
}

const IMG_SIZE = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-20 h-20" };
const ICON_SIZE = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-16 h-16" };

const LOGO_SRC: Record<NonNullable<LogoProps["variant"]>, string> = {
  dark: "/branding/logos/logo-colorida.svg",
  light: "/branding/logos/logo-fundo-escuro.svg",
};

export default function Logo({ size = "md", variant = "dark", className }: LogoProps) {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <GraduationCap
        className={cn(ICON_SIZE[size], variant === "dark" ? "text-iw-navy" : "text-white", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC[variant]}
      alt="CETADP"
      className={cn(IMG_SIZE[size], "object-contain shrink-0", className)}
      onError={() => setErro(true)}
    />
  );
}
