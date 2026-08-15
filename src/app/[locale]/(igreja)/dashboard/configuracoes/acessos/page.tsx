import Link from "next/link";
import {
  ShieldCheck,
  Map,
  Users2,
  KeySquare,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

const PANELS = [
  {
    href: "/dashboard/configuracoes/acessos/sedes",
    icon: Map,
    title: "Sedes Regionais",
    description: "Eleve igrejas ao status de Sede de Campo",
    cta: "Gerenciar Sedes",
    accent: "text-[#E88D0C] bg-black border-2 border-[#E88D0C]",
  },
  {
    href: "/dashboard/configuracoes/acessos/lideres-setor",
    icon: Users2,
    title: "Líderes de Setor",
    description: "Defina a Igreja-Mãe responsável por cada setor",
    cta: "Definir Liderança",
    accent: "text-[#E88D0C] bg-black border-2 border-[#E88D0C]",
  },
  {
    href: "/dashboard/configuracoes/acessos/usuarios",
    icon: KeySquare,
    title: "Matriz de Usuários",
    description: "Gere senhas e distribua acessos por nível (RBAC)",
    cta: "Gerar Acessos",
    accent: "text-[#E88D0C] bg-black border-2 border-[#E88D0C]",
  },
];

export default function AcessosPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={ShieldCheck}
        title="Administração Global e Acessos"
        description="Gestão de Sedes Regionais, Líderes de Setor e Permissões (RBAC)."
        backHref="/dashboard/configuracoes"
        backLabel="Voltar para Configurações"
      />

      {/* Warning */}
      <div className="bg-iw-error-bg border border-iw-error/20 rounded-xl px-4 py-3 text-sm text-iw-error font-medium">
        ⚠ Área restrita. Apenas administradores Master e Super Master têm acesso completo.
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
