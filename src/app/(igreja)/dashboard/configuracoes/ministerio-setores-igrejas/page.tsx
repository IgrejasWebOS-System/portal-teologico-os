import Link from "next/link";
import {
  Landmark,
  Building,
  Map,
  Church,
  Building2,
  GitBranch,
  Globe2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const PANELS = [
  {
    href: "/dashboard/configuracoes/acessos/campos",
    icon: Building,
    title: "Campos / Ministérios",
    description: "Crie e gerencie os campos principais do sistema",
    cta: "Gerenciar Campos",
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
    href: "/dashboard/configuracoes/igrejas",
    icon: Church,
    title: "Igrejas",
    description: "Congregações e sub-congregações",
    cta: "Gerenciar",
    accent: "text-iw-blue bg-iw-blue/10",
  },
  {
    href: "/dashboard/configuracoes/sub-congregacoes",
    icon: Building2,
    title: "Sub-congregações",
    description: "Vinculadas a setor, igreja e responsável",
    cta: "Gerenciar",
    accent: "text-iw-gold bg-iw-gold/10",
  },
  {
    href: "/dashboard/configuracoes/celulas",
    icon: GitBranch,
    title: "Células",
    description: "Vinculadas a setor, igreja e responsável",
    cta: "Gerenciar",
    accent: "text-iw-success bg-iw-success/10",
  },
  {
    href: "/dashboard/configuracoes/regioes",
    icon: Globe2,
    title: "Região",
    description: "Agrupamento de igrejas por região, entre setores",
    cta: "Gerenciar",
    accent: "text-iw-blue bg-iw-blue/10",
  },
];

export default function MinisterioSetoresIgrejasPage() {
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
          <div className="w-10 h-10 rounded-xl bg-iw-sky/20 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-iw-navy" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              Ministério · Setores · Igrejas
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Campos, setores, igrejas, sub-congregações, células e região.
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
