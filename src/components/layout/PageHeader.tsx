import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  /** Ícone opcional, exibido em um quadro preto com borda laranja à esquerda do título. */
  icon?: LucideIcon;
  /** Título da página (fica em 22px, preto, negrito). */
  title: string;
  /** Descrição curta, exibida ao lado do título na mesma linha (14px, preta). */
  description?: string;
  /** Se informado, mostra o link "Voltar" na extremidade direita do cabeçalho. */
  backHref?: string;
  /** Texto do link de volta (ex.: "Voltar para Matrículas"). Só é usado se `backHref` for informado. */
  backLabel?: string;
  /** Botões/ações extras exibidos ao lado do link "Voltar", na extremidade direita. */
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão das páginas internas (admin/portal/dashboard).
 * Fixo no topo ao rolar ("sticky"), com linha laranja de 1,5pt embaixo.
 * Título + descrição à esquerda (inline, com ícone opcional); link "Voltar",
 * quando houver, fica na extremidade direita da mesma linha, com borda
 * preta de 1,5pt.
 */
export default function PageHeader({ icon: Icon, title, description, backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-iw-bg pb-4 mb-2 border-b-[1.5px] border-[#E88D0C] flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-black border-2 border-[#E88D0C]">
            <Icon className="w-5 h-5 text-[#E88D0C]" />
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-[22px] font-black text-black tracking-tight">{title}</h1>
          {description && <p className="text-black text-sm">{description}</p>}
        </div>
      </div>
      {(backHref || actions) && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-[#E88D0C] hover:opacity-80 font-semibold transition-opacity shrink-0 border-[1.5px] border-black rounded-lg px-2.5 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
