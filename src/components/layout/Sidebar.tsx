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
  Users,
  Banknote,
  Activity,
  ClipboardList,
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
  // "Matrícula" some da lista de Módulos pra staff em 13/09/2026 — já
  // existe em Administração > Matrículas (/admin/matriculas), item
  // duplicado sem utilidade extra pra quem já vê o grupo Admin acima.
  // Continua aparecendo normalmente pra quem NÃO é staff (aluno/membro
  // comum), que não tem acesso ao grupo Admin.
  return modules
    .filter((mod) => mod.label !== "Matrícula")
    .map((mod) => {
      const override = STAFF_MODULE_OVERRIDES[mod.label];
      return override ? { ...mod, ...override } : mod;
    });
}

// "Configurações" saiu daqui em 13/09/2026 (decisão do Joaquim) — não é
// mais um item da lista principal de módulos, agora é um atalho fixo
// abaixo de "Admin Loja" (mesmo tratamento visual daquele bloco). Ver
// mais abaixo, após o bloco "Admin Loja".
const CONFIGURACOES_MODULE: SidebarModule = {
  label: "Configurações",
  href: "/dashboard/configuracoes",
  icon: Settings2,
  description: "Tabelas, igrejas e acessos",
};

// Menu curado (28/09/2026, pedido do Joaquim) — só pra admin com
// `admin_roles.menu_restrito = true` (josias, marcelo, pandolfo). Bloqueio
// de verdade acontece no middleware (src/utils/supabase/middleware.ts);
// aqui é só a lista de itens visíveis, apontando direto pras telas já
// existentes (nenhuma rota nova).
const adminRestritoModules: SidebarModule[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, description: "Visão geral do CETADP" },
  { label: "Turmas", href: "/dashboard/configuracoes/persona/turmas", icon: GraduationCap, description: "Turmas e edições" },
  { label: "Matrículas", href: "/admin/matriculas", icon: UserCheck, description: "Matrícula direta e inscrições" },
  { label: "Professores", href: "/dashboard/configuracoes/professores", icon: UserPlus, description: "Cadastro de professores" },
  { label: "Alunos", href: "/dashboard/configuracoes/persona/alunos", icon: Users, description: "Cadastro de alunos" },
  { label: "Financeiro", href: "/admin/financeiro", icon: Wallet, description: "Contas a receber e a pagar" },
  { label: "Caixa", href: "/admin/financeiro/caixa", icon: Banknote, description: "Caixa diário da secretaria" },
  { label: "Configurações", href: "/dashboard/configuracoes/acessos/usuarios", icon: Settings2, description: "Usuários e acessos" },
];

const adminModules: SidebarModule[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Visão geral do CETADP",
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
      { label: "Saúde do sistema", href: "/admin/saude-sistema", icon: Activity },
      { label: "Auditoria", href: "/admin/auditoria", icon: ClipboardList },
    ],
  },
];

// Menu da Área do Professor (27/09/2026, Fase 1 do Painel do Professor) —
// terceiro "modo" da sidebar, mesmo padrão de isStaff/isAlunoOficial:
// itens fixos, sem sub-rotas por enquanto. "Caixa do núcleo" e "Despesas
// do núcleo" ficam de fora de propósito (Fase 2 — dependem de unit_id/
// church_id novo em fin_contas_pagar/fin_caixa_diario, que ainda não
// existe no schema).
const professorModules: SidebarModule[] = [
  { label: "Dashboard", href: "/professor", icon: LayoutDashboard, description: "Visão geral do seu núcleo" },
  // 28/09/2026, pedido do Joaquim: "Turmas" subiu pra logo abaixo de
  // Dashboard (antes vinha depois de Matrícula/Alunos) — agora que o
  // professor cria a própria turma por aqui, faz sentido vir primeiro.
  { label: "Turmas", href: "/professor/turmas", icon: GraduationCap, description: "Suas turmas e links" },
  // 27/09/2026, pedido do Joaquim: leva pra ficha completa de Nova
  // Matrícula (mesma da secretaria, ver professor/matricula/page.tsx). O
  // botão "Nova Matrícula" que ficava dentro de Alunos saiu de lá.
  { label: "Matrícula", href: "/professor/matricula", icon: UserPlus, description: "Nova matrícula completa" },
  { label: "Alunos", href: "/professor/alunos", icon: Users, description: "Seus alunos e matrículas" },
  { label: "Financeiro", href: "/professor/financeiro", icon: Wallet, description: "Parcelas do seu núcleo" },
  { label: "Caixa", href: "/professor/caixa", icon: Banknote, description: "Despesas do seu núcleo" },
  { label: "Testes e Provas", href: "/professor/testes-provas", icon: ClipboardList, description: "Links e resultados das provas" },
  { label: "Configurações", href: "/professor/configuracoes", icon: Settings2, description: "Seus dados" },
];

// Menu da Área da Secretaria (04/10/2026, "Secretário de Setor") —
// quarto "modo" da sidebar, mesmo padrão de isProfessor: itens fixos,
// mas aqui o escopo é vários núcleos (igrejas) dentro da unidade do
// secretário, não um só — cada página tem um seletor de núcleo próprio
// (Todos / uma igreja específica), não faz parte do menu lateral.
//
// Ordem definida pelo Joaquim (04/10/2026): Dashboard, Professores,
// Turmas, Alunos, Matrículas, Financeiro, Caixa, Configurações. Só os
// itens já construídos entram aqui — Turmas/Matrícula/Financeiro/Caixa/
// Configurações ficam pras próximas etapas, nas mesmas posições 3, 5,
// 6, 7 e 8 desta lista quando forem feitos.
const secretariaModules: SidebarModule[] = [
  { label: "Dashboard", href: "/secretaria", icon: LayoutDashboard, description: "Visão geral do seu escopo" },
  { label: "Professores", href: "/secretaria/professores", icon: GraduationCap, description: "Professores dos seus núcleos" },
  { label: "Turmas", href: "/secretaria/turmas", icon: GraduationCap, description: "Turmas dos seus núcleos" },
  { label: "Alunos", href: "/secretaria/alunos", icon: Users, description: "Alunos dos seus núcleos" },
  { label: "Matrícula", href: "/secretaria/matricula", icon: UserPlus, description: "Nova matrícula completa" },
  { label: "Financeiro", href: "/secretaria/financeiro", icon: Wallet, description: "Parcelas dos seus núcleos" },
  { label: "Caixa", href: "/secretaria/caixa", icon: Banknote, description: "Entradas e saídas dos seus núcleos" },
  { label: "Testes e Provas", href: "/secretaria/testes-provas", icon: ClipboardList, description: "Links e resultados das provas" },
  { label: "Configurações", href: "/secretaria/configuracoes", icon: Settings2, description: "Seus dados" },
];

export default function Sidebar({
  isStaff = false,
  isAdminRestrito = false,
  isAlunoOficial = false,
  alunoPainel = null,
  isProfessor = false,
  professorResumo = null,
  isSecretario = false,
  secretarioResumo = null,
  isOpen = true,
  menuColapsado = false,
  onToggleColapso,
}: {
  isStaff?: boolean;
  // 28/09/2026: staff com menu curado (ver migration 118) — mesma
  // permissão de sempre por baixo, só a barra lateral muda.
  isAdminRestrito?: boolean;
  isAlunoOficial?: boolean;
  alunoPainel?: {
    aluno: AlunoResumo;
    matriculas: MatriculaResumo[];
    parcelas: ParcelaResumo[];
    avaliacoes: AvaliacaoResumo[];
  } | null;
  isProfessor?: boolean;
  professorResumo?: { nome: string; fotoUrl?: string | null } | null;
  isSecretario?: boolean;
  secretarioResumo?: { nome: string; roleTitle?: string | null } | null;
  // Controla o efeito "off-canvas" só no mobile: recolhido pra fora da
  // borda esquerda por padrão, só aparece quando acionado (SidebarShell).
  // No desktop (md+) o menu fica sempre fixo e visível — "md:translate-x-0"
  // sobrepõe esse estado independente de isOpen.
  isOpen?: boolean;
  // Recolhe a barra inteira pra uma faixa estreita de só ícones (desktop).
  // Estado mora em SidebarShell — aqui só reflete e repassa o toggle pro
  // botão dentro de AreaDoAlunoPainel (a seta ao lado de "Minha Área").
  menuColapsado?: boolean;
  onToggleColapso?: () => void;
}) {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 bg-iw-navy flex flex-col shadow-xl transition-[width,transform] duration-300 ease-in-out",
        menuColapsado ? "md:w-20" : "md:w-64",
        "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
      {/* Logo / Brand */}
      <div className="border-b border-white/10">
        <div className={cn("flex items-center gap-3 px-6 py-5", menuColapsado && "md:justify-center md:px-0")}>
          <Logo size="sm" variant="light" />
          <div className={cn("min-w-0", menuColapsado && "md:hidden")}>
            <p className="text-white font-bold text-sm leading-tight truncate">
              Portal Teológico
            </p>
            <p className="text-iw-sky/60 text-xs truncate">CETADP</p>
          </div>
        </div>

        {/* 10/10/2026, pedido do Joaquim: foto do aluno centralizada, uma linha
            abaixo do logo e uma linha acima do traço que separa o cabeçalho do
            menu. 50x50, redonda, mesma borda laranja da foto do professor. */}
        {isAlunoOficial && alunoPainel?.aluno.fotoUrl && (
          <div className={cn("flex justify-center pb-5", menuColapsado && "md:hidden")}>
            <div className="w-[53px] h-[53px] rounded-full overflow-hidden border-[1.5px] border-[#E88D0C]/60 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={alunoPainel.aluno.fotoUrl} alt="Sua foto" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Menu curado (28/09/2026) — admin com menu_restrito, no lugar do
            bloco completo de Administração abaixo. */}
        {isStaff && isAdminRestrito && (
        <div className="pb-3 mb-3 border-b border-white/10">
        <p className={cn("text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2", menuColapsado && "md:hidden")}>
          Administração
        </p>
        {adminRestritoModules.map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            mod.href === "/admin" ? pathname === "/admin" : pathname === mod.href || pathname.startsWith(mod.href + "/");
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                menuColapsado && "md:justify-center md:px-0",
                isModuleActive ? "bg-iw-blue text-white shadow-md" : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                <p className="leading-tight truncate">{mod.label}</p>
                {!isModuleActive && (
                  <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">{mod.description}</p>
                )}
              </div>
              {isModuleActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
            </Link>
          );
        })}
        </div>
        )}

        {/* Admin section - so para staff SEM menu_restrito */}
        {isStaff && !isAdminRestrito && (
        <div className="pb-3 mb-3 border-b border-white/10">
        <p className={cn("text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2", menuColapsado && "md:hidden")}>
          Administração
        </p>
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          // Com subItems, "ativo" (e portanto expandido) segue os próprios
          // subItems — não o href do item pai — pra "Dashboard" (item
          // irmão, fora deste grupo) nunca acabar expandindo "Admin" só
          // por ambos começarem com "/admin".
          //
          // Bug corrigido em 13/09/2026: "Dashboard" (href "/admin") usava
          // startsWith("/admin/"), que também é verdadeiro pra QUALQUER
          // subrota (/admin/conteudo, /admin/financeiro, /admin/loja...) —
          // isso deixava Dashboard E Admin marcados como ativos ao mesmo
          // tempo (dois botões azuis "grudados"). Dashboard agora só fica
          // ativo na própria raiz exata "/admin".
          const isModuleActive = mod.subItems
            ? mod.subItems.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"))
            : mod.href === "/admin"
              ? pathname === "/admin"
              : pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <div key={mod.href}>
              <Link
                href={mod.subItems ? mod.subItems[0].href : mod.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  menuColapsado && "md:justify-center md:px-0",
                  isModuleActive
                    ? "bg-iw-blue text-white shadow-md"
                    : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#E88D0C]" />
                </div>
                <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                  <p className="leading-tight truncate">{mod.label}</p>
                  {!isModuleActive && (
                    <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">{mod.description}</p>
                  )}
                </div>
                {isModuleActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
              </Link>

              {isModuleActive && mod.subItems && !menuColapsado && (
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
            expandido={!menuColapsado}
            onToggleExpandido={onToggleColapso}
          />
        )}

        {isProfessor && (
        <>
        <p className={cn("text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2", menuColapsado && "md:hidden")}>
          {professorResumo?.nome ?? "Área do Professor"}
        </p>

        {professorModules.map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            mod.href === "/professor"
              ? pathname === "/professor"
              : pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                menuColapsado && "md:justify-center md:px-0",
                isModuleActive
                  ? "bg-iw-blue text-white shadow-md"
                  : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                <p className="leading-tight truncate">{mod.label}</p>
                {!isModuleActive && (
                  <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60 transition-colors">
                    {mod.description}
                  </p>
                )}
              </div>
              {isModuleActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
            </Link>
          );
        })}
        </>
        )}

        {isSecretario && (
        <>
        <p className={cn("text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2", menuColapsado && "md:hidden")}>
          {secretarioResumo?.roleTitle || secretarioResumo?.nome || "Secretaria"}
        </p>

        {secretariaModules.map((mod) => {
          const Icon = mod.icon;
          const isModuleActive =
            mod.href === "/secretaria"
              ? pathname === "/secretaria"
              : pathname === mod.href || pathname.startsWith(mod.href + "/");

          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                menuColapsado && "md:justify-center md:px-0",
                isModuleActive
                  ? "bg-iw-blue text-white shadow-md"
                  : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                <p className="leading-tight truncate">{mod.label}</p>
                {!isModuleActive && (
                  <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60 transition-colors">
                    {mod.description}
                  </p>
                )}
              </div>
              {isModuleActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
            </Link>
          );
        })}
        </>
        )}

        {!isAlunoOficial && !isProfessor && !isSecretario && !isAdminRestrito && (
        <>
        <p className={cn("text-iw-sky/40 text-xs font-semibold uppercase tracking-wider px-3 pb-2", menuColapsado && "md:hidden")}>
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
                  menuColapsado && "md:justify-center md:px-0",
                  isModuleActive
                    ? "bg-iw-blue text-white shadow-md"
                    : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#E88D0C]" />
                </div>
                <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
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
              {mod.subItems && !menuColapsado && (
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
            sempre visível pra staff no fim do menu, acima do rodapé.
            Fora do menu curado (28/09/2026) — bloqueado no middleware. */}
        {isStaff && !isAdminRestrito && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <Link
              href="/admin/loja"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                menuColapsado && "md:justify-center md:px-0",
                pathname === "/admin/loja" || pathname.startsWith("/admin/loja/")
                  ? "bg-iw-blue text-white shadow-md"
                  : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                <p className="leading-tight truncate">Admin Loja</p>
                <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">
                  Vendas, produtos, estoque e leads
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Configurações — movido em 13/09/2026 (decisão do Joaquim) pra
            logo abaixo de "Admin Loja", saindo da lista principal de
            Administração. Só reposicionamento, mesmo comportamento.
            Fora do menu curado (28/09/2026) — já tem o próprio item
            "Configurações" (Usuários e acessos) na lista curada acima. */}
        {isStaff && !isAdminRestrito && (
          <div className="pt-1">
            <Link
              href={CONFIGURACOES_MODULE.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                menuColapsado && "md:justify-center md:px-0",
                pathname === CONFIGURACOES_MODULE.href || pathname.startsWith(CONFIGURACOES_MODULE.href + "/")
                  ? "bg-iw-blue text-white shadow-md"
                  : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <Settings2 className="w-4 h-4 text-[#E88D0C]" />
              </div>
              <div className={cn("flex-1 min-w-0", menuColapsado && "md:hidden")}>
                <p className="leading-tight truncate">{CONFIGURACOES_MODULE.label}</p>
                <p className="text-xs truncate text-iw-sky/40 group-hover:text-iw-sky/60">
                  {CONFIGURACOES_MODULE.description}
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
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-iw-sky/70 hover:bg-white/8 hover:text-white transition-all duration-150 group",
              menuColapsado && "md:justify-center md:px-0"
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-[#E88D0C]" />
            </div>
            <span className={cn(menuColapsado && "md:hidden")}>Sair da conta</span>
          </button>
        </form>

        {/* Sair de todos os dispositivos */}
        <form action={signOutGlobalAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-iw-sky/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group",
              menuColapsado && "md:justify-center md:px-0"
            )}
          >
            <div className="w-6 h-6 rounded-md bg-black border border-[#E88D0C] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-[#E88D0C]" />
            </div>
            <span className={cn(menuColapsado && "md:hidden")}>Sair de todos os dispositivos</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
