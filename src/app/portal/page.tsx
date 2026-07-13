import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Church, GraduationCap, BookOpen, BookMarked, ArrowRight } from "lucide-react";

// ============================================================
// /portal — Hub autenticado (área restrita)
// Antes vivia em "/". A raiz "/" agora é a home institucional
// pública do CETADP; este hub é o destino pós-login.
// ============================================================

const modules = [
  {
    href: "/dashboard",
    icon: Church,
    label: "Igreja",
    description:
      "Gestão completa de membros, igrejas, setores, ocorrências e finanças.",
    border: "border-iw-blue/30",
    iconBg: "bg-iw-blue/10",
    iconColor: "text-iw-blue",
    badge: "Ativo",
    badgeColor: "bg-iw-success/10 text-iw-success",
  },
  {
    href: "/escola",
    icon: GraduationCap,
    label: "Escola Teológica",
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
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-iw-blue/30 border border-iw-sky/30 flex items-center justify-center">
              <Church className="w-5 h-5 text-iw-sky" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">
                CETADP
              </p>
              <p className="text-iw-sky/60 text-xs">Portal do Aluno · IgrejasWebOS</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium">{displayName}</p>
            <p className="text-iw-sky/60 text-xs">{profile?.system_role ?? "—"}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-iw-navy">
            Bem-vindo, {displayName.split(" ")[0]}
          </h1>
          <p className="text-iw-muted mt-2">
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

        <p className="text-center text-iw-muted/60 text-xs mt-4">
          CETADP · Centro Educacional Teológico das Assembleias de Deus Piracicaba · 2026
        </p>
      </main>
    </div>
  );
}
