import Link from "next/link";
import {
  Church,
  Map,
  Briefcase,
  User,
  GraduationCap,
  Heart,
  Users,
  MapPin,
  LayoutGrid,
  ShieldCheck,
  ChevronRight,
  Settings2,
} from "lucide-react";

const CONFIG_CARDS = [
  {
    href: "/dashboard/configuracoes/igrejas",
    icon: Church,
    title: "Igrejas",
    description: "Congregações e sub-congregações",
    cta: "Gerenciar",
    accent: "text-iw-blue bg-iw-blue/10",
  },
  {
    href: "/dashboard/configuracoes/setores",
    icon: Map,
    title: "Setores",
    description: "Organização geográfica e pastoral",
    cta: "Gerenciar",
    accent: "text-iw-navy bg-iw-sky/20",
  },
  {
    href: "/dashboard/configuracoes/cargos",
    icon: Briefcase,
    title: "Cargos",
    description: "Funções eclesiásticas e administrativas",
    cta: "Cadastrar",
    accent: "text-iw-gold bg-iw-gold/10",
  },
  {
    href: "/dashboard/configuracoes/profissoes",
    icon: User,
    title: "Profissões",
    description: "Cadastro de ocupações profissionais",
    cta: "Cadastrar",
    accent: "text-iw-blue bg-iw-blue/10",
  },
  {
    href: "/dashboard/configuracoes/escolaridades",
    icon: GraduationCap,
    title: "Escolaridades",
    description: "Níveis de formação acadêmica",
    cta: "Cadastrar",
    accent: "text-iw-success bg-iw-success/10",
  },
  {
    href: "/dashboard/configuracoes/estado-civil",
    icon: Heart,
    title: "Estado Civil",
    description: "Situação conjugal dos membros",
    cta: "Cadastrar",
    accent: "text-pink-600 bg-pink-50",
  },
  {
    href: "/dashboard/configuracoes/genero",
    icon: Users,
    title: "Gênero",
    description: "Classificação oficial do sistema",
    cta: "Cadastrar",
    accent: "text-iw-sky bg-iw-sky/20",
  },
  {
    href: "/dashboard/configuracoes/regioes-df",
    icon: MapPin,
    title: "Regiões DF",
    description: "Mapeamento de regiões e cidades",
    cta: "Cadastrar",
    accent: "text-iw-warning bg-iw-warning-bg",
  },
  {
    href: "/dashboard/configuracoes/departamentos",
    icon: LayoutGrid,
    title: "Departamentos",
    description: "CIBEPI, EBD, Jovens, Mocidade…",
    cta: "Cadastrar",
    accent: "text-purple-600 bg-purple-50",
  },
  {
    href: "/dashboard/configuracoes/acessos",
    icon: ShieldCheck,
    title: "Administração Acessos",
    description: "Gestão de campos, sedes e permissões",
    cta: "Acessar Painel",
    accent: "text-iw-error bg-iw-error-bg",
    wide: true,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-iw-navy flex items-center justify-center shrink-0">
          <Settings2 className="w-6 h-6 text-iw-sky" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-iw-muted text-sm mt-0.5">
            Gerencie as tabelas auxiliares e dados mestres da plataforma.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONFIG_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group bg-iw-surface border border-iw-border rounded-2xl p-5 flex flex-col gap-4 hover:border-iw-blue/40 hover:shadow-md transition-all duration-150${card.wide ? " sm:col-span-2 lg:col-span-2" : ""}`}
            >
              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-iw-navy text-sm uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-xs text-iw-muted mt-0.5 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-iw-border">
                <span className="text-xs font-bold text-iw-navy uppercase tracking-wider">
                  {card.cta}
                </span>
                <ChevronRight className="w-4 h-4 text-iw-muted group-hover:text-iw-blue group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
