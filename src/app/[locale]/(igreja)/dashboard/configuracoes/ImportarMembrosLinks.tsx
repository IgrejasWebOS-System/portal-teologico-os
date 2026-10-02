import Link from "next/link";
import { FileSpreadsheet, ImagePlus } from "lucide-react";

/**
 * Atalhos "Importar CSV" / "Importar Fotos" (de membros), exibidos no
 * cabeçalho de Igrejas/Pontos de Pregação/Células/Sub-congregações, antes
 * do botão "VOLTAR" (pedido do Joaquim em 2026-09-18). Mesmo destino e
 * estilo dos botões que já existem em Gestão de Membros.
 */
export default function ImportarMembrosLinks() {
  return (
    <>
      <Link
        href="/dashboard/membros/importar-csv"
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-iw-gold/10 text-iw-gold border border-iw-gold/30 hover:bg-iw-gold/20 transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Importar CSV
      </Link>
      <Link
        href="/dashboard/membros/importar-fotos"
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-iw-gold/10 text-iw-gold border border-iw-gold/30 hover:bg-iw-gold/20 transition-colors"
      >
        <ImagePlus className="w-3.5 h-3.5" />
        Importar Fotos
      </Link>
    </>
  );
}
