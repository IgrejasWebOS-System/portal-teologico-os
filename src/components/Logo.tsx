"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/utils/cn";

// ============================================================
// Logo — marca oficial do CETADP (fonte única em todo o portal)
//
// Usado no header público, rodapé, tela de login e "Quem Somos".
// Para colocar o ícone/logo oficial, basta salvar o arquivo em:
//
//   public/logo.png   (ou public/logo.svg — ajuste o <img> abaixo)
//
// Nenhuma outra tela precisa ser tocada: todas importam <Logo />.
// Enquanto o arquivo não existir (ou falhar ao carregar), o
// componente cai automaticamente para o ícone de capelo
// (GraduationCap) como placeholder, para nunca quebrar o layout.
//
// Formato recomendado do arquivo oficial:
//   - Quadrado, fundo transparente (PNG) ou SVG vetorial
//   - Mínimo 512×512px (o componente reduz a exibição conforme o size)
//   - Se o traço do ícone for escuro, use variant="light" nos
//     lugares com fundo escuro; se for claro/dourado, use "dark".
// ============================================================

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light"; // cor do "selo" ao redor do ícone
  shape?: "square" | "circle";
  className?: string;
}

const BOX_SIZE = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-20 h-20" };
const ICON_SIZE = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-9 h-9" };
const IMG_SIZE = { sm: "w-6 h-6", md: "w-7 h-7", lg: "w-12 h-12" };

export default function Logo({
  size = "md",
  variant = "dark",
  shape = "square",
  className,
}: LogoProps) {
  const [erro, setErro] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0",
        shape === "circle" ? "rounded-full" : "rounded-lg",
        BOX_SIZE[size],
        variant === "dark"
          ? "bg-iw-navy"
          : "bg-white/30 border-2 border-white/60",
        className
      )}
    >
      {!erro ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="CETADP"
          className={cn(IMG_SIZE[size], "object-contain")}
          onError={() => setErro(true)}
        />
      ) : (
        <GraduationCap
          className={cn(ICON_SIZE[size], variant === "dark" ? "text-iw-gold" : "text-iw-navy")}
        />
      )}
    </div>
  );
}
