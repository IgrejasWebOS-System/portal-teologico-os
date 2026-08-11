"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import type {
  AlunoResumo,
  MatriculaResumo,
  ParcelaResumo,
  AvaliacaoResumo,
} from "@/components/aluno/AreaDoAlunoPainel";

// ============================================================
// SidebarShell — envelope client-side que dá ao Sidebar o
// comportamento "off-canvas": recolhido pra fora da borda
// esquerda por padrão em toda página, só aparece ao clicar no
// botão flutuante (ou no overlay pra fechar). Conteúdo principal
// sempre ocupa a largura cheia, sem margem reservada pro menu.
// ============================================================

export default function SidebarShell({
  isStaff = false,
  isAlunoOficial = false,
  alunoPainel = null,
  children,
}: {
  isStaff?: boolean;
  isAlunoOficial?: boolean;
  alunoPainel?: {
    aluno: AlunoResumo;
    matriculas: MatriculaResumo[];
    parcelas: ParcelaResumo[];
    avaliacoes: AvaliacaoResumo[];
  } | null;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o menu automaticamente ao navegar — evita ter que clicar
  // no overlay depois de escolher uma opção no menu.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-iw-bg">
      {/* Overlay escurecido — clicar fora fecha o menu */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botão flutuante — sempre visível, alterna abrir/fechar */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        className="fixed top-4 left-4 z-[60] w-10 h-10 rounded-full bg-iw-navy border-2 border-[#E88D0C] flex items-center justify-center shadow-lg hover:opacity-85 transition-opacity"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-[#E88D0C]" />
        ) : (
          <Menu className="w-5 h-5 text-[#E88D0C]" />
        )}
      </button>

      <Sidebar
        isStaff={isStaff}
        isAlunoOficial={isAlunoOficial}
        alunoPainel={alunoPainel}
        isOpen={isOpen}
      />

      <main className="flex-1 p-8 pl-20 min-h-screen">{children}</main>
    </div>
  );
}
