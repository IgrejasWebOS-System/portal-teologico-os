import Link from "next/link";
import {
  Users,
  UserRound,
  Briefcase,
  LayoutGrid,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const PANELS = [
  {
    href: "/dashboard/membros",
    icon: UserRound,
    title: "Membros",
    description: "Rol de membros ativos da igreja",
    cta: "Gerenciar",
    accent: "text-iw-blue bg-iw-blue/10",
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
    href: "/dashboard/configuracoes/departamentos",
    icon: LayoutGrid,
    title: "Departamentos",
    description: "CIBEPI, EBD, Jovens, Mocidade…",
    cta: "Cadastrar",
    accent: "text-purple-600 bg-purple-50",
  },
];

export default function MembrasiaPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Configurações
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-blue/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-iw-blue" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              Membrasia
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Membros, cargos e departamentos.
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANELS.map((panel) => {
          const Icon = panel.icon;
          return (
            <Link
              key={panel.href}
              href={panel.href}
              className="group bg-iw-surface border border-iw-border rounded-2xl p-5 flex flex-col gap-4 hover:border-iw-blue/40 hover:shadow-md transition-all duration-150"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${panel.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-iw-navy text-sm uppercase tracking-wide">
                  {panel.title}
                </p>
                <p className="text-xs text-black mt-0.5 leading-relaxed">
                  {panel.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-iw-border">
                <span className="text-xs font-bold text-iw-navy uppercase tracking-wider">
                  {panel.cta}
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
