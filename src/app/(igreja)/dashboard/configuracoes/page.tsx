import Link from "next/link";
import {
  Landmark,
  Users,
  Contact,
  SlidersHorizontal,
  ShieldCheck,
  ChevronRight,
  Settings2,
} from "lucide-react";

// ============================================================
// Configurações do Sistema — grade reorganizada em grupos
// (Ministério-Setores-Igrejas / Membrasia / Persona / Complementos)
// pra descongestionar a tela. Cada grupo é um hub próprio que lista
// os cards individuais (mesmo padrão já usado em "Administração
// Acessos"). Regiões DF e Administração Acessos seguem soltos.
// ============================================================

const CONFIG_CARDS = [
  {
    href: "/dashboard/configuracoes/ministerio-setores-igrejas",
    icon: Landmark,
    title: "Ministério · Setores · Igrejas",
    description: "Campos, setores, igrejas, sub-congregações, células e região",
    cta: "Gerenciar",
    accent: "text-iw-navy bg-iw-sky/20",
  },
  {
    href: "/dashboard/configuracoes/membrasia",
    icon: Users,
    title: "Membrasia",
    description: "Membros, cargos e departamentos",
    cta: "Gerenciar",
    accent: "text-iw-blue bg-iw-blue/10",
  },
  {
    href: "/dashboard/configuracoes/persona",
    icon: Contact,
    title: "Persona",
    description: "Professor, aluno e turmas",
    cta: "Gerenciar",
    accent: "text-iw-gold bg-iw-gold/10",
  },
  {
    href: "/dashboard/configuracoes/complementos",
    icon: SlidersHorizontal,
    title: "Complementos",
    description: "Estado civil, sexo, profissões e escolaridade",
    cta: "Gerenciar",
    accent: "text-purple-600 bg-purple-50",
  },
  {
    href: "/dashboard/configuracoes/acessos",
    icon: ShieldCheck,
    title: "Administração Acessos",
    description: "Gestão de sedes, líderes de setor e permissões",
    cta: "Acessar Painel",
    accent: "text-iw-error bg-iw-error-bg",
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
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-iw-muted text-sm">
            Gerencie as tabelas auxiliares e dados mestres da plataforma.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONFIG_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-iw-surface border border-iw-border rounded-2xl p-5 flex flex-col gap-3 hover:border-iw-blue/40 hover:shadow-md transition-all duration-150 min-h-[140px]"
            >
              {/* Icon + Title inline — ícone à esquerda, título centralizado verticalmente */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-iw-navy text-sm uppercase tracking-wide leading-snug">
                  {card.title}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs text-black leading-relaxed flex-1 text-center">
                {card.description}
              </p>

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
