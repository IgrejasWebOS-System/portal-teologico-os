import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, BookMarked, Award, ArrowRight, ClipboardList, UserPlus, Home } from "lucide-react";
import PublicFooter from "@/components/public/PublicFooter";
import Logo from "@/components/Logo";

// ============================================================
// /portal — Hub autenticado (área restrita)
// Antes vivia em "/". A raiz "/" agora é a home institucional
// pública do CETADP; este hub é o destino pós-login.
// ============================================================

const modules = [
  {
    href: "/escola",
    icon: GraduationCap,
    label: "Escola de Teologia",
    description:
      "Seminário, formação ministerial e disciplinas de teologia aplicada.",
    border: "border-iw-navy/30",
    iconBg: "bg-iw-navy/10",
    iconColor: "text-iw-navy",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
  {
    href: "/cursos",
    icon: BookOpen,
    label: "Cursos & Treinamentos",
    description:
      "Trilhas de aprendizado, capacitação ministerial e formação continuada.",
    border: "border-iw-gold/30",
    iconBg: "bg-iw-gold/10",
    iconColor: "text-iw-gold",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
  {
    href: "/ebd",
    icon: BookMarked,
    label: "EBD",
    description:
      "Escola Bíblica Dominical — lições semanais CPAD organizadas por trimestre e audiência.",
    border: "border-iw-success/30",
    iconBg: "bg-iw-success/10",
    iconColor: "text-iw-success",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
  {
    href: "/portal/nova-matricula",
    icon: UserPlus,
    label: "Nova Matrícula",
    description:
      "Matricule-se em um curso oficial do CETADP na hora — sem espera de aprovação.",
    border: "border-iw-gold/30",
    iconBg: "bg-iw-gold/10",
    iconColor: "text-iw-gold",
    badge: "Novo",
    badgeColor: "bg-iw-gold/10 text-iw-gold",
  },
  {
    href: "/portal/avaliacoes",
    icon: ClipboardList,
    label: "Simulados e Provas",
    description:
      "Simulado opcional (ilimitado) e prova final (única tentativa) de cada curso em andamento.",
    border: "border-iw-blue/30",
    iconBg: "bg-iw-blue/10",
    iconColor: "text-iw-blue",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
  {
    href: "/portal/certificados",
    icon: Award,
    label: "Meus Certificados",
    description:
      "Certificados emitidos pela secretaria ao concluir cursos, com número de validação pública.",
    border: "border-iw-gold/30",
    iconBg: "bg-iw-gold/10",
    iconColor: "text-iw-gold",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
];

export default async function PortalHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Busca o perfil do usuário para saudação
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, system_role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Usuário";

  return (
    <div className="min-h-screen bg-iw-bg">
      {/* Header */}
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" variant="dark" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none truncate">
                CETADP
              </p>
              <p className="text-iw-sky/60 text-xs truncate">Portal do Aluno</p>
            </div>
            <Link
              href="/"
              className="ml-2 inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy bg-iw-gold hover:opacity-90 rounded-lg px-3 py-1.5 transition-opacity shrink-0"
            >
              <Home className="w-3.5 h-3.5" />
              Site institucional
            </Link>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white text-sm font-medium">{displayName}</p>
            <p className="text-iw-sky/60 text-xs">{profile?.system_role ?? "—"}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-black text-iw-navy">
            Bem-vindo, {displayName.split(" ")[0]}.
          </h1>
          <p className="text-iw-muted">
            Selecione o módulo que deseja acessar.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group bg-iw-surface rounded-2xl border ${mod.border} shadow-sm hover:shadow-lg p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl ${mod.iconBg} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${mod.iconColor}`} />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mod.badgeColor}`}
                  >
                    {mod.badge}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-bold text-iw-navy leading-tight">
                    {mod.label}
                  </h2>
                  <p className="text-iw-muted text-sm mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-iw-blue text-sm font-semibold group-hover:gap-2.5 transition-all">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Decorative gold line */}
        <div className="mt-16 flex items-center gap-4">
          <div className="flex-1 h-px bg-iw-border" />
          <div className="w-2 h-2 rounded-full bg-iw-gold" />
          <div className="flex-1 h-px bg-iw-border" />
        </div>
      </main>

      <PublicFooter minimal />
    </div>
  );
}
