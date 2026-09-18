import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import PageHeader from "@/components/layout/PageHeader";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  // M24: fundo/ícone agora são fixos (dourado/preto) em todas as telas —
  // iconColor/iconBg deixaram de ser usados, mas ficam no tipo pra não
  // quebrar quem ainda passa esses props.
  iconColor?: string;
  iconBg?: string;
  // Override do destino/rótulo do "Voltar" -- usado pelas 5 telas que
  // pertencem ao hub "Ministério · Setores · Igrejas" (Setores/Regionais,
  // Igrejas, Pontos de Pregação, Células, Região), que devem voltar pra
  // esse hub em vez de "/dashboard/configuracoes" (pedido do Joaquim em
  // 2026-09-18). O padrão de todas as outras ~14 telas continua igual.
  backHref?: string;
  backLabel?: string;
  /** Botões extras antes do link "Voltar" (ex.: Importar CSV/Fotos em
   * Igrejas/Pontos de Pregação/Células/Sub-congregações). */
  actions?: ReactNode;
}

/**
 * Wrapper fino: mantém a assinatura antiga (icon/title/description) usada
 * pelas ~14 páginas de Configurações, mas renderiza com o componente
 * compartilhado novo (cabeçalho sticky, borda laranja, link "Voltar"
 * padronizado). Nenhuma dessas páginas precisa mudar.
 */
export default function ConfiguracoesPageHeader({
  icon,
  title,
  description,
  backHref = "/dashboard/configuracoes",
  backLabel = "Voltar para Configurações",
  actions,
}: Props) {
  return (
    <PageHeader
      icon={icon}
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
      actions={actions}
    />
  );
}
