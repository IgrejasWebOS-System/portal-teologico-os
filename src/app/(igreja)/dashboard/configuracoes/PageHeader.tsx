import type { LucideIcon } from "lucide-react";
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
}

/**
 * Wrapper fino: mantém a assinatura antiga (icon/title/description) usada
 * pelas ~14 páginas de Configurações, mas renderiza com o componente
 * compartilhado novo (cabeçalho sticky, borda laranja, link "Voltar"
 * padronizado). Nenhuma dessas páginas precisa mudar.
 */
export default function ConfiguracoesPageHeader({ icon, title, description }: Props) {
  return (
    <PageHeader
      icon={icon}
      title={title}
      description={description}
      backHref="/dashboard/configuracoes"
      backLabel="Voltar para Configurações"
    />
  );
}
