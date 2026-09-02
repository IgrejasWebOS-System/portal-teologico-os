"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
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
  Award,
  UserCheck,
  Wallet,
  Boxes,
  LayoutDashboard,
  Store,
  HelpCircle,
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
    description: "Preparatórios e capacitação",
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

// Pra staff, os módulos viram atalhos de GESTÃO (cadastrar/editar
// conteúdo, cadastrar aluno), não de navegação/consumo do conteúdo —
// quem já é aluno oficial continua vendo os módulos normais (ver
// AreaDoAlunoPainel), e quem não é staff nem aluno oficial (membro
// comum) continua indo pras páginas públicas de cada módulo.
const STAFF_MODULE_OVERRIDES: Record<string, { href: string; description: string }> = {
  "Escola de Teologia": {
    href: "/admin/conteudo?modulo=escola",
    description: "Gerenciar cursos e aulas de teologia",
  },
  "Cursos": {
    href: "/admin/conteudo?modulo=cursos",
    description: "Gerenciar avulsos, preparatórios e capacitação",
  },
  "EBD": {
    href: "/admin/ebd",
    description: "Gerenciar trimestres e lições",
  },
  "Matrícula": {
    href: "/admin/matriculas/nova",
    description: "Matrícula direta (atendimento presencial)",
  },
};

function resolverModulos(isStaff: boolean): SidebarModule[] {
  if (!isStaff) return modules;
  return modules.map((mod) => {
    const override = STAFF_MODULE_OVERRIDES[mod.label];
    return override ? { ...mod, ...override } : mod;
  });
}

const adminModules: SidebarModule[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Visão geral do CETADP",
  },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings2,
    description: "Tabelas, igrejas e acessos",
  },
  {
    label: "Admin",
    href: "/admin/conteudo",
    icon: ShieldCheck,
    description: "Conteúdo e trilhas",
    subItems: [
      { label: "Conteúdo",   href: "/admin/conteudo", icon: Library },
      { label: "Trilhas",    href: "/admin/conteudo/trilhas", icon: ListTree },
      { label: "Inscrições", href: "/admin/inscricoes", icon: UserPlus },
      { label: "Matrículas", href: "/admin/matriculas", icon: UserCheck },
      { label: "Certificados", href: "/admin/certificados", icon: Award },
      { label: "Financeiro", href: "/admin/financeiro", icon: Wallet },
      { label: "Patrimônio", href: "/admin/patrimonio", icon: Boxes },
      { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
    ],
  },
];

export default function Sidebar({
  isStaff = false,
  isAlunoOficial = false,
  alunoPainel = null,
  isOpen = true,
}: {
  isStaff?: boolean;
  isAlunoOficial?: boolean;
  alunoPainel?: {
    aluno: AlunoResumo;
    matriculas: MatriculaResumo[];
    parcelas: ParcelaResumo[];
    avaliacoes: AvaliacaoResumo[];
  } | null;
  // Controla o efeito "off-canvas" só no mobile: recolhido pra fora da
  // borda esquerda por padrão, só aparece quando acionado (SidebarShell).
  // No desktop (md+) o menu fica sempre fixo e visível — "md:translate-x-0"
  // sobrepõe esse estado independente de isOpen.
  isOpen?: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-iw-navy flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
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
          // Com subItems, "ativo" (e portanto expandido) segue os próprios
          // subItems — não o href do item pai — pra "Dashboard" (item
          // irmão, fora deste grupo) nunca acabar expandindo "Admin" só
          // por ambos começarem com "/admin".
          const isModuleActive = mod.subItems
            ? mod.subItems.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"))
            : pathname === mod.href || pathname.startsWith(mod.href + "/");

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
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#E88D0C]" />
                </div>
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
                        <div className="w-5 h-5 rounded-md bg-black border border-[#E88D0C] flex items-center justify-center shrink-0">
                          <SubIcon className="w-3 h-3 text-[#E88D0C]" />
                        </div>
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
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#E88D0C]" />
                </div>
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
                        <div className="w-5 h-5 rounded-md bg-black border border-[#E88D0C] flex items-center justify-center shrink-0">
                          <SubIcon className="w-3 h-3 text-[#E88D0C]" />
                        </div>
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

        {/* Admin Loja — atalho fixo pro núcleo administrativo da Loja,
            sempre visível pra staff no fim do menu, acima do rodapé. */}
        {isStaff && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/admin/loja"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                pathname === "/admin/loja" || pathname.startsWith("/admin/loja/")
                  ? "bg-iw-blue text-white shadow-md"
                  : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="leading-tight truncate">Admin Loja</p>
                <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">
                  Vendas, produtos, estoque e leads
                </p>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10" />

      {/* Logout */}
      <div className="px-3 py-3 space-y-1">
        {/* Sair deste dispositivo */}
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-iw-sky/70 hover:bg-white/8 hover:text-white transition-all duration-150 group"
          >
            <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-[#E88D0C]" />
            </div>
            <span>Sair da conta</span>
          </button>
        </form>

        {/* Sair de todos os dispositivos */}
        <form action={signOutGlobalAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-iw-sky/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
          >
            <div className="w-6 h-6 rounded-md bg-black border border-[#E88D0C] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-[#E88D0C]" />
            </div>
            <span>Sair de todos os dispositivos</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
