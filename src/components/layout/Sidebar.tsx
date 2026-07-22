"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  BookOpen,
  BookMarked,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Library,
  ListTree,
  ShieldAlert,
  Settings2,
  UserPlus,
  Package,
  Award,
  UserCheck,
  Wallet,
  Boxes,
  LayoutDashboard,
} from "lucide-react";
import { signOutAction, signOutGlobalAction } from "@/app/actions";
import { cn } from "@/utils/cn";
import Logo from "@/components/Logo";
import AreaDoAlunoPainel, {
  type AlunoResumo,
  type MatriculaResumo,
  type ParcelaResumo,
  type AvaliacaoResumo,
} from "@/components/aluno/AreaDoAlunoPainel";

interface SidebarModule {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  subItems?: { label: string; href: string; icon: LucideIcon }[];
}

const modules: SidebarModule[] = [
  {
    label: "Escola de Teologia",
    href: "/escola",
    icon: GraduationCap,
    description: "Seminário e formação teológica",
  },
  {
    label: "Cursos",
    href: "/cursos",
    icon: BookOpen,
    description: "Treinamentos e capacitação",
  },
  {
    label: "EBD",
    href: "/ebd",
    icon: BookMarked,
    description: "Escola Bíblica Dominical",
  },
  {
    label: "Matrícula",
    href: "/portal/nova-matricula",
    icon: UserPlus,
    description: "Inscreva-se em um novo curso",
  },
];

// Item "Matrícula" muda de destino conforme quem está logado: staff
// (atendimento presencial na secretaria) vai para a ficha completa da
// Matrícula Direta; aluno/membro comum vai para o autosserviço, que só
// mostra os cursos disponíveis pra ele escolher.
function resolverModulos(isStaff: boolean): SidebarModule[] {
  return modules.map((mod) =>
    mod.label === "Matrícula"
      ? {
          ...mod,
          href: isStaff ? "/admin/matriculas/nova" : "/portal/nova-matricula",
          description: isStaff ? "Matrícula direta (atendimento presencial)" : "Inscreva-se em um novo curso",
        }
      : mod
  );
}

const adminModules: SidebarModule[] = [
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings2,
    description: "Tabelas, igrejas e acessos",
  },
  {
    label: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    description: "Conteúdo e trilhas",
    subItems: [
      { label: "Dashboard",  href: "/admin", icon: LayoutDashboard },
      { label: "Conteúdo",   href: "/admin/conteudo", icon: Library },
      { label: "Trilhas",    href: "/admin/conteudo/trilhas", icon: ListTree },
      { label: "Inscrições", href: "/admin/inscricoes", icon: UserPlus },
      { label: "Matrículas", href: "/admin/matriculas", icon: UserCheck },
      { label: "Pedidos (Loja)", href: "/admin/pedidos", icon: Package },
      { label: "Produtos (Loja)", href: "/admin/produtos", icon: Boxes },
      { label: "Leads (Loja)", href: "/admin/leads-loja", icon: UserPlus },
      { label: "Certificados", href: "/admin/certificados", icon: Award },
      { label: "Financeiro", href: "/admin/financeiro", icon: Wallet },
      { label: "Patrimônio", href: "/admin/patrimonio", icon: Boxes },
    ],
  },
];

export default function Sidebar({
  isStaff = false,
  isAlunoOficial = false,
  alunoPainel = null,
}: {
  isStaff?: boolean;
  isAlunoOficial?: boolean;
  alunoPainel?: {
    aluno: AlunoResumo;
    matriculas: MatriculaResumo[];
    parcelas: ParcelaResumo[];
    avaliacoes: AvaliacaoResumo[];
  } | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-iw-navy flex flex-col shadow-xl">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <Logo size="sm" variant="dark" />
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            Portal Teológico
          </p>
          <p className="text-iw-sky/60 text-xs truncate">CETADP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Admin section - so para staff, sempre primeiro nesta lista */}
        {isStaff && (
        <div className="pb-3 mb-3 border-b border-white/10">
        <p className="text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2">
          Administração
        </p>
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <div key={mod.href}>
              <Link
                href={mod.subItems ? mod.subItems[0].href : mod.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  isModuleActive
                    ? "bg-iw-blue text-white shadow-md"
                    : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isModuleActive ? "text-gray-800" : "text-iw-sky/60 group-hover:text-iw-sky")} />
                <div className="flex-1 min-w-0">
                  <p className="leading-tight truncate">{mod.label}</p>
                  {!isModuleActive && (
                    <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">{mod.description}</p>
                  )}
                </div>
                {isModuleActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
              </Link>

              {isModuleActive && mod.subItems && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-iw-sky/20 space-y-0.5">
                  {mod.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                    return (
                      <Link key={sub.href} href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group",
                          isSubActive ? "bg-white/15 text-white" : "text-iw-sky/60 hover:bg-white/8 hover:text-iw-sky"
                        )}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{sub.label}</span>
                        {isSubActive && <ChevronRight className="w-3 h-3 ml-auto text-iw-gold" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
        )}

        {isAlunoOficial && alunoPainel && (
          <AreaDoAlunoPainel
            aluno={alunoPainel.aluno}
            matriculas={alunoPainel.matriculas}
            parcelas={alunoPainel.parcelas}
            avaliacoes={alunoPainel.avaliacoes}
          />
        )}

        {!isAlunoOficial && (
        <>
        <p className="text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2">
          Módulos
        </p>

        {resolverModulos(isStaff).map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <div key={mod.href}>
              {/* Module item */}
              <Link
                href={mod.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  isModuleActive
                    ? "bg-iw-blue text-white shadow-md"
                    : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isModuleActive
                      ? "text-gray-800"
                      : "text-iw-sky/60 group-hover:text-iw-sky"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="leading-tight truncate">{mod.label}</p>
                  {!isModuleActive && (
                    <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60 transition-colors">
                      {mod.description}
                    </p>
                  )}
                </div>
                {isModuleActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />
                )}
              </Link>

              {/* Sub-items — sempre visíveis para o módulo Igreja */}
              {mod.subItems && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-iw-sky/20 space-y-0.5">
                  {mod.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive =
                      sub.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === sub.href ||
                          pathname.startsWith(sub.href + "/");

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group",
                          isSubActive
                            ? "bg-white/15 text-white"
                            : "text-iw-sky/60 hover:bg-white/8 hover:text-iw-sky"
                        )}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{sub.label}</span>
                        {isSubActive && (
                          <ChevronRight className="w-3 h-3 ml-auto text-iw-gold" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </>
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10" />

      {/* Logout */}
      <div className="px-3 py-3 space-y-1">
        {/* Sair deste dispositivo */}
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-iw-sky/70 hover:bg-white/8 hover:text-white transition-all duration-150 group"
          >
            <LogOut className="w-5 h-5 shrink-0 text-iw-sky/50 group-hover:text-iw-error transition-colors" />
            <span>Sair da conta</span>
          </button>
        </form>

        {/* Sair de todos os dispositivos */}
        <form action={signOutGlobalAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-iw-sky/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-iw-sky/30 group-hover:text-red-400 transition-colors" />
            <span>Sair de todos os dispositivos</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
