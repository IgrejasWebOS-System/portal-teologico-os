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
// SidebarShell — responsivo: no desktop (md+) o menu fica sempre
// fixo e visível, sem toggle nenhum (o Sidebar já força isso via
// "md:translate-x-0", ignorando o isOpen daqui pra cima de 768px).
// No mobile continua off-canvas: recolhido por padrão, aparece só
// com o botão flutuante, e fecha sozinho ao navegar. O botão e o
// overlay só existem visualmente no mobile ("md:hidden").
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

  // Fecha o menu do mobile ao navegar. No desktop isso não tem efeito
  // visual — o menu fica sempre visível via CSS, independente de isOpen.
  // Padrão "ajustar estado quando uma prop muda" (aqui, a rota) — intencional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-iw-bg">
      {/* Overlay escurecido — só no mobile, clicar fora fecha o menu */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botão flutuante — só no mobile, no desktop o menu já está fixo */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        className="md:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-full bg-iw-navy border-2 border-[#E88D0C] flex items-center justify-center shadow-lg hover:opacity-85 transition-opacity"
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

      <main className="flex-1 p-8 pl-20 md:pl-8 md:ml-64 min-h-screen">{children}</main>
    </div>
  );
}
