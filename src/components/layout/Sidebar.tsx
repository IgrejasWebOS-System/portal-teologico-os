"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Church,
  GraduationCap,
  BookOpen,
  BookMarked,
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  ChevronRight,
  ShieldCheck,
  Library,
  ListTree,
  ShieldAlert,
  Settings2,
} from "lucide-react";
import { signOutAction, signOutGlobalAction } from "@/app/actions";
import { cn } from "@/utils/cn";

const modules = [
  {
    label: "Igreja",
    href: "/dashboard",
    icon: Church,
    description: "Gestão de membros e igrejas",
    subItems: [
      { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
      { label: "Membros", href: "/dashboard/membros", icon: Users },
      { label: "Igrejas", href: "/dashboard/igrejas", icon: Building2 },
      { label: "Ocorrências", href: "/dashboard/ocorrencias", icon: CalendarClock },
    ],
  },
  {
    label: "Escola Teológica",
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
];

const adminModules = [
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
      { label: "Conteúdo", href: "/admin/conteudo", icon: Library },
      { label: "Trilhas",  href: "/admin/conteudo/trilhas", icon: ListTree },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-iw-navy flex flex-col shadow-xl">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-iw-blue/30 border border-iw-sky/40 shrink-0">
          <Church className="w-5 h-5 text-iw-sky" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            Portal Teológico
          </p>
          <p className="text-iw-sky/60 text-xs truncate">IgrejasWebOS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2">
          Módulos
        </p>

        {modules.map((mod) => {
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
                      ? "text-white"
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

              {/* Sub-items — só aparecem quando o módulo está ativo */}
              {isModuleActive && mod.subItems && (
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
      </nav>

      {/* Admin section */}
      <div className="px-3 pt-2 pb-1">
        <div className="mx-0 border-t border-white/10 mb-3" />
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
                <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isModuleActive ? "text-white" : "text-iw-sky/60 group-hover:text-iw-sky")} />
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
