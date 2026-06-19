import Link from "next/link";
import {
  ShieldCheck,
  Building,
  Map,
  Users2,
  KeySquare,
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
    href: "/dashboard/configuracoes/acessos/sedes",
    icon: Map,
    title: "Sedes Regionais",
    description: "Eleve igrejas ao status de Sede de Campo",
    cta: "Gerenciar Sedes",
    accent: "text-iw-navy bg-iw-sky/20",
  },
  {
    href: "/dashboard/configuracoes/acessos/lideres-setor",
    icon: Users2,
    title: "Líderes de Setor",
    description: "Defina a Igreja-Mãe responsável por cada setor",
    cta: "Definir Liderança",
    accent: "text-iw-success bg-iw-success/10",
  },
  {
    href: "/dashboard/configuracoes/acessos/usuarios",
    icon: KeySquare,
    title: "Matriz de Usuários",
    description: "Gere senhas e distribua acessos por nível (RBAC)",
    cta: "Gerar Acessos",
    accent: "text-iw-gold bg-iw-gold/10",
  },
];

export default function AcessosPage() {
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
          <div className="w-10 h-10 rounded-xl bg-iw-error-bg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-iw-error" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">
              Administração Global e Acessos
            </h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Gestão de Campos, Sedes Regionais, Líderes de Setor e Permissões (RBAC).
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-iw-error-bg border border-iw-error/20 rounded-xl px-4 py-3 text-sm text-iw-error font-medium">
        ⚠ Área restrita. Apenas administradores Master e Super Master têm acesso completo.
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-xs text-iw-muted mt-0.5 leading-relaxed">
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
