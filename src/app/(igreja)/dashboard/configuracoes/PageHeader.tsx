import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

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

export default function PageHeader({
  icon: Icon,
  title,
  description,
}: Props) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <Link
          href="/dashboard/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Configurações
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-black border-2 border-[#E88D0C]">
            <Icon className="w-5 h-5 text-[#E88D0C]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              {title}
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
